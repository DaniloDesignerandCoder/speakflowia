// SpeakFlow Mercado Pago authenticated webhook.\nimport { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

type MpNotification = {
  id?: string | number;
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function verifySignature(req: Request, dataId: string, secret: string) {
  const signature = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, value] = part.trim().split("=");
      return [key, value];
    }),
  );
  const ts = parts.ts;
  const received = parts.v1;
  if (!ts || !received || !requestId) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)));
  return safeEqual(expected, received.toLowerCase());
}

function mapStatus(status: string) {
  if (status === "authorized") return "active";
  if (status === "cancelled") return "canceled";
  if (status === "paused") return "past_due";
  return "pending";
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...jsonHeaders, Allow: "POST" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    const webhookSecret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
    if (!supabaseUrl || !serviceRoleKey || !accessToken || !webhookSecret) {
      throw new Error("Billing webhook is not configured.");
    }

    const url = new URL(req.url);
    const rawBody = await req.text();
    let notification: MpNotification;
    try {
      notification = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: jsonHeaders });
    }

    const dataId = String(url.searchParams.get("data.id") ?? notification.data?.id ?? "").trim();
    const eventId = String(notification.id ?? "").trim();
    const eventType = String(notification.type ?? "").trim();
    if (!dataId || !eventId) {
      return new Response(JSON.stringify({ error: "Invalid notification" }), { status: 400, headers: jsonHeaders });
    }

    if (!(await verifySignature(req, dataId, webhookSecret))) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: jsonHeaders });
    }

    if (eventType !== "subscription_preapproval") {
      return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200, headers: jsonHeaders });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: previousEvent, error: eventLookupError } = await admin
      .from("billing_events")
      .select("id, processing_status")
      .eq("provider", "mercado_pago")
      .eq("provider_event_id", eventId)
      .maybeSingle();
    if (eventLookupError) throw eventLookupError;
    if (previousEvent?.processing_status === "processed") {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200, headers: jsonHeaders });
    }

    const eventPayload = {
      provider: "mercado_pago",
      provider_event_id: eventId,
      event_type: eventType,
      provider_subscription_id: dataId,
      payload: notification,
      processing_status: "processing",
      processing_error: null,
      attempt_count: 1,
    };

    if (previousEvent) {
      const { error } = await admin.from("billing_events").update({
        ...eventPayload,
        attempt_count: 2,
      }).eq("id", previousEvent.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from("billing_events").insert(eventPayload);
      if (error) throw error;
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(dataId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mpResponse.ok) throw new Error(`Mercado Pago lookup failed: ${mpResponse.status}`);

    const subscription = await mpResponse.json();
    const externalReference = typeof subscription.external_reference === "string"
      ? subscription.external_reference
      : "";
    const match = /^speakflow:([0-9a-f-]{36})$/i.exec(externalReference);
    if (!match) throw new Error("Subscription external reference is invalid.");
    const userId = match[1];

    const status = mapStatus(String(subscription.status ?? ""));
    const start = subscription.auto_recurring?.start_date ?? null;
    const end = subscription.auto_recurring?.end_date ?? null;

    const { data: localSubscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .upsert({
        user_id: userId,
        provider: "mercado_pago",
        provider_subscription_id: dataId,
        plan: "pro",
        status,
        current_period_start: start,
        current_period_end: end,
        cancel_at_period_end: false,
      }, { onConflict: "provider,provider_subscription_id" })
      .select("id")
      .single();
    if (subscriptionError) throw subscriptionError;

    const entitlement = status === "active"
      ? {
          user_id: userId,
          plan: "pro",
          subscription_status: "active",
          current_period_end: end,
          source_subscription_id: localSubscription.id,
        }
      : {
          user_id: userId,
          plan: "free",
          subscription_status: status,
          current_period_end: end,
          source_subscription_id: localSubscription.id,
        };

    const { error: entitlementError } = await admin
      .from("entitlements")
      .upsert(entitlement, { onConflict: "user_id" });
    if (entitlementError) throw entitlementError;

    const { error: processedError } = await admin.from("billing_events").update({
      user_id: userId,
      processing_status: "processed",
      processed_at: new Date().toISOString(),
      processing_error: null,
    }).eq("provider", "mercado_pago").eq("provider_event_id", eventId);
    if (processedError) throw processedError;

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    console.error("SpeakFlow billing webhook error:", error instanceof Error ? error.message : "unknown");
    return new Response(JSON.stringify({ error: "Webhook processing failed." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});

// SpeakFlow Stripe authenticated webhook.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@18";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

type LocalStatus = "pending" | "active" | "past_due" | "canceled" | "expired";

function mapStripeStatus(status: Stripe.Subscription.Status): LocalStatus {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due") return "past_due";
  if (status === "canceled" || status === "unpaid") return "canceled";
  if (status === "incomplete_expired") return "expired";
  return "pending";
}

function unixToIso(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function getUserId(subscription: Stripe.Subscription) {
  const value = subscription.metadata?.speakflow_user_id ?? "";
  return /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...jsonHeaders, Allow: "POST" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const stripePriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !stripePriceId || !webhookSecret) {
    console.error("Stripe webhook is not configured.");
    return new Response(JSON.stringify({ error: "Webhook is not configured." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  if (!stripePriceId.startsWith("price_")) {
    console.error("Stripe Pro price ID is invalid.");
    return new Response(JSON.stringify({ error: "Webhook is not configured." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400, headers: jsonHeaders });
  }

  const rawBody = await req.text();
  const stripe = new Stripe(stripeSecretKey);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: jsonHeaders });
  }

  const supported = new Set([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ]);
  if (!supported.has(event.type)) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200, headers: jsonHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: previousEvent, error: eventLookupError } = await admin
      .from("billing_events")
      .select("id, processing_status, attempt_count")
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id)
      .maybeSingle();
    if (eventLookupError) throw eventLookupError;
    if (previousEvent?.processing_status === "processed") {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200, headers: jsonHeaders });
    }

    const subscription = event.data.object as Stripe.Subscription;
    const userId = getUserId(subscription);
    if (!userId) throw new Error("Stripe subscription is missing a valid SpeakFlow user ID.");

    const firstItem = subscription.items?.data?.[0];
    const subscriptionPriceId = typeof firstItem?.price?.id === "string" ? firstItem.price.id : "";
    if (subscription.items?.data?.length !== 1 || subscriptionPriceId !== stripePriceId) {
      throw new Error("Stripe subscription does not match the configured SpeakFlow Pro price.");
    }

    const status = mapStripeStatus(subscription.status);
    const periodStart = unixToIso(firstItem?.current_period_start);
    const periodEnd = unixToIso(firstItem?.current_period_end);
    const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);

    const eventPayload = {
      provider: "stripe",
      provider_event_id: event.id,
      event_type: event.type,
      provider_subscription_id: subscription.id,
      user_id: userId,
      payload: event,
      processing_status: "processing",
      processing_error: null,
      attempt_count: (previousEvent?.attempt_count ?? 0) + 1,
    };

    if (previousEvent) {
      const { error } = await admin.from("billing_events").update(eventPayload).eq("id", previousEvent.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from("billing_events").insert(eventPayload);
      if (error) throw error;
    }

    const { data: localSubscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .upsert({
        user_id: userId,
        provider: "stripe",
        provider_subscription_id: subscription.id,
        plan: "pro",
        status,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
      }, { onConflict: "provider,provider_subscription_id" })
      .select("id")
      .single();
    if (subscriptionError) throw subscriptionError;

    const hasProAccess = status === "active";
    const entitlement = {
      user_id: userId,
      plan: hasProAccess ? "pro" : "free",
      subscription_status: status,
      current_period_end: periodEnd,
      source_subscription_id: localSubscription.id,
    };

    const { error: entitlementError } = await admin
      .from("entitlements")
      .upsert(entitlement, { onConflict: "user_id" });
    if (entitlementError) throw entitlementError;

    const { error: processedError } = await admin.from("billing_events").update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
      processing_error: null,
    }).eq("provider", "stripe").eq("provider_event_id", event.id);
    if (processedError) throw processedError;

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    console.error("SpeakFlow Stripe webhook error:", error instanceof Error ? error.message : "unknown");

    await admin.from("billing_events").update({
      processing_status: "failed",
      processing_error: "Stripe webhook processing failed.",
    }).eq("provider", "stripe").eq("provider_event_id", event.id);

    return new Response(JSON.stringify({ error: "Webhook processing failed." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});

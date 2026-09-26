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
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

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

    if (hasProAccess && event.type === "customer.subscription.created") {
      const { data: claimedEmail, error: claimError } = await admin.rpc("claim_pro_welcome_email", {
        p_user_id: userId,
        p_provider_subscription_id: subscription.id,
      });
      if (claimError) {
        console.error("Could not claim Pro welcome email:", claimError.message);
      } else if (claimedEmail?.claimed) {
        try {
          if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured.");

          const { data: userResult, error: userError } = await admin.auth.admin.getUserById(userId);
          if (userError) throw userError;
          const recipient = userResult.user?.email;
          if (!recipient) throw new Error("SpeakFlow user has no email.");

          const appUrl = "https://speakflow.speakflowia.workers.dev";
          const logoUrl = appUrl + "/speakflow-logo.png";
          const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#070b14;font-family:Arial,Helvetica,sans-serif;color:#fff">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#070b14"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background:#0b1220;border:1px solid #182235;border-radius:20px">
<tr><td align="center" style="padding:42px 32px 20px"><img src="${logoUrl}" alt="SpeakFlow" width="170" style="display:block;width:170px;max-width:70%;height:auto;border:0"><div style="margin-top:10px;color:#fff;font-size:18px;font-weight:700">Speak<span style="color:#6f8cff">Flow</span></div></td></tr>
<tr><td align="center" style="padding:10px 36px 0"><div style="display:inline-block;padding:6px 10px;border:1px solid #263553;border-radius:999px;color:#8197ff;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">SPEAKFLOW PRO</div>
<h1 style="margin:22px 0 12px;font-size:28px;line-height:1.2;color:#fff">Seu SpeakFlow Pro está ativo.</h1>
<p style="margin:0 auto;max-width:430px;color:#9ca8bd;font-size:15px;line-height:1.7">Obrigado por escolher a SpeakFlow. Seu acesso Pro foi confirmado e seus recursos avançados já estão disponíveis.</p></td></tr>
<tr><td style="padding:24px 44px 0;color:#c3ccdc;font-size:14px;line-height:1.8">Coach de IA com limites ampliados · aprendizado adaptativo completo · MusicLab™ · laboratórios de vocabulário e pronúncia · acompanhamento avançado do seu progresso.</td></tr>
<tr><td align="center" style="padding:30px 36px 28px"><a href="${appUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:15px 28px;border-radius:11px">Acessar meu SpeakFlow Pro</a></td></tr>
<tr><td style="padding:0 36px"><div style="height:1px;background:#182235">&nbsp;</div></td></tr>
<tr><td align="center" style="padding:25px 36px 36px"><p style="margin:0;color:#7f8ba0;font-size:12px;line-height:1.6">SpeakFlow — o poder da IA guiando sua fluência em inglês.</p></td></tr>
</table></td></tr></table></body></html>`;

          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "SpeakFlow <onboarding@resend.dev>",
              to: [recipient],
              subject: "Seu SpeakFlow Pro está ativo 🚀",
              html,
            }),
          });
          if (!emailResponse.ok) throw new Error(`Resend rejected Pro welcome email: ${emailResponse.status}`);

          const { error: sentError } = await admin.rpc("complete_pro_welcome_email", {
            p_provider_subscription_id: subscription.id,
          });
          if (sentError) throw sentError;
        } catch (emailError) {
          console.error("SpeakFlow Pro welcome email failed:", emailError instanceof Error ? emailError.message : "unknown");
          await admin.rpc("release_pro_welcome_email", { p_provider_subscription_id: subscription.id });
        }
      }
    }

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

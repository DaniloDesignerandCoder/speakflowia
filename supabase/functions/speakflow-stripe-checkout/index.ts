// SpeakFlow Stripe subscription checkout entrypoint.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function formBody(values: Record<string, string>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) body.set(key, value);
  return body;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...jsonHeaders, Allow: "POST, OPTIONS" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!/^Bearer\s+\S+$/i.test(authHeader)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripePriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
    const backUrl = Deno.env.get("SPEAKFLOW_BILLING_BACK_URL");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey || !stripePriceId || !backUrl) {
      throw new Error("Stripe billing service is not configured.");
    }

    if (!stripeSecretKey.startsWith("sk_test_") && !stripeSecretKey.startsWith("sk_live_")) {
      throw new Error("Stripe secret key is invalid.");
    }
    if (!stripePriceId.startsWith("price_")) throw new Error("Stripe price ID is invalid.");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existing, error: existingError } = await admin
      .from("subscriptions")
      .select("id, provider_subscription_id, status")
      .eq("user_id", user.id)
      .eq("provider", "stripe")
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return new Response(JSON.stringify({ error: "Subscription already exists.", status: existing.status }), {
        status: 409,
        headers: jsonHeaders,
      });
    }

    let siteUrl: URL;
    try {
      siteUrl = new URL(backUrl);
    } catch {
      throw new Error("Billing return URL is invalid.");
    }
    if (siteUrl.protocol !== "https:" && siteUrl.hostname !== "localhost") {
      throw new Error("Billing return URL must use HTTPS.");
    }

    const successUrl = new URL(siteUrl.toString());
    successUrl.searchParams.set("billing", "success");
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

    const cancelUrl = new URL(siteUrl.toString());
    cancelUrl.searchParams.set("billing", "canceled");

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody({
        mode: "subscription",
        "line_items[0][price]": stripePriceId,
        "line_items[0][quantity]": "1",
        client_reference_id: user.id,
        customer_email: user.email,
        "metadata[speakflow_user_id]": user.id,
        "subscription_data[metadata][speakflow_user_id]": user.id,
        success_url: successUrl.toString(),
        cancel_url: cancelUrl.toString(),
        allow_promotion_codes: "false",
      }),
    });

    const stripeBody = await stripeResponse.json().catch(() => ({}));
    if (!stripeResponse.ok) {
      console.error("Stripe checkout error:", stripeResponse.status, stripeBody?.error?.type ?? "unknown");
      return new Response(JSON.stringify({ error: "Could not open subscription checkout." }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const checkoutUrl = typeof stripeBody.url === "string" ? stripeBody.url : "";
    const sessionId = typeof stripeBody.id === "string" ? stripeBody.id : "";
    if (!checkoutUrl.startsWith("https://checkout.stripe.com/") || !sessionId.startsWith("cs_")) {
      throw new Error("Stripe returned an invalid Checkout Session.");
    }

    return new Response(JSON.stringify({ checkoutUrl, status: "checkout" }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("SpeakFlow Stripe checkout error:", error instanceof Error ? error.message : "unknown");
    return new Response(JSON.stringify({ error: "Billing request failed." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});

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
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    const planId = Deno.env.get("MERCADO_PAGO_PREAPPROVAL_PLAN_ID");
    const backUrl = Deno.env.get("SPEAKFLOW_BILLING_BACK_URL");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !accessToken || !planId || !backUrl) {
      throw new Error("Billing service is not configured.");
    }

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
      .eq("provider", "mercado_pago")
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

    const externalReference = `speakflow:${user.id}`;
    const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        preapproval_plan_id: planId,
        reason: "SpeakFlow Pro",
        external_reference: externalReference,
        payer_email: user.email,
        back_url: backUrl,
        status: "pending",
      }),
    });

    const mpBody = await mpResponse.json().catch(() => ({}));
    if (!mpResponse.ok) {
      console.error("Mercado Pago subscription error:", mpResponse.status);
      return new Response(JSON.stringify({ error: "Could not create subscription." }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const providerSubscriptionId = typeof mpBody.id === "string" ? mpBody.id : null;
    const initPoint = typeof mpBody.init_point === "string" ? mpBody.init_point : null;
    const providerStatus = typeof mpBody.status === "string" ? mpBody.status : "pending";

    if (!providerSubscriptionId || !initPoint) {
      throw new Error("Mercado Pago returned an incomplete subscription.");
    }

    const status = providerStatus === "authorized" ? "active" : "pending";

    const { error: insertError } = await admin.from("subscriptions").insert({
      user_id: user.id,
      provider: "mercado_pago",
      provider_subscription_id: providerSubscriptionId,
      plan: "pro",
      status,
    });
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ checkoutUrl: initPoint, status }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("SpeakFlow billing subscribe error:", error instanceof Error ? error.message : "unknown");
    return new Response(JSON.stringify({ error: "Billing request failed." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});

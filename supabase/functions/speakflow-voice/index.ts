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

const MAX_BODY_BYTES = 4096;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...jsonHeaders, "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("application/json")) {
      return new Response(JSON.stringify({ error: "Content-Type must be application/json." }), {
        status: 415,
        headers: jsonHeaders,
      });
    }

    const declaredLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "Request body is too large." }), {
        status: 413,
        headers: jsonHeaders,
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!/^Bearer\s+\S+$/i.test(authHeader)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!supabaseUrl || !anonKey || !apiKey) throw new Error("Voice service is not configured.");

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const rawBody = await req.text();
    if (!rawBody || new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "Invalid request body." }), {
        status: rawBody ? 413 : 400,
        headers: jsonHeaders,
      });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "Invalid request body." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const payload = body as Record<string, unknown>;
    const allowedKeys = new Set(["text"]);
    if (Object.keys(payload).some((key) => !allowedKeys.has(key))) {
      return new Response(JSON.stringify({ error: "Unsupported request field." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!text || text.length > 500) {
      return new Response(JSON.stringify({ error: "Text must contain 1 to 500 characters." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const voiceId = Deno.env.get("ELEVENLABS_VOICE_ID");
    if (!voiceId) {
      console.error("SpeakFlow Voice ID is not configured.");
      return new Response(JSON.stringify({ error: "Voice service unavailable." }), {
        status: 503,
        headers: jsonHeaders,
      });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.48,
          similarity_boost: 0.72,
          style: 0.18,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      console.error("SpeakFlow Voice provider error:", response.status);
      return new Response(JSON.stringify({ error: "Neural voice unavailable." }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const audio = await response.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-SpeakFlow-Voice": "neural",
      },
    });
  } catch (error) {
    console.error("SpeakFlow Voice error:", error instanceof Error ? error.message : "unknown");
    return new Response(JSON.stringify({ error: "Voice generation failed." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});

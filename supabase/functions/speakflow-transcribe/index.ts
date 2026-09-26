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
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...jsonHeaders, Allow: "POST, OPTIONS" },
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
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !apiKey) throw new Error("Transcription service is not configured.");

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Content-Type must be multipart/form-data." }), {
        status: 415, headers: jsonHeaders,
      });
    }

    const declaredLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_AUDIO_BYTES + 64 * 1024) {
      return new Response(JSON.stringify({ error: "Audio is too large." }), { status: 413, headers: jsonHeaders });
    }

    const incoming = await req.formData();
    const audio = incoming.get("audio");
    if (!(audio instanceof File)) {
      return new Response(JSON.stringify({ error: "Audio file is required." }), { status: 400, headers: jsonHeaders });
    }
    if (audio.size < 128 || audio.size > MAX_AUDIO_BYTES) {
      return new Response(JSON.stringify({ error: "Invalid audio size." }), { status: 400, headers: jsonHeaders });
    }

    const normalizedType = audio.type.toLowerCase().split(";")[0];
    if (normalizedType && !ALLOWED_TYPES.has(normalizedType)) {
      return new Response(JSON.stringify({ error: "Unsupported audio format." }), { status: 415, headers: jsonHeaders });
    }

    const reservedSeconds = 8;
    const { data: usageRows, error: usageError } = await supabase.rpc("reserve_transcription_usage", {
      p_seconds: reservedSeconds,
    });
    const usage = Array.isArray(usageRows) ? usageRows[0] : usageRows;
    if (usageError) throw new Error("Unable to reserve transcription usage.");
    if (!usage?.allowed) {
      return new Response(JSON.stringify({
        error: "Monthly transcription limit reached.",
        code: "transcription_limit_reached",
        used: usage?.used ?? null,
        usage_limit: usage?.usage_limit ?? null,
        remaining: usage?.remaining ?? 0,
        plan: usage?.effective_plan ?? "free",
      }), { status: 429, headers: jsonHeaders });
    }

    const releaseReservedUsage = async () => {
      const admin = createClient(supabaseUrl, serviceRoleKey);
      const { error: releaseError } = await admin.rpc("release_transcription_usage", {
        p_seconds: reservedSeconds,
      });
      if (releaseError) console.error("SpeakFlow Transcribe usage release failed.");
    };

        const providerBody = new FormData();
    providerBody.append("file", audio, audio.name || "speech.webm");
    providerBody.append("model_id", "scribe_v2");
    providerBody.append("language_code", "eng");
    providerBody.append("diarize", "false");
    providerBody.append("tag_audio_events", "false");
    providerBody.append("no_verbatim", "false");
    // Preserve the SpeakFlow brand name during neural transcription.
    providerBody.append("keyterms", "SpeakFlow");

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: providerBody,
    });

    if (!response.ok) {
      await releaseReservedUsage();
      console.error("SpeakFlow Transcribe provider error:", response.status);
      return new Response(JSON.stringify({ error: "Transcription service unavailable." }), {
        status: 502, headers: jsonHeaders,
      });
    }

    const result = await response.json();
    const text = typeof result?.text === "string" ? result.text.trim() : "";
    if (!text) {
      await releaseReservedUsage();
      return new Response(JSON.stringify({ error: "No speech detected.", code: "no_speech" }), {
        status: 422, headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({
      text,
      language: typeof result?.language_code === "string" ? result.language_code : "en",
      language_probability: typeof result?.language_probability === "number" ? result.language_probability : null,
    }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    console.error("SpeakFlow Transcribe error:", error instanceof Error ? error.message : "unknown");
    return new Response(JSON.stringify({ error: "Transcription failed." }), { status: 500, headers: jsonHeaders });
  }
});

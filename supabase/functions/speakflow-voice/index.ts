import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!supabaseUrl || !anonKey || !apiKey) throw new Error("Voice service is not configured.");

    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text || text.length > 500) return new Response(JSON.stringify({ error: "Text must contain 1 to 500 characters." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const voiceId = Deno.env.get("ELEVENLABS_VOICE_ID");
    if (!voiceId) {
      console.error("SpeakFlow Voice ID is not configured.");
      return new Response(JSON.stringify({ error: "Voice service unavailable." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.48, similarity_boost: 0.72, style: 0.18, use_speaker_boost: true }
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("SpeakFlow Voice provider error:", response.status, detail.slice(0, 300));
      return new Response(JSON.stringify({ error: "Neural voice unavailable." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const audio = await response.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=3600", "X-SpeakFlow-Voice": "neural" },
    });
  } catch (error) {
    console.error("SpeakFlow Voice error:", error);
    return new Response(JSON.stringify({ error: "Voice generation failed." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

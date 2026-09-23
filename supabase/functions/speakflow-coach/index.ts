import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = {
  role: "coach" | "student";
  text: string;
};

type CoachResult = {
  reply: string;
  feedback: null | {
    original: string;
    corrected: string;
    tip: string;
    skill_category: string;
  };
};

type AdaptivePlanResult = {
  primary_goal: string;
  priority_skills: string;
  current_focus: string;
  next_milestone: string;
  coach_strategy: string;
  evidence_summary: string;
};

function parseAdaptivePlanResult(value: unknown): AdaptivePlanResult | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const keys = [
    "primary_goal",
    "priority_skills",
    "current_focus",
    "next_milestone",
    "coach_strategy",
    "evidence_summary",
  ] as const;

  const result: Record<string, string> = {};
  for (const key of keys) {
    if (typeof input[key] !== "string") return null;
    const text = input[key].trim();
    if (!text) return null;
    result[key] = text;
  }

  return result as AdaptivePlanResult;
}

function parseCoachResult(raw: string, userMessage: string): CoachResult | null {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    const reply = typeof parsed?.reply === "string" ? parsed.reply.trim() : "";

    if (!reply) return null;

    const feedback =
      parsed?.feedback &&
      typeof parsed.feedback.corrected === "string" &&
      typeof parsed.feedback.tip === "string"
        ? {
            original:
              typeof parsed.feedback.original === "string" &&
              parsed.feedback.original.trim()
                ? parsed.feedback.original.trim()
                : userMessage,
            corrected: parsed.feedback.corrected.trim(),
            tip: parsed.feedback.tip.trim(),
            skill_category: String(parsed.feedback.skill_category ?? "").trim(),
          }
        : null;

    return { reply, feedback };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const groqKey = Deno.env.get("GROQ_API_KEY");

    if (!geminiKey && !groqKey) {
      return new Response(
        JSON.stringify({ error: "No AI provider is configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: memoryRows, error: memoryError } = await supabase
      .from("learning_insights")
      .select("level, original_text, corrected_text, tip, skill_category, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);

    if (memoryError) {
      console.error("Could not load pedagogical memory:", memoryError);
    }

    const { data: learningPlan, error: learningPlanError } = await supabase
      .from("learning_plans")
      .select("primary_goal, priority_skills, current_focus, next_milestone, coach_strategy, evidence_summary, sessions_analyzed")
      .eq("user_id", user.id)
      .maybeSingle();

    if (learningPlanError) {
      console.error("Could not load adaptive learning context:", learningPlanError);
    }

    const pedagogicalMemory = (memoryRows ?? [])
      .map(
        (item: {
          level: string;
          original_text: string;
          corrected_text: string;
          tip: string;
          skill_category: string | null;
        }) =>
          `- [${item.level}] Skill: ${item.skill_category ?? "other"} | Student wrote: "${item.original_text}" | Recommended: "${item.corrected_text}" | Tip: "${item.tip}"`,
      )
      .join("\n");
      const skillCounts: Record<string, number> = {};

      for (const item of memoryRows ?? []) {
        const skill = item.skill_category?.trim();

          if (skill) {
              skillCounts[skill] = (skillCounts[skill] ?? 0) + 1;
                }
                }

                const recurringSkills = Object.entries(skillCounts)
                  .filter(([, count]) => count >= 2)
                    .sort((a, b) => b[1] - a[1])
                      .map(([skill, count]) => `${skill} (${count} recent occurrences)`)
                        .join(", ");

                        const learningPatterns = recurringSkills
                          ? `Recurring learning patterns: ${recurringSkills}.`
                            : "No recurring learning pattern has been identified yet.";

    const body = await req.json();
    const level = typeof body.level === "string" ? body.level : "intermediate";
    const mode =
      body.mode === "vocabulary"
          ? "vocabulary"
              : "conversation";
    const learningGoal =
      body.learningGoal === "vocabulary" || body.learningGoal === "pronunciation"
        ? body.learningGoal
        : "conversation";
    const correctionStyle =
      body.correctionStyle === "essential" || body.correctionStyle === "detailed"
        ? body.correctionStyle
        : "balanced";
    const conversationPace =
      body.conversationPace === "relaxed" || body.conversationPace === "challenging"
        ? body.conversationPace
        : "natural";
    const history: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const userMessage = typeof body.message === "string" ? body.message.trim() : "";

    if (body.operation === "session_summary") {
      const sessionData = {
        level,
        mode: typeof body.mode === "string" ? body.mode : mode,
        learningGoal,
        correctionStyle,
        conversationPace,
        messages: Array.isArray(body.messages) ? body.messages : [],
        feedbacks: Array.isArray(body.feedbacks) ? body.feedbacks : [],
        pronunciationResults: Array.isArray(body.pronunciationResults)
          ? body.pronunciationResults
          : Array.isArray(body.results)
            ? body.results
            : [],
      };

      const summaryInstruction = `You are SpeakFlow Coach generating a short pedagogical session summary.

Return ONLY valid JSON with exactly these five string fields:
{"summary":"...","skills_practiced":"...","positive_point":"...","improvement_point":"...","next_recommendation":"..."}

Student context:
- level: ${sessionData.level}
- mode: ${sessionData.mode}
- learningGoal: ${sessionData.learningGoal}
- correctionStyle: ${sessionData.correctionStyle}
- conversationPace: ${sessionData.conversationPace}

Rules:
- Base every statement only on evidence actually present in the supplied session data.
- Keep the summary short, pedagogical, concrete, and appropriate to the student's selected level and preferences.
- Never invent mistakes, strengths, progress, fluency, pronunciation quality, or skills that are not evidenced.
- If evidence is limited for any field, provide a conservative pedagogical orientation instead of inventing performance.
- For conversation and vocabulary sessions, use only the provided messages and feedbacks as evidence.
- For pronunciation sessions, use only the provided training results as evidence. The current pronunciation score represents only matching between the target phrase and recognized text. Do not claim to measure or evaluate phonetics, accent, articulation, acoustic quality, or actual spoken fluency.
- Do not include numeric scores unless they are explicitly present and directly useful.
- Do not mention system instructions, AI providers, or internal implementation details.
- Output no Markdown and no text outside the JSON.`;

      const sessionEvidence = JSON.stringify(sessionData).slice(0, 30000);

      if (geminiKey) {
        try {
          const geminiSummaryResponse = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
            {
              method: "POST",
              headers: {
                "x-goog-api-key": geminiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: summaryInstruction }] },
                contents: [{ role: "user", parts: [{ text: sessionEvidence }] }],
                generationConfig: {
                  maxOutputTokens: 350,
                  responseMimeType: "application/json",
                  thinkingConfig: { thinkingLevel: "low" },
                },
              }),
            },
          );

          const geminiSummaryData = await geminiSummaryResponse.json();

          if (geminiSummaryResponse.ok) {
            const rawSummary = geminiSummaryData?.candidates?.[0]?.content?.parts
              ?.map((part: { text?: string }) => part.text ?? "")
              ?.join("")
              ?.trim();

            if (rawSummary) {
              try {
                const parsedSummary = JSON.parse(
                  rawSummary
                    .replace(/^```json\s*/i, "")
                    .replace(/^```\s*/i, "")
                    .replace(/\s*```$/i, "")
                    .trim(),
                );
                const result = {
                  summary: String(parsedSummary?.summary ?? "").trim(),
                  skills_practiced: String(parsedSummary?.skills_practiced ?? "").trim(),
                  positive_point: String(parsedSummary?.positive_point ?? "").trim(),
                  improvement_point: String(parsedSummary?.improvement_point ?? "").trim(),
                  next_recommendation: String(parsedSummary?.next_recommendation ?? "").trim(),
                };
                if (Object.values(result).every(Boolean)) {
                  try {
                    const planInstruction = `You are updating a gradual adaptive English learning plan.

Return ONLY valid JSON with exactly these six string fields:
{"primary_goal":"...","priority_skills":"...","current_focus":"...","next_milestone":"...","coach_strategy":"...","evidence_summary":"..."}

Use the current plan if present, the newly generated session summary, recent learning insights, learningGoal, level, session mode, correctionStyle, and conversationPace.

Rules:
- Do not turn one isolated error into a permanent weakness.
- Give greater weight to recurring patterns and recent evidence.
- Preserve strengths and positive progress, not only difficulties.
- Evolve the plan gradually.
- An isolated observation may create a temporary focus but must not dominate priority_skills without supporting evidence.
- next_milestone must be concrete, realistic, and achievable for the selected level.
- coach_strategy must describe how the coach should teach, never label the student.
- evidence_summary must summarize pedagogical evidence only, without hidden reasoning, chain-of-thought, IDs, database details, or technical implementation.
- Do not infer intelligence, ability, personality, or other personal traits.
- The selected level remains the difficulty ceiling.
- Keep every field concise and practical. Prefer one short sentence or compact phrase per field; this is operational teaching memory, not a long report.`;

                    const planEvidence = JSON.stringify({
                      current_plan: learningPlan ?? null,
                      session_summary: result,
                      recent_learning_insights: memoryRows ?? [],
                      learningGoal,
                      level,
                      mode: sessionData.mode,
                      correctionStyle,
                      conversationPace,
                    }).slice(0, 30000);

                    let nextPlan: any = null;

                    if (geminiKey) {
                      try {
                        const planResponse = await fetch(
                          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
                          {
                            method: "POST",
                            headers: {
                              "x-goog-api-key": geminiKey,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              system_instruction: { parts: [{ text: planInstruction }] },
                              contents: [{ role: "user", parts: [{ text: planEvidence }] }],
                              generationConfig: {
                                maxOutputTokens: 650,
                                responseMimeType: "application/json",
                                responseSchema: {
                                  type: "OBJECT",
                                  properties: {
                                    primary_goal: { type: "STRING" },
                                    priority_skills: { type: "STRING" },
                                    current_focus: { type: "STRING" },
                                    next_milestone: { type: "STRING" },
                                    coach_strategy: { type: "STRING" },
                                    evidence_summary: { type: "STRING" },
                                  },
                                  required: [
                                    "primary_goal",
                                    "priority_skills",
                                    "current_focus",
                                    "next_milestone",
                                    "coach_strategy",
                                    "evidence_summary",
                                  ],
                                },
                                thinkingConfig: { thinkingLevel: "low" },
                              },
                            }),
                          },
                        );

                        let planData: any = null;
                        try {
                          planData = await planResponse.json();
                        } catch {
                          console.error("Adaptive plan Gemini generation failed: non-JSON API response.");
                        }

                        if (!planResponse.ok) {
                          console.error("Adaptive plan Gemini generation failed:", {
                            status: planResponse.status,
                            finishReason: planData?.candidates?.[0]?.finishReason ?? null,
                          });
                        } else {
                          const finishReason = planData?.candidates?.[0]?.finishReason ?? null;
                          const rawPlan = planData?.candidates?.[0]?.content?.parts
                            ?.map((part: { text?: string }) => part.text ?? "")
                            ?.join("")
                            ?.trim();

                          if (finishReason === "MAX_TOKENS") {
                            console.error("Adaptive plan Gemini response truncated.");
                          } else if (!rawPlan) {
                            console.error("Adaptive plan Gemini generation failed: empty structured response.");
                          } else {
                            try {
                              const parsedPlan = JSON.parse(rawPlan);
                              const validatedPlan = parseAdaptivePlanResult(parsedPlan);
                              if (validatedPlan) {
                                nextPlan = validatedPlan;
                                console.error("Adaptive plan route used: Gemini.");
                              } else {
                                console.error("Adaptive plan Gemini parse/validation failed.");
                              }
                            } catch {
                              console.error("Adaptive plan Gemini parse/validation failed.");
                            }
                          }
                        }
                      } catch (error) {
                        console.error("Adaptive plan Gemini generation failed:", {
                          message: error instanceof Error ? error.message : String(error),
                        });
                      }
                    }

                    if (!nextPlan && groqKey) {
                      console.error("Adaptive plan fallback to Groq.");
                      try {
                        const planResponse = await fetch(
                          "https://api.groq.com/openai/v1/chat/completions",
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${groqKey}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              model: "openai/gpt-oss-20b",
                              messages: [
                                { role: "system", content: planInstruction },
                                { role: "user", content: planEvidence },
                              ],
                              max_tokens: 650,
                              temperature: 0.2,
                            }),
                          },
                        );

                        let planData: any = null;
                        try {
                          planData = await planResponse.json();
                        } catch {
                          console.error("Adaptive plan Groq generation failed: non-JSON API response.");
                        }

                        if (!planResponse.ok) {
                          console.error("Adaptive plan Groq generation failed:", {
                            status: planResponse.status,
                            code: planData?.error?.code ?? null,
                          });
                        } else {
                          const rawPlan = planData?.choices?.[0]?.message?.content?.trim();
                          if (!rawPlan) {
                            console.error("Adaptive plan Groq parse/validation failed.");
                          } else {
                            try {
                              const parsedPlan = JSON.parse(rawPlan);
                              const validatedPlan = parseAdaptivePlanResult(parsedPlan);
                              if (validatedPlan) {
                                nextPlan = validatedPlan;
                                console.error("Adaptive plan route used: Groq.");
                              } else {
                                console.error("Adaptive plan Groq parse/validation failed.");
                              }
                            } catch {
                              console.error("Adaptive plan Groq parse/validation failed.");
                            }
                          }
                        }
                      } catch (error) {
                        console.error("Adaptive plan Groq generation failed:", {
                          message: error instanceof Error ? error.message : String(error),
                        });
                      }
                    }

                    if (!nextPlan && learningPlan) {
                      const currentPlan = parseAdaptivePlanResult({
                        primary_goal: learningPlan.primary_goal,
                        priority_skills: learningPlan.priority_skills,
                        current_focus: learningPlan.current_focus,
                        next_milestone: learningPlan.next_milestone,
                        coach_strategy: learningPlan.coach_strategy,
                        evidence_summary: learningPlan.evidence_summary,
                      });

                      if (currentPlan) {
                        const evidenceParts = [
                          result.summary,
                          result.skills_practiced,
                          result.positive_point,
                          result.improvement_point,
                          result.next_recommendation,
                        ]
                          .filter((value) => typeof value === "string" && value.trim())
                          .map((value) => value.trim());

                        nextPlan = {
                          ...currentPlan,
                          evidence_summary: evidenceParts.length
                            ? `${currentPlan.evidence_summary} | Latest session evidence: ${evidenceParts.join(" | ")}`
                            : currentPlan.evidence_summary,
                        };

                        console.error("Adaptive plan route used: local deterministic fallback.");
                      }
                    }

                    if (nextPlan) {
                      const planRow = {
                        user_id: user.id,
                        primary_goal: String(nextPlan?.primary_goal ?? learningPlan?.primary_goal ?? learningGoal).trim(),
                        priority_skills: String(nextPlan?.priority_skills ?? learningPlan?.priority_skills ?? "").trim(),
                        current_focus: String(nextPlan?.current_focus ?? learningPlan?.current_focus ?? "").trim(),
                        next_milestone: String(nextPlan?.next_milestone ?? learningPlan?.next_milestone ?? "").trim(),
                        coach_strategy: String(nextPlan?.coach_strategy ?? learningPlan?.coach_strategy ?? "").trim(),
                        evidence_summary: String(nextPlan?.evidence_summary ?? "").trim(),
                        sessions_analyzed: (typeof learningPlan?.sessions_analyzed === "number" ? learningPlan.sessions_analyzed : 0) + 1,
                        updated_at: new Date().toISOString(),
                      };

                      const { error: planUpsertError } = await supabase
                        .from("learning_plans")
                        .upsert(planRow, { onConflict: "user_id" });

                      if (planUpsertError) {
                        console.error("Adaptive plan upsert failed:", {
                          code: planUpsertError.code ?? null,
                          message: planUpsertError.message ?? "unknown",
                        });
                      }
                    }
                  } catch (error) {
                    console.error("Adaptive learning context update failed:", error);
                  }

                  return new Response(JSON.stringify(result), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                  });
                }
              } catch {
                // Try Groq fallback below.
              }
            }
          }

          console.error("Gemini session summary failed or returned invalid structured output:", geminiSummaryData);
        } catch (error) {
          console.error("Gemini session summary request failed; trying Groq fallback:", error);
        }
      }

      if (groqKey) {
        const groqSummaryResponse = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-oss-20b",
              messages: [
                { role: "system", content: summaryInstruction },
                { role: "user", content: sessionEvidence },
              ],
              max_tokens: 650,
              temperature: 0.2,
            }),
          },
        );

        const groqSummaryData = await groqSummaryResponse.json();

        if (groqSummaryResponse.ok) {
          const rawSummary = groqSummaryData?.choices?.[0]?.message?.content?.trim();
          if (rawSummary) {
            try {
              const parsedSummary = JSON.parse(rawSummary);
              const result = {
                summary: String(parsedSummary?.summary ?? "").trim(),
                skills_practiced: String(parsedSummary?.skills_practiced ?? "").trim(),
                positive_point: String(parsedSummary?.positive_point ?? "").trim(),
                improvement_point: String(parsedSummary?.improvement_point ?? "").trim(),
                next_recommendation: String(parsedSummary?.next_recommendation ?? "").trim(),
              };
              if (Object.values(result).every(Boolean)) {
                  try {
                    const planInstruction = `You are updating a gradual adaptive English learning plan.

Return ONLY valid JSON with exactly these six string fields:
{"primary_goal":"...","priority_skills":"...","current_focus":"...","next_milestone":"...","coach_strategy":"...","evidence_summary":"..."}

Use the current plan if present, the newly generated session summary, recent learning insights, learningGoal, level, session mode, correctionStyle, and conversationPace.

Rules:
- Do not turn one isolated error into a permanent weakness.
- Give greater weight to recurring patterns and recent evidence.
- Preserve strengths and positive progress, not only difficulties.
- Evolve the plan gradually.
- An isolated observation may create a temporary focus but must not dominate priority_skills without supporting evidence.
- next_milestone must be concrete, realistic, and achievable for the selected level.
- coach_strategy must describe how the coach should teach, never label the student.
- evidence_summary must summarize pedagogical evidence only, without hidden reasoning, chain-of-thought, IDs, database details, or technical implementation.
- Do not infer intelligence, ability, personality, or other personal traits.
- The selected level remains the difficulty ceiling.
- Keep every field concise and practical. Prefer one short sentence or compact phrase per field; this is operational teaching memory, not a long report.`;

                    const planEvidence = JSON.stringify({
                      current_plan: learningPlan ?? null,
                      session_summary: result,
                      recent_learning_insights: memoryRows ?? [],
                      learningGoal,
                      level,
                      mode: sessionData.mode,
                      correctionStyle,
                      conversationPace,
                    }).slice(0, 30000);

                    let nextPlan: any = null;

                    if (geminiKey) {
                      try {
                        const planResponse = await fetch(
                          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
                          {
                            method: "POST",
                            headers: {
                              "x-goog-api-key": geminiKey,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              system_instruction: { parts: [{ text: planInstruction }] },
                              contents: [{ role: "user", parts: [{ text: planEvidence }] }],
                              generationConfig: {
                                maxOutputTokens: 650,
                                responseMimeType: "application/json",
                                responseSchema: {
                                  type: "OBJECT",
                                  properties: {
                                    primary_goal: { type: "STRING" },
                                    priority_skills: { type: "STRING" },
                                    current_focus: { type: "STRING" },
                                    next_milestone: { type: "STRING" },
                                    coach_strategy: { type: "STRING" },
                                    evidence_summary: { type: "STRING" },
                                  },
                                  required: [
                                    "primary_goal",
                                    "priority_skills",
                                    "current_focus",
                                    "next_milestone",
                                    "coach_strategy",
                                    "evidence_summary",
                                  ],
                                },
                                thinkingConfig: { thinkingLevel: "low" },
                              },
                            }),
                          },
                        );

                        let planData: any = null;
                        try {
                          planData = await planResponse.json();
                        } catch {
                          console.error("Adaptive plan Gemini generation failed: non-JSON API response.");
                        }

                        if (!planResponse.ok) {
                          console.error("Adaptive plan Gemini generation failed:", {
                            status: planResponse.status,
                            finishReason: planData?.candidates?.[0]?.finishReason ?? null,
                          });
                        } else {
                          const finishReason = planData?.candidates?.[0]?.finishReason ?? null;
                          const rawPlan = planData?.candidates?.[0]?.content?.parts
                            ?.map((part: { text?: string }) => part.text ?? "")
                            ?.join("")
                            ?.trim();

                          if (finishReason === "MAX_TOKENS") {
                            console.error("Adaptive plan Gemini response truncated.");
                          } else if (!rawPlan) {
                            console.error("Adaptive plan Gemini generation failed: empty structured response.");
                          } else {
                            try {
                              const parsedPlan = JSON.parse(rawPlan);
                              const validatedPlan = parseAdaptivePlanResult(parsedPlan);
                              if (validatedPlan) {
                                nextPlan = validatedPlan;
                                console.error("Adaptive plan route used: Gemini.");
                              } else {
                                console.error("Adaptive plan Gemini parse/validation failed.");
                              }
                            } catch {
                              console.error("Adaptive plan Gemini parse/validation failed.");
                            }
                          }
                        }
                      } catch (error) {
                        console.error("Adaptive plan Gemini generation failed:", {
                          message: error instanceof Error ? error.message : String(error),
                        });
                      }
                    }

                    if (!nextPlan && groqKey) {
                      console.error("Adaptive plan fallback to Groq.");
                      try {
                        const planResponse = await fetch(
                          "https://api.groq.com/openai/v1/chat/completions",
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${groqKey}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              model: "openai/gpt-oss-20b",
                              messages: [
                                { role: "system", content: planInstruction },
                                { role: "user", content: planEvidence },
                              ],
                              max_tokens: 650,
                              temperature: 0.2,
                            }),
                          },
                        );

                        let planData: any = null;
                        try {
                          planData = await planResponse.json();
                        } catch {
                          console.error("Adaptive plan Groq generation failed: non-JSON API response.");
                        }

                        if (!planResponse.ok) {
                          console.error("Adaptive plan Groq generation failed:", {
                            status: planResponse.status,
                            code: planData?.error?.code ?? null,
                          });
                        } else {
                          const rawPlan = planData?.choices?.[0]?.message?.content?.trim();
                          if (!rawPlan) {
                            console.error("Adaptive plan Groq parse/validation failed.");
                          } else {
                            try {
                              const parsedPlan = JSON.parse(rawPlan);
                              const validatedPlan = parseAdaptivePlanResult(parsedPlan);
                              if (validatedPlan) {
                                nextPlan = validatedPlan;
                                console.error("Adaptive plan route used: Groq.");
                              } else {
                                console.error("Adaptive plan Groq parse/validation failed.");
                              }
                            } catch {
                              console.error("Adaptive plan Groq parse/validation failed.");
                            }
                          }
                        }
                      } catch (error) {
                        console.error("Adaptive plan Groq generation failed:", {
                          message: error instanceof Error ? error.message : String(error),
                        });
                      }
                    }

                    if (!nextPlan && learningPlan) {
                      const currentPlan = parseAdaptivePlanResult({
                        primary_goal: learningPlan.primary_goal,
                        priority_skills: learningPlan.priority_skills,
                        current_focus: learningPlan.current_focus,
                        next_milestone: learningPlan.next_milestone,
                        coach_strategy: learningPlan.coach_strategy,
                        evidence_summary: learningPlan.evidence_summary,
                      });

                      if (currentPlan) {
                        const evidenceParts = [
                          result.summary,
                          result.skills_practiced,
                          result.positive_point,
                          result.improvement_point,
                          result.next_recommendation,
                        ]
                          .filter((value) => typeof value === "string" && value.trim())
                          .map((value) => value.trim());

                        nextPlan = {
                          ...currentPlan,
                          evidence_summary: evidenceParts.length
                            ? `${currentPlan.evidence_summary} | Latest session evidence: ${evidenceParts.join(" | ")}`
                            : currentPlan.evidence_summary,
                        };

                        console.error("Adaptive plan route used: local deterministic fallback.");
                      }
                    }

                    if (nextPlan) {
                      const planRow = {
                        user_id: user.id,
                        primary_goal: String(nextPlan?.primary_goal ?? learningPlan?.primary_goal ?? learningGoal).trim(),
                        priority_skills: String(nextPlan?.priority_skills ?? learningPlan?.priority_skills ?? "").trim(),
                        current_focus: String(nextPlan?.current_focus ?? learningPlan?.current_focus ?? "").trim(),
                        next_milestone: String(nextPlan?.next_milestone ?? learningPlan?.next_milestone ?? "").trim(),
                        coach_strategy: String(nextPlan?.coach_strategy ?? learningPlan?.coach_strategy ?? "").trim(),
                        evidence_summary: String(nextPlan?.evidence_summary ?? "").trim(),
                        sessions_analyzed: (typeof learningPlan?.sessions_analyzed === "number" ? learningPlan.sessions_analyzed : 0) + 1,
                        updated_at: new Date().toISOString(),
                      };

                      const { error: planUpsertError } = await supabase
                        .from("learning_plans")
                        .upsert(planRow, { onConflict: "user_id" });

                      if (planUpsertError) {
                        console.error("Adaptive plan upsert failed:", {
                          code: planUpsertError.code ?? null,
                          message: planUpsertError.message ?? "unknown",
                        });
                      }
                    }
                  } catch (error) {
                    console.error("Adaptive learning context update failed:", error);
                  }

                return new Response(JSON.stringify(result), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }
            } catch {
              // Return the existing provider failure response below.
            }
          }
        }

        console.error("Groq session summary error:", groqSummaryData);
      }

      console.error("Session summary route used: local deterministic fallback.");

      const messageCount = Array.isArray(sessionData.messages) ? sessionData.messages.length : 0;
      const feedbackCount = Array.isArray(sessionData.feedbacks) ? sessionData.feedbacks.length : 0;
      const pronunciationCount = Array.isArray(sessionData.pronunciationResults)
        ? sessionData.pronunciationResults.length
        : 0;
      const modeLabel =
        sessionData.mode === "pronunciation"
          ? "pronunciation"
          : sessionData.mode === "vocabulary"
            ? "vocabulary"
            : "conversation";
      const evidenceCount = modeLabel === "pronunciation" ? pronunciationCount : messageCount;

      const result = {
        summary: `Completed a ${modeLabel} practice session with ${evidenceCount} recorded practice item${evidenceCount === 1 ? "" : "s"}.`,
        skills_practiced:
          modeLabel === "pronunciation"
            ? "Pronunciation practice with recorded target and recognized-text attempts."
            : modeLabel === "vocabulary"
              ? "Vocabulary practice through the recorded session exchanges."
              : "Conversation practice through the recorded session exchanges.",
        positive_point: "The session was completed and recorded in the learning history.",
        improvement_point:
          feedbackCount > 0
            ? `Continue working with the ${feedbackCount} correction${feedbackCount === 1 ? "" : "s"} recorded during this session.`
            : "Continue practicing so future sessions can provide more specific evidence.",
        next_recommendation:
          modeLabel === "pronunciation"
            ? "Continue with another pronunciation practice when ready."
            : modeLabel === "vocabulary"
              ? "Continue with another vocabulary practice when ready."
              : "Continue with another conversation practice when ready.",
      };

      if (learningPlan) {
        const currentPlan = parseAdaptivePlanResult({
          primary_goal: learningPlan.primary_goal,
          priority_skills: learningPlan.priority_skills,
          current_focus: learningPlan.current_focus,
          next_milestone: learningPlan.next_milestone,
          coach_strategy: learningPlan.coach_strategy,
          evidence_summary: learningPlan.evidence_summary,
        });

        if (currentPlan) {
          const directEvidence = `Latest completed session: mode=${modeLabel}; recorded_items=${evidenceCount}; recorded_feedbacks=${feedbackCount}.`;
          const planRow = {
            user_id: user.id,
            ...currentPlan,
            evidence_summary: `${currentPlan.evidence_summary} | ${directEvidence}`,
            sessions_analyzed:
              (typeof learningPlan.sessions_analyzed === "number" ? learningPlan.sessions_analyzed : 0) + 1,
            updated_at: new Date().toISOString(),
          };

          const { error: planUpsertError } = await supabase
            .from("learning_plans")
            .upsert(planRow, { onConflict: "user_id" });

          if (planUpsertError) {
            console.error("Adaptive plan upsert failed after local session summary fallback:", {
              code: planUpsertError.code ?? null,
              message: planUpsertError.message ?? "unknown",
            });
          } else {
            console.error("Adaptive plan route used: local deterministic fallback after local session summary.");
          }
        }
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "A message is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: lastSessionSummary, error: lastSessionSummaryError } = await supabase
      .from("learning_sessions")
      .select("summary, skills_practiced, positive_point, improvement_point, next_recommendation, mode, created_at")
      .eq("user_id", user.id)
      .or("summary.not.is.null,skills_practiced.not.is.null,positive_point.not.is.null,improvement_point.not.is.null,next_recommendation.not.is.null")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastSessionSummaryError) {
      console.error("Could not load latest session summary:", lastSessionSummaryError);
    }

    const adaptivePlanMemory = learningPlan
      ? `Adaptive pedagogical guidance for natural use:
- Primary goal: ${learningPlan.primary_goal ?? ""}
- Priority skills: ${learningPlan.priority_skills ?? ""}
- Current focus: ${learningPlan.current_focus ?? ""}
- Next milestone: ${learningPlan.next_milestone ?? ""}
- Teaching strategy: ${learningPlan.coach_strategy ?? ""}
- Evidence summary: ${learningPlan.evidence_summary ?? ""}
- Sessions contributing to this guidance: ${learningPlan.sessions_analyzed ?? 0}
Use rules:
- This guidance complements but never replaces level, current mode, preferences, current message, learning insights, or recent session memory.
- Adapt naturally and never mention internal fields, databases, stored plans, or technical implementation.
- Treat this guidance as evolving and provisional, not as permanent facts about the student.
- Give more weight to the student's current message, current-session evidence, recent evidence, and recurring patterns when they conflict with older guidance.`
      : "";

    const recentSessionMemory = lastSessionSummary
      ? `Most recent session summary memory (use only when relevant and treat as recent, non-permanent guidance):
- Session mode: ${lastSessionSummary.mode ?? "unknown"}
- Summary: ${lastSessionSummary.summary ?? ""}
- Skills practiced: ${lastSessionSummary.skills_practiced ?? ""}
- Positive point: ${lastSessionSummary.positive_point ?? ""}
- Improvement point: ${lastSessionSummary.improvement_point ?? ""}
- Next recommendation: ${lastSessionSummary.next_recommendation ?? ""}
Pedagogical use rules:
- Use mainly the improvement point and next recommendation as subtle guidance for the current session.
- This memory complements but never replaces the current mode, level, preferences, current message, or current conversation context.
- Do not repeatedly tell the student that a previous session is being used.
- Do not force an old topic or recommendation when it is not relevant to the current context.
- Treat previous recommendations as recent guidance, not as permanent facts about the student.
- Prefer the student's current message and present-session evidence whenever they conflict with this memory.
- Do not expose database fields, IDs, timestamps, or internal implementation details to the student.`
      : "";

    const systemInstruction = `You are SpeakFlow Coach, an English-learning conversation coach.
The student's CEFR-style app level is: ${level}.

          The current training mode is: ${mode}.

          Training mode behavior:
          - conversation: Prioritize natural, realistic English conversation. Keep the dialogue flowing, respond naturally to what the student says, and use corrections only when they provide meaningful learning value.
          - vocabulary: Prioritize active vocabulary growth through natural conversation. In every conversational reply, introduce at least one useful word, expression, collocation, phrasal verb, or natural synonym that fits the current topic and the student's level. Briefly make its meaning clear through context, then continue the conversation naturally with a question or prompt that encourages the student to use the new vocabulary. Avoid long explanations, vocabulary lists, or classroom-style lectures. Prefer practical everyday English that the student can immediately reuse. Do not introduce too many new terms at once; usually one or two is enough.
          Training mode instructions have priority over the general teaching rules below whenever they conflict. In vocabulary mode, every assistant conversational reply must actively teach at least one new vocabulary item appropriate to the student's level before continuing the conversation.

The student's persistent learning goal is: ${learningGoal}.
Learning goal behavior:
- conversation: Prioritize confidence, natural turn-taking, practical everyday speaking, and keeping the interaction moving.
- vocabulary: Prioritize useful vocabulary growth across the conversation, reinforcing practical words, expressions, collocations, phrasal verbs, and natural synonyms appropriate to the student's level.
- pronunciation: Treat pronunciation as a pedagogical goal only through text-based support. You may suggest clearer wording, stress-friendly phrasing, syllable awareness, or simple pronunciation guidance in text, but never claim to have heard, measured, scored, or evaluated the student's actual pronunciation, accent, spoken fluency, or audio quality.
The learning goal is a persistent pedagogical priority and must not replace the current session mode. Apply both together, with the session mode governing the immediate activity and the learning goal influencing emphasis.

The student's correction style is: ${correctionStyle}.
Correction style behavior:
- essential: Correct only important errors that affect meaning, core grammar, or highly useful naturalness. Keep feedback very short and avoid over-correcting.
- balanced: Provide useful corrections with a moderate, concise explanation. Maintain a practical balance between conversation flow and teaching value.
- detailed: When a correction is warranted, provide deeper pedagogical feedback and a clearer explanation of the issue, while still keeping the conversation natural and avoiding unnecessarily long replies.
Correction style changes feedback depth, but never overrides the selected level or the rule to choose only the single most useful correction.

The student's conversation pace is: ${conversationPace}.
Conversation pace behavior:
- relaxed: Use more direct sentences, give the student more space to respond, and ask only one question at a time.
- natural: Maintain a fluid, everyday conversational rhythm with natural sentence variety and a concise follow-up question.
- challenging: Moderately increase lexical variety, question complexity, and prompts that encourage elaboration, while staying appropriate to the selected level.
The selected level remains the primary difficulty ceiling. No learning goal, correction style, or conversation pace preference may push vocabulary, grammar, question difficulty, or feedback beyond what is appropriate for the student's level.

Your priority is to create a natural English conversation while teaching through brief, useful feedback.
Adapt vocabulary, sentence length, grammar complexity, question difficulty, and feedback depth to the selected level.
Keep the conversational reply mainly in English, concise, warm, age-appropriate, and natural.
Use the following pedagogical memory from this student to personalize your teaching. Pay special attention to recurring skill categories and past mistakes, but do not repeat corrections unnecessarily:
${pedagogicalMemory}
${learningPatterns}
${recentSessionMemory}
${adaptivePlanMemory}
Use these level-specific teaching rules:
- beginner: Use very common vocabulary, short sentences, and one simple question at a time. Feedback tips must be extremely simple and concrete, usually one short sentence. Focus on essential meaning and high-value basic grammar; do not over-correct.
- elementary: Use common everyday vocabulary and short-to-medium sentences. Feedback tips should explain the correction in plain language with minimal grammar terminology.
- intermediate: Use natural everyday English with moderate sentence variety. Feedback tips may briefly name a useful grammar rule or word-choice pattern and explain why it applies.
- upper_intermediate: Use more varied, natural English and increasingly authentic phrasing. Feedback should prioritize precision, collocations, sentence structure, and natural usage while remaining concise.
- advanced: Converse naturally with sophisticated but appropriate vocabulary. Do not correct merely because an alternative style exists. Feedback should focus on genuine errors or meaningful improvements in precision, idiomaticity, register, or naturalness.

The correction threshold must rise with the student's level: beginners should receive only high-value corrections that help communication and core grammar, while advanced students may receive subtle but meaningful corrections when they improve precision or naturalness.

Evaluate only the student's latest message for one important grammar, word-choice, or sentence-structure issue.
If the message is clear and natural enough for the student's level, do not invent a correction.
If there is an important issue, choose only the single most useful correction.
Treat speech-recognition transcripts as text. Never claim to have heard, measured, scored, or evaluated pronunciation, accent, spoken fluency, or audio quality.
Do not assign numeric scores.

Return ONLY valid JSON. Do not use Markdown, code fences, asterisks, headings, or text outside the JSON.

When no correction is needed, use exactly this shape:
{"reply":"Natural conversational response ending with one relevant question.","feedback":null}

When one important correction is useful, use exactly this shape:
{"reply":"Natural conversational response ending with one relevant question.","feedback":{"original":"The student's exact relevant wording.","corrected":"A concise corrected or more natural version.","tip":"One short, simple explanation appropriate to the student's level.","skill_category":"past_tense"}}

For skill_category, choose exactly one of: grammar, vocabulary, sentence_structure, conversation. Classify past_tense, present_tense, future_tense, articles, prepositions, subject_verb_agreement, pronouns, plurals, verb_form, and question_form as grammar. Classify word_choice as vocabulary. Never return generic labels such as insight, other, general, or feedback. Return only one of the four allowed skill_category values exactly as written.\n\nThe reply field must continue the conversation and must NOT repeat the correction or grammar explanation. All correction content belongs only in feedback.
Keep feedback concise and useful. Never create feedback merely for capitalization or punctuation unless it materially affects meaning.`;

    const recentHistory = history.slice(-12);

    if (geminiKey) {
      try {
        const contents = recentHistory.map((item) => ({
          role: item.role === "student" ? "user" : "model",
          parts: [{ text: String(item.text ?? "").slice(0, 2000) }],
        }));

        contents.push({ role: "user", parts: [{ text: userMessage }] });

        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "x-goog-api-key": geminiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents,
              generationConfig: {
                maxOutputTokens: 450,
                responseMimeType: "application/json",
                thinkingConfig: { thinkingLevel: "low" },
              },
            }),
          },
        );

        const geminiData = await geminiResponse.json();

        if (geminiResponse.ok) {
          const raw = geminiData?.candidates?.[0]?.content?.parts
            ?.map((part: { text?: string }) => part.text ?? "")            ?.join("")
            ?.trim();

          const result = raw ? parseCoachResult(raw, userMessage) : null;

          if (result) {
            return new Response(
              JSON.stringify({ ...result, provider: "gemini" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }

        console.error("Gemini failed or returned invalid structured output; trying Groq fallback:", geminiData);
      } catch (error) {
        console.error("Gemini request failed; trying Groq fallback:", error);
      }
    }

    if (groqKey) {
      const groqMessages = [
        { role: "system", content: systemInstruction },
        ...recentHistory.map((item) => ({
          role: item.role === "student" ? "user" : "assistant",
          content: String(item.text ?? "").slice(0, 2000),
        })),
        { role: "user", content: userMessage },
      ];

      const groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: groqMessages,
            max_tokens: 450,
            temperature: 0.4,
            response_format: { type: "json_object" },
          }),
        },
      );

      const groqData = await groqResponse.json();

      if (groqResponse.ok) {
        const raw = groqData?.choices?.[0]?.message?.content?.trim();
        const result = raw ? parseCoachResult(raw, userMessage) : null;

        if (result) {
          return new Response(
            JSON.stringify({ ...result, provider: "groq" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      console.error("Groq fallback error:", groqData);
    }

    return new Response(
      JSON.stringify({ error: "The AI services could not generate a response." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Unexpected server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
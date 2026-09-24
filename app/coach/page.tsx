"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Gauge, LoaderCircle, Mic2, Send, Sparkles, Volume2, VolumeX } from "lucide-react";
import "./session-summary.css";

type Feedback = {
  original: string;
  corrected: string;
  tip: string;
  skill_category: string;
};

type Message = {
  role: "coach" | "student";
  text: string;
  feedback?: Feedback | null;
};

type SessionSummary = {
  summary: string;
  skills_practiced: string;
  positive_point: string;
  improvement_point: string;
  next_recommendation: string;
};

const levels = [
  { id: "beginner", label: "Beginner", description: "Iniciante" },
  { id: "elementary", label: "Elementary", description: "Básico" },
  { id: "intermediate", label: "Intermediate", description: "Intermediário" },
  { id: "upper_intermediate", label: "Upper Intermediate", description: "Intermediário avançado" },
  { id: "advanced", label: "Advanced", description: "Avançado" },
];

export default function CoachPage() {
  const router = useRouter();
  const [level, setLevel] = useState("intermediate");
  const [learningGoal, setLearningGoal] = useState("conversation");
  const [correctionStyle, setCorrectionStyle] = useState("balanced");
  const [conversationPace, setConversationPace] = useState("natural");
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isReplying, setIsReplying] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [hasSessionInteraction, setHasSessionInteraction] = useState(false);
  const [showExitGuard, setShowExitGuard] = useState(false);
  const [finishStage, setFinishStage] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, preferred_level, avatar_url, learning_goal, correction_style, conversation_pace")
        .eq("id", session.user.id)
        .single();

      if (profile?.full_name) setUserName(profile.full_name);
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
      if (profile?.learning_goal) setLearningGoal(profile.learning_goal);
      if (profile?.correction_style) setCorrectionStyle(profile.correction_style);
      if (profile?.conversation_pace) setConversationPace(profile.conversation_pace);
      if (profile?.preferred_level && levels.some((item) => item.id === profile.preferred_level)) {
        setLevel(profile.preferred_level);
      }
      setAuthChecking(false);
    }

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(() => setSessionSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (!isFinishing) {
      setFinishStage(0);
      return;
    }
    setFinishStage(1);
    const secondStage = window.setTimeout(() => setFinishStage(2), 1800);
    const thirdStage = window.setTimeout(() => setFinishStage(3), 4200);
    return () => {
      window.clearTimeout(secondStage);
      window.clearTimeout(thirdStage);
    };
  }, [isFinishing]);

  useEffect(() => {
    if (!started || !hasSessionInteraction || isFinishing) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [started, hasSessionInteraction, isFinishing]);

  function requestExitSession() {
    if (!started || !hasSessionInteraction) {
      setStarted(false);
      router.push("/");
      return;
    }
    setShowExitGuard(true);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function selectLevel(nextLevel: string) {
    setLevel(nextLevel);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("profiles")
      .update({ preferred_level: nextLevel })
      .eq("id", session.user.id);

    if (error) console.error("Erro ao salvar nível preferido:", error);
  }

  function startSession() {
    setSessionSeconds(0);
    setSessionSummary(null);
    setSessionCompleted(false);
    setHasSessionInteraction(false);
    setShowExitGuard(false);
    setStarted(true);

    setMessages([
      {
        role: "coach",
        text: "Hi! I'm your SpeakFlow coach. Let's practice English together. Tell me about your day.",
      },
    ]);
  }

  async function speakText(text: string) {
    if (!voiceEnabled || typeof window === "undefined") return;
    setIsSpeaking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/speakflow-voice`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("Neural voice unavailable");
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      const cleanup = () => { URL.revokeObjectURL(audioUrl); setIsSpeaking(false); };
      audio.addEventListener("ended", cleanup, { once: true });
      audio.addEventListener("error", cleanup, { once: true });
      await audio.play();
      return;
    } catch {
      if (!("speechSynthesis" in window)) { setIsSpeaking(false); return; }
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = "en-US";
      speech.rate = conversationPace === "slow" ? 0.85 : conversationPace === "fast" ? 1.05 : 0.95;
      speech.pitch = 1;
      speech.onend = () => setIsSpeaking(false);
      speech.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(speech);
    }
  }

  function startListening() {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("O reconhecimento de voz não está disponível neste navegador.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => setInput(event.results[0][0].transcript);
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isReplying) return;

    setHasSessionInteraction(true);
    setMessages((current) => [...current, { role: "student", text }]);
    setInput("");
    setIsReplying(true);

    try {
      const { data, error } = await supabase.functions.invoke("speakflow-coach", {
        body: { level, mode: "conversation", messages, message: text, learningGoal, correctionStyle, conversationPace },
      });

      if (error) throw error;

      setMessages((current) => [
        ...current,
        { role: "coach", text: data.reply, feedback: data.feedback ?? null },
      ]);
      speakText(data.reply);

      if (data.feedback) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error: insightError } = await supabase
            .from("learning_insights")
            .insert({
              user_id: session.user.id,
              level,
              original_text: data.feedback.original,
              corrected_text: data.feedback.corrected,
              tip: data.feedback.tip,
              skill_category: data.feedback.skill_category,
            });

          if (insightError) console.error("Erro ao salvar SpeakFlow Insight:", insightError);
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((current) => [
        ...current,
        { role: "coach", text: "I couldn't answer right now. Please try again." },
      ]);
    } finally {
      setIsReplying(false);
    }
  }

  async function finishSession() {
    if (isFinishing || isReplying) return;
    setShowExitGuard(false);
    if (!hasSessionInteraction) {
      setStarted(false);
      setMessages([]);
      setSessionSeconds(0);
      return;
    }
    setIsFinishing(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsFinishing(false);
      return;
    }

    let generatedSummary: SessionSummary | null = null;

    try {
      const { data, error: summaryError } = await supabase.functions.invoke("speakflow-coach", {
        body: {
          operation: "session_summary",
          level,
          mode: "conversation",
          learningGoal,
          correctionStyle,
          conversationPace,
          duration_seconds: sessionSeconds,
          messages,
        },
      });

      if (summaryError) throw summaryError;

      if (
        data?.summary &&
        data?.skills_practiced &&
        data?.positive_point &&
        data?.improvement_point &&
        data?.next_recommendation
      ) {
        generatedSummary = data as SessionSummary;
      }
    } catch (summaryError) {
      console.error("Erro ao gerar resumo da sessão:", summaryError);
    }

    const { error } = await supabase
      .from("learning_sessions")
      .insert({
        user_id: session.user.id,
        mode: "conversation",
        duration_seconds: sessionSeconds,
        summary: generatedSummary?.summary ?? null,
        skills_practiced: generatedSummary?.skills_practiced ?? null,
        positive_point: generatedSummary?.positive_point ?? null,
        improvement_point: generatedSummary?.improvement_point ?? null,
        next_recommendation: generatedSummary?.next_recommendation ?? null,
      });

    if (error) {
      console.error("Erro ao salvar sessão:", error);
      setIsFinishing(false);
      return;
    }

    const progressUpdate = (async () => {
      const { data: currentProgress } = await supabase
        .from("progress")
        .select("total_minutes, conversations_count, streak_days, last_practice_date")
        .eq("user_id", session.user.id)
        .single();

      const today = new Date().toISOString().split("T")[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split("T")[0];
      let nextStreak = currentProgress?.streak_days ?? 0;

      if (currentProgress?.last_practice_date !== today) {
        nextStreak = currentProgress?.last_practice_date === yesterday ? nextStreak + 1 : 1;
      }

      if (currentProgress) {
        const { error: progressError } = await supabase
          .from("progress")
          .update({
            conversations_count: currentProgress.conversations_count + 1,
            total_minutes:
              currentProgress.total_minutes + Math.max(1, Math.round(sessionSeconds / 60)),
            streak_days: nextStreak,
            last_practice_date: today,
          })
          .eq("user_id", session.user.id);

        if (progressError) console.error("Erro ao atualizar progresso:", progressError);
      }
    })();

    void progressUpdate;

    setSessionSummary(generatedSummary);
    setSessionCompleted(true);
    setStarted(false);
    setInput("");
    setIsFinishing(false);
  }

  const currentLevel = levels.find((item) => item.id === level);
  const minutes = Math.floor(sessionSeconds / 60);
  const seconds = sessionSeconds % 60;

  return (
    <main className="coach-shell">
      <div className="coach-orb coach-orb-one" />
      <div className="coach-orb coach-orb-two" />

      <div className="coach-container">
        <header className="coach-header">
          <button className="coach-back" onClick={requestExitSession}><ArrowLeft /> Voltar</button>
          <div className="coach-brand">
            <div className="coach-mark"><img src="/speakflow-logo.png" alt="SpeakFlow" /></div>
            <div>
              <div className="coach-logo">Speak<span>Flow</span></div>
              <div className="coach-kicker">AI ENGLISH COACH</div>
            </div>
          </div>
          <div className="coach-status">
            <span>{userName ? userName.split(" ")[0] : "Minha conta"}</span>
          </div>
        </header>

        {!started && sessionCompleted ? (
          <section className="session-summary">
            <div className="session-summary-hero">
              <div className="session-summary-mark"><img src="/speakflow-logo.png" alt="SpeakFlow" /></div>
              <span className="coach-label">SESSÃO CONCLUÍDA</span>
              <h1>Seu treino virou<br /><em>próximo passo.</em></h1>
              <p>{sessionSummary?.summary ?? "Sua sessão foi salva com sucesso. O SpeakFlow registrou esta prática no seu histórico de aprendizado."}</p>
              <div className="session-summary-meta">
                <span>{currentLevel?.label}</span>
                <span>Conversação</span>
                <span>{Math.max(1, Math.round(sessionSeconds / 60))} min</span>
              </div>
            </div>

            <div className="session-summary-grid">
              <article>
                <span>HABILIDADES PRATICADAS</span>
                <strong>{sessionSummary?.skills_practiced ?? "Prática registrada no seu histórico."}</strong>
              </article>
              <article>
                <span>PONTO POSITIVO</span>
                <strong>{sessionSummary?.positive_point ?? "Você concluiu mais uma sessão de prática."}</strong>
              </article>
              <article>
                <span>PRÓXIMA EVOLUÇÃO</span>
                <strong>{sessionSummary?.improvement_point ?? "Continue praticando para consolidar sua evolução."}</strong>
              </article>
              <article className="session-summary-next">
                <span>RECOMENDAÇÃO DO COACH</span>
                <strong>{sessionSummary?.next_recommendation ?? "Faça uma nova sessão quando estiver pronto para continuar."}</strong>
              </article>
            </div>

            <div className="session-summary-actions">
              <button className="coach-primary" onClick={startSession}>Praticar novamente</button>
              <button className="session-summary-progress" onClick={() => router.push("/progress")}>Ver meu progresso</button>
            </div>
          </section>
        ) : !started ? (
          <section className="coach-start">
            <div className="coach-eyebrow">SPEAKFLOW COACH</div>
            <h1>Sua próxima conversa<br />começa <em>agora.</em></h1>
            <p className="coach-intro">Pratique inglês em conversas reais. Enquanto você fala, o Coach identifica oportunidades de vocabulário, pronúncia e estrutura para alimentar seu aprendizado.</p>

            <div className="level-panel">
              <div className="level-heading">
                <div>
                  <span className="coach-label">SEU NÍVEL</span>
                  <h2>Como você quer praticar?</h2>
                </div>
                <span className="level-current">{currentLevel?.label}</span>
              </div>

              <div className="level-grid">
                {levels.map((item) => (
                  <button
                    key={item.id}
                    className={level === item.id ? "level-option selected" : "level-option"}
                    onClick={() => selectLevel(item.id)}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <button className="coach-primary" onClick={startSession}>
              Começar conversa
             
            </button>

            <div className="coach-tip">
              <span><Gauge /></span>
              Escolha seu nível e converse no seu ritmo. Seus insights podem alimentar os Labs especializados.
            </div>
          </section>
        ) : (
          <section className="conversation">
            <div className="conversation-top">
              <div>
                <span className="coach-label">CONVERSAÇÃO</span>
                <h1>English Practice</h1>
              </div>
              <div className="session-time">
                <span>SESSION</span>
                <strong>{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</strong>
              </div>
            </div>

            <div className="conversation-card">
              <div className="conversation-level">
                <span>LEVEL</span>
                <strong>{currentLevel?.label}</strong>
              </div>

              <div className="messages">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={message.role === "coach" ? "message coach-message" : "message student-message"}
                  >
                    {message.role === "coach" && (
                      <div className="message-avatar coach-avatar">
                        <img src="/speakflow-logo.png" alt="SpeakFlow Coach" />
                      </div>
                    )}
                    {message.role === "student" && (
                      <div className="message-avatar student-avatar">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Foto do perfil" />
                        ) : (
                          <span>{userName ? userName.charAt(0).toUpperCase() : "U"}</span>
                        )}
                      </div>
                    )}
                    <span className="message-label">{message.role === "coach" ? "SPEAKFLOW COACH" : "YOU"}</span>
                    <p>{message.text}</p>
                    {message.role === "coach" && (
                      <button
                        type="button"
                        className="message-speak"
                        onClick={() => speakText(message.text)}
                        aria-label="Ouvir novamente"
                        title="Ouvir novamente"
                      >
                        <Volume2 />
                      </button>
                    )}
                    {message.role === "coach" && message.feedback && (
                      <div className="speakflow-insight">
                        <div className="insight-title"><span><Sparkles /></span> SPEAKFLOW INSIGHT</div>
                        <div className="insight-section">
                          <span className="insight-label">VOCÊ DISSE</span>
                          <strong>{message.feedback.original}</strong>
                        </div>
                        <div className="insight-section">
                          <span className="insight-label">FORMA RECOMENDADA</span>
                          <strong>{message.feedback.corrected}</strong>
                        </div>
                        <div className="insight-tip"><span>DICA</span>{message.feedback.tip}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="conversation-input">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Type your answer in English..."
                  rows={3}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  className={isListening ? "mic-button listening" : "mic-button"}
                  onClick={startListening}
                  disabled={isListening}
                  aria-label={isListening ? "Ouvindo sua voz" : "Falar em inglês"}
                  title={isListening ? "Ouvindo..." : "Falar em inglês"}
                >
                  {isListening ? <LoaderCircle className="coach-icon-spin" /> : <Mic2 />}
                </button>
                <button
                  className="send-button"
                  onClick={sendMessage}
                  disabled={!input.trim() || isReplying}
                  aria-label="Enviar mensagem"
                >
                  <Send />
                </button>
              </div>
            </div>

            <div className="conversation-actions">
              <button
                type="button"
                className="voice-toggle"
                onClick={() => {
                  setVoiceEnabled((current) => {
                    if (current) window.speechSynthesis?.cancel();
                    return !current;
                  });
                }}
                aria-label={voiceEnabled ? "Desativar voz" : "Ativar voz"}
                title={voiceEnabled ? "Desativar voz" : "Ativar voz"}
              >
                {isSpeaking ? <LoaderCircle className="coach-icon-spin" /> : voiceEnabled ? <Volume2 /> : <VolumeX />}
              </button>
              <button className="finish-button" onClick={finishSession} disabled={isFinishing}>
                {isFinishing ? (finishStage <= 1 ? "Analisando sua prática..." : finishStage === 2 ? "Atualizando seu aprendizado..." : "Preparando seu progresso...") : "Finalizar sessão"}
              </button>
            </div>
          </section>
        )}

        {isFinishing && started && !showExitGuard && (
          <div className="session-processing-overlay" role="status" aria-live="polite">
            <div className="session-processing-card">
              <div className="session-processing-orbit"><span><img src="/speakflow-logo.png" alt="SpeakFlow" /></span></div>
              <span className="coach-label">SPEAKFLOW INTELLIGENCE</span>
              <h2>{finishStage <= 1 ? "Analisando sua prática..." : finishStage === 2 ? "Atualizando seu aprendizado..." : "Preparando seu progresso..."}</h2>
              <p>{finishStage <= 1 ? "O Coach está transformando sua sessão em insights úteis." : finishStage === 2 ? "Seu histórico e seu plano adaptativo estão sendo considerados." : "Só mais um instante para organizar seu próximo passo."}</p>
              <div className="session-processing-track"><span className={`stage-${finishStage}`} /></div>
            </div>
          </div>
        )}

        {showExitGuard && started && (
          <div className="session-exit-overlay" role="dialog" aria-modal="true" aria-labelledby="session-exit-title">
            <div className="session-exit-dialog">
              <div className="session-exit-mark"><img src="/speakflow-logo.png" alt="SpeakFlow" /></div>
              <span className="coach-label">SESSÃO EM ANDAMENTO</span>
              <h2 id="session-exit-title">Quer encerrar seu treino?</h2>
              <p>Para transformar esta prática em progresso, finalize a sessão antes de sair. Assim o SpeakFlow gera seu resumo e atualiza seu aprendizado.</p>
              <div className="session-exit-actions">
                <button type="button" className="coach-primary" onClick={finishSession} disabled={isFinishing || isReplying}>
                  {isFinishing ? (finishStage <= 1 ? "Analisando sua prática..." : finishStage === 2 ? "Atualizando seu aprendizado..." : "Preparando seu progresso...") : isReplying ? "Aguarde o Coach responder..." : "Encerrar e salvar sessão"}
                </button>
                <button type="button" className="session-exit-continue" onClick={() => setShowExitGuard(false)} disabled={isFinishing}>
                  Continuar praticando
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="coach-footer">
          <span>SpeakFlow IA</span>
          <span>O poder da IA guiando sua fluência em inglês.</span>
        </footer>
      </div>
    </main>
  );
}

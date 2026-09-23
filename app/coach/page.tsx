"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type TrainingMode = "conversation" | "vocabulary" | "pronunciation";

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

const levels = [
  { id: "beginner", label: "Beginner", description: "Iniciante" },
  { id: "elementary", label: "Elementary", description: "Básico" },
  { id: "intermediate", label: "Intermediate", description: "Intermediário" },
  { id: "upper_intermediate", label: "Upper Intermediate", description: "Intermediário avançado" },
  { id: "advanced", label: "Advanced", description: "Avançado" },
];

const pronunciationPhrases: Record<string, string[]> = {
  beginner: [
    "Good morning, how are you?",
    "I would like a glass of water.",
    "My name is Alex and I am learning English.",
  ],
  elementary: [
    "I usually have breakfast before I go to work.",
    "Could you tell me where the train station is?",
    "I really enjoy listening to music in my free time.",
  ],
  intermediate: [
    "I would really appreciate your help with this project.",
    "Learning English gives me more confidence when I travel.",
    "The weather has been surprisingly pleasant this week.",
  ],
  upper_intermediate: [
    "I am looking forward to improving my communication skills.",
    "The presentation went smoothly despite a few unexpected changes.",
    "Being understood clearly is more important than speaking quickly.",
  ],
  advanced: [
    "Effective communication requires clarity, confidence, and careful listening.",
    "Although the circumstances were challenging, we handled them remarkably well.",
    "Developing natural pronunciation involves rhythm, stress, and consistent practice.",
  ],
};

function normalizeSpeech(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wordSimilarity(target: string, heard: string) {
  const expected = normalizeSpeech(target).split(" ").filter(Boolean);
  const actual = normalizeSpeech(heard).split(" ").filter(Boolean);
  if (!expected.length) return 0;

  const rows = expected.length + 1;
  const cols = actual.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = expected[i - 1] === actual[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return Math.max(0, Math.round((1 - matrix[expected.length][actual.length] / expected.length) * 100));
}

export default function CoachPage() {
  const router = useRouter();
  const [trainingMode, setTrainingMode] = useState<TrainingMode>("conversation");
  const isVocabulary = trainingMode === "vocabulary";
  const isPronunciation = trainingMode === "pronunciation";

  const [level, setLevel] = useState("intermediate");
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
  const [pronunciationIndex, setPronunciationIndex] = useState(0);
  const [pronunciationResult, setPronunciationResult] = useState<{ heard: string; score: number } | null>(null);

  const currentPhrases = pronunciationPhrases[level] ?? pronunciationPhrases.intermediate;
  const pronunciationTarget = currentPhrases[pronunciationIndex % currentPhrases.length];

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (requestedMode === "vocabulary" || requestedMode === "pronunciation") {
      setTrainingMode(requestedMode);
    } else {
      setTrainingMode("conversation");
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, preferred_level, avatar_url")
        .eq("id", session.user.id)
        .single();

      if (profile?.full_name) setUserName(profile.full_name);
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
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
    setPronunciationIndex(0);
    setPronunciationResult(null);
    setStarted(true);

    if (isPronunciation) {
      setMessages([]);
      window.setTimeout(() => speakText(pronunciationPhrases[level][0]), 250);
      return;
    }

    setMessages([
      {
        role: "coach",
        text: isVocabulary
          ? "Hi! Today we'll build your vocabulary through conversation. Tell me about something you enjoy doing, and I'll help you discover useful new words along the way."
          : "Hi! I'm your SpeakFlow coach. Let's practice English together. Tell me about your day.",
      },
    ]);
  }

  function speakText(text: string) {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speech.rate = isPronunciation ? 0.82 : 0.95;
    speech.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
    if (englishVoice) speech.voice = englishVoice;
    window.speechSynthesis.speak(speech);
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
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (isPronunciation) {
        setPronunciationResult({
          heard: transcript,
          score: wordSimilarity(pronunciationTarget, transcript),
        });
      } else {
        setInput(transcript);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }

  function nextPronunciationPhrase() {
    const nextIndex = (pronunciationIndex + 1) % currentPhrases.length;
    setPronunciationIndex(nextIndex);
    setPronunciationResult(null);
    window.setTimeout(() => speakText(currentPhrases[nextIndex]), 150);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isReplying || isPronunciation) return;

    setMessages((current) => [...current, { role: "student", text }]);
    setInput("");
    setIsReplying(true);

    try {
      const { data, error } = await supabase.functions.invoke("speakflow-coach", {
        body: { level, mode: trainingMode, messages, message: text },
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
    if (isFinishing) return;
    setIsFinishing(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsFinishing(false);
      return;
    }

    const { error } = await supabase
      .from("learning_sessions")
      .insert({
        user_id: session.user.id,
        mode: trainingMode,
        duration_seconds: sessionSeconds,
      });

    if (error) {
      console.error("Erro ao salvar sessão:", error);
      setIsFinishing(false);
      return;
    }

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
      await supabase
        .from("progress")
        .update({
          conversations_count: currentProgress.conversations_count + 1,
          total_minutes:
            currentProgress.total_minutes + Math.max(1, Math.round(sessionSeconds / 60)),
          streak_days: nextStreak,
          last_practice_date: today,
        })
        .eq("user_id", session.user.id);
    }

    setStarted(false);
    setInput("");
    setPronunciationResult(null);
    setIsFinishing(false);
  }

  const currentLevel = levels.find((item) => item.id === level);
  const minutes = Math.floor(sessionSeconds / 60);
  const seconds = sessionSeconds % 60;

  const modeTitle = isPronunciation
    ? "Treino de pronúncia"
    : isVocabulary
      ? "Treino de vocabulário"
      : "Sua próxima conversa";

  const modeIntro = isPronunciation
    ? "Ouça frases em inglês, repita em voz alta e confira o quanto o reconhecimento conseguiu entender da sua fala."
    : isVocabulary
      ? "Amplie seu repertório com palavras úteis apresentadas naturalmente durante a conversa."
      : "Pratique inglês em uma experiência criada para acompanhar seu nível e ajudar você a evoluir.";

  return (
    <main className="coach-shell">
      <div className="coach-orb coach-orb-one" />
      <div className="coach-orb coach-orb-two" />

      <div className="coach-container">
        <header className="coach-header">
          <button className="coach-back" onClick={() => router.push("/")}>← Voltar</button>
          <div className="coach-brand">
            <div className="coach-mark"><img src="/speakflow-logo.png" alt="SpeakFlow" /></div>
            <div>
              <div className="coach-logo">Speak<span>Flow</span></div>
              <div className="coach-kicker">AI ENGLISH COACH</div>
            </div>
          </div>
          <div className="coach-status">
            <span>{userName ? userName.split(" ")[0] : "Minha conta"}</span>
            <button type="button" onClick={handleLogout} className="coach-logout">Sair</button>
          </div>
        </header>

        {!started ? (
          <section className="coach-start">
            <div className="coach-eyebrow">
              {isPronunciation ? "SPEAKFLOW PRONUNCIATION" : isVocabulary ? "SPEAKFLOW VOCABULARY" : "SPEAKFLOW COACH"}
            </div>
            <h1>{modeTitle}<br />começa <em>agora.</em></h1>
            <p className="coach-intro">{modeIntro}</p>

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
              {isPronunciation
                ? "Começar treino de pronúncia"
                : isVocabulary
                  ? "Começar treino de vocabulário"
                  : "Começar conversa"}
              <span>→</span>
            </button>

            <div className="coach-tip">
              <span>✦</span>
              {isPronunciation
                ? "Use o microfone para repetir as frases. A pontuação inicial compara o texto reconhecido com a frase-alvo."
                : isVocabulary
                  ? "Escolha seu nível e amplie seu vocabulário em contexto."
                  : "Escolha seu nível e pratique no seu ritmo."}
            </div>
          </section>
        ) : isPronunciation ? (
          <section className="conversation pronunciation-session">
            <div className="conversation-top">
              <div>
                <span className="coach-label">PRONÚNCIA</span>
                <h1>Pronunciation Practice</h1>
              </div>
              <div className="session-time">
                <span>SESSION</span>
                <strong>{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</strong>
              </div>
            </div>

            <div className="conversation-card pronunciation-card">
              <div className="conversation-level">
                <span>LEVEL</span>
                <strong>{currentLevel?.label}</strong>
              </div>

              <div className="pronunciation-workspace">
                <span className="coach-label">OUÇA E REPITA</span>
                <h2>{pronunciationTarget}</h2>
                <p>Ouça o modelo e repita a frase em voz alta. Fale com naturalidade, sem correr.</p>

                <div className="pronunciation-actions">
                  <button type="button" className="voice-toggle" onClick={() => speakText(pronunciationTarget)}>
                    🔊 Ouvir modelo
                  </button>
                  <button
                    type="button"
                    className={isListening ? "mic-button listening" : "mic-button"}
                    onClick={startListening}
                    disabled={isListening}
                  >
                    {isListening ? "● Ouvindo..." : "🎙️ Repetir frase"}
                  </button>
                </div>

                {pronunciationResult && (
                  <div className="speakflow-insight pronunciation-result">
                    <div className="insight-title"><span>✦</span> SPEAKFLOW PRONUNCIATION CHECK</div>
                    <div className="insight-section">
                      <span className="insight-label">O RECONHECIMENTO ENTENDEU</span>
                      <strong>{pronunciationResult.heard}</strong>
                    </div>
                    <div className="insight-section">
                      <span className="insight-label">CORRESPONDÊNCIA DA FRASE</span>
                      <strong>{pronunciationResult.score}%</strong>
                    </div>
                    <div className="insight-tip">
                      <span>LEMBRETE</span>
                      Esta pontuação compara as palavras reconhecidas com a frase-alvo; ela não é uma medição fonética completa.
                    </div>
                  </div>
                )}

                <button type="button" className="coach-primary" onClick={nextPronunciationPhrase}>
                  Próxima frase <span>→</span>
                </button>
              </div>
            </div>

            <div className="conversation-actions">
              <button className="finish-button" onClick={finishSession} disabled={isFinishing}>
                {isFinishing ? "Salvando..." : "Finalizar sessão"}
              </button>
              <div className="conversation-note"><span>●</span> Treino de pronúncia em andamento.</div>
            </div>
          </section>
        ) : (
          <section className="conversation">
            <div className="conversation-top">
              <div>
                <span className="coach-label">{isVocabulary ? "VOCABULÁRIO" : "CONVERSAÇÃO"}</span>
                <h1>{isVocabulary ? "Vocabulary Practice" : "English Practice"}</h1>
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
                        🔊
                      </button>
                    )}
                    {message.role === "coach" && message.feedback && (
                      <div className="speakflow-insight">
                        <div className="insight-title"><span>✦</span> SPEAKFLOW INSIGHT</div>
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
                  {isListening ? "●" : "🎙️"}
                </button>
                <button
                  className="send-button"
                  onClick={sendMessage}
                  disabled={!input.trim() || isReplying}
                  aria-label="Enviar mensagem"
                >
                  →
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
                {voiceEnabled ? "🔊" : "🔇"}
              </button>
              <button className="finish-button" onClick={finishSession} disabled={isFinishing}>
                {isFinishing ? "Salvando..." : "Finalizar sessão"}
              </button>
              <div className="conversation-note"><span>●</span> Sessão de prática em andamento.</div>
            </div>
          </section>
        )}

        <footer className="coach-footer">
          <span>SpeakFlow IA</span>
          <span>O poder da IA guiando sua fluência em inglês.</span>
        </footer>
      </div>
    </main>
  );
}

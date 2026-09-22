"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Message = {
  role: "coach" | "student";
  text: string;
};

const levels = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Iniciante",
  },
  {
    id: "elementary",
    label: "Elementary",
    description: "Básico",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Intermediário",
  },
  {
    id: "upper_intermediate",
    label: "Upper Intermediate",
    description: "Intermediário avançado",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Avançado",
  },
];

export default function CoachPage() {
  const router = useRouter();

  const [level, setLevel] = useState("intermediate");
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isReplying, setIsReplying] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [userName, setUserName] = useState("");

useEffect(() => {
  async function checkAuth() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
  router.replace("/login");
  return;
}

const { data: profile } = await supabase
  .from("profiles")
  .select("full_name")
  .eq("id", session.user.id)
  .single();

if (profile?.full_name) {
  setUserName(profile.full_name);
}

setAuthChecking(false);
  }

  checkAuth();
}, [router]);

useEffect(() => {
  if (!started) return;

  const timer = window.setInterval(() => {
    setSessionSeconds((current) => current + 1);
  }, 1000);

  return () => {
    window.clearInterval(timer);
  };
}, [started]);

  async function handleLogout() {
  await supabase.auth.signOut();
  router.replace("/login");
}

  function startSession() {
    setSessionSeconds(0);
    setStarted(true);

    setMessages([
      {
        role: "coach",
        text: "Hi! I'm your SpeakFlow coach. Let's practice English together. Tell me about your day.",
      },
    ]);
  }

  
    async function sendMessage() {
  const text = input.trim();

  if (!text || isReplying) return;

  setMessages((current) => [
    ...current,
    {
      role: "student",
      text,
    },
  ]);

  setInput("");
  setIsReplying(true);

  try {
    const { data, error } = await supabase.functions.invoke(
      "speakflow-coach",
      {
        body: {
          level,
          messages,
          message: text,
        },
      }
    );

    if (error) throw error;

    setMessages((current) => [
      ...current,
      {
        role: "coach",
        text: data.reply,
      },
    ]);
  } catch (error) {
    console.error(error);

    setMessages((current) => [
      ...current,
      {
        role: "coach",
        text: "I couldn't answer right now. Please try again.",
      },
    ]);
  } finally {
    setIsReplying(false);
  }
    }

  async function finishSession() {
    const {
  data: { session },
} = await supabase.auth.getSession();

if (!session) return;
    const { error } = await supabase
  .from("learning_sessions")
  .insert({
    user_id: session.user.id,
    mode: "conversation",
    duration_seconds: sessionSeconds,
  });

if (error) {
  console.error("Erro ao salvar sessão:", error);
  return;
}
    setStarted(false);
    setInput("");
  }

  const currentLevel = levels.find(
    (item) => item.id === level
  );

  const minutes = Math.floor(sessionSeconds / 60);
  const seconds = sessionSeconds % 60;

  return (
    <main className="coach-shell">
      <div className="coach-orb coach-orb-one" />
      <div className="coach-orb coach-orb-two" />

      <div className="coach-container">

        <header className="coach-header">

          <button
            className="coach-back"
            onClick={() => router.push("/")}
          >
            ← Voltar
          </button>

          <div className="coach-brand">

            <div className="coach-mark">
              <img
                src="/speakflow-logo.png"
                alt="SpeakFlow"
              />
            </div>

            <div>
              <div className="coach-logo">
                Speak<span>Flow</span>
              </div>

              <div className="coach-kicker">
                AI ENGLISH COACH
              </div>
            </div>

          </div>

          <div className="coach-status">
  <i />
  <span>
  {userName ? userName.split(" ")[0] : "Conta conectada"}
</span>

  <button
    type="button"
    onClick={handleLogout}
    className="coach-logout"
  >
    Sair
  </button>
</div>

        </header>


        {!started ? (

          <section className="coach-start">

            <div className="coach-eyebrow">
              SPEAKFLOW COACH
            </div>

            <h1>
              Sua próxima conversa
              <br />
              começa <em>agora.</em>
            </h1>

            <p className="coach-intro">
              Pratique inglês em uma experiência criada
              para acompanhar seu nível e ajudar você
              a evoluir.
            </p>


            <div className="level-panel">

              <div className="level-heading">

                <div>
                  <span className="coach-label">
                    SEU NÍVEL
                  </span>

                  <h2>
                    Como você quer praticar?
                  </h2>
                </div>

                <span className="level-current">
                  {currentLevel?.label}
                </span>

              </div>


              <div className="level-grid">

                {levels.map((item) => (

                  <button
                    key={item.id}
                    className={
                      level === item.id
                        ? "level-option selected"
                        : "level-option"
                    }
                    onClick={() => setLevel(item.id)}
                  >
                    <strong>
                      {item.label}
                    </strong>

                    <span>
                      {item.description}
                    </span>
                  </button>

                ))}

              </div>

            </div>


            <button
              className="coach-primary"
              onClick={startSession}
            >
              Começar conversa
              <span>→</span>
            </button>


            <div className="coach-tip">
              <span>✦</span>
              Escolha seu nível e pratique no seu ritmo.
            </div>

          </section>

        ) : (

          <section className="conversation">

            <div className="conversation-top">

              <div>
                <span className="coach-label">
                  CONVERSAÇÃO
                </span>

                <h1>
                  English Practice
                </h1>
              </div>


              <div className="session-time">
                <span>SESSION</span>

                <strong>
                  {String(minutes).padStart(2, "0")}:
                  {String(seconds).padStart(2, "0")}
                </strong>
              </div>

            </div>


            <div className="conversation-card">

              <div className="conversation-level">
                <span>LEVEL</span>

                <strong>
                  {currentLevel?.label}
                </strong>
              </div>


              <div className="messages">

                {messages.map((message, index) => (

                  <div
                    key={index}
                    className={
                      message.role === "coach"
                        ? "message coach-message"
                        : "message student-message"
                    }
                  >
                    <span className="message-label">
                      {message.role === "coach"
                        ? "SPEAKFLOW COACH"
                        : "YOU"}
                    </span>

                    <p>
                      {message.text}
                    </p>

                  </div>

                ))}

              </div>


              <div className="conversation-input">

                <textarea
                  value={input}
                  onChange={(event) =>
                    setInput(event.target.value)
                  }
                  placeholder="Type your answer in English..."
                  rows={3}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                />

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
                className="finish-button"
                onClick={finishSession}
              >
                Finalizar sessão
              </button>

              <div className="conversation-note">
                <span>●</span>
                Sessão de prática em andamento.
              </div>

            </div>

          </section>

        )}


        <footer className="coach-footer">
          <span>SpeakFlow IA</span>

          <span>
            O poder da IA guiando sua fluência em inglês.
          </span>
        </footer>

      </div>
    </main>
  );
}

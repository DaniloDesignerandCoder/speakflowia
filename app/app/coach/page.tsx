"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Message = {
  role: "coach" | "student";
  text: string;
};

const levels = [
  { id: "beginner", label: "Beginner", description: "Iniciante" },
  { id: "elementary", label: "Elementary", description: "Básico" },
  { id: "intermediate", label: "Intermediate", description: "Intermediário" },
  {
    id: "upper_intermediate",
    label: "Upper Intermediate",
    description: "Intermediário avançado",
  },
  { id: "advanced", label: "Advanced", description: "Avançado" },
];

export default function CoachPage() {
  const router = useRouter();

  const [level, setLevel] = useState("intermediate");
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  function startSession() {
    setStarted(true);
    setMessages([
      {
        role: "coach",
        text: "Hi! I'm your SpeakFlow coach. Let's practice English together. Tell me about your day.",
      },
    ]);
    setSessionSeconds(0);
  }

  function sendMessage() {
    const text = input.trim();

    if (!text) return;

    setMessages((current) => [
      ...current,
      {
        role: "student",
        text,
      },
      {
        role: "coach",
        text: "Great! Keep going. Try to add one more detail to your answer.",
      },
    ]);

    setInput("");
  }

  function finishSession() {
    setStarted(false);
  }

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
            <div className="coach-mark">S</div>

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
            Coach pronto
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
              Pratique inglês em uma experiência criada para
              acompanhar seu nível e ajudar você a evoluir.
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
                  {levels.find((item) => item.id === level)?.label}
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
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
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
              Feedback inteligente será aplicado à sua sessão.
            </div>
          </section>
        ) : (
          <section className="conversation">
            <div className="conversation-top">
              <div>
                <span className="coach-label">
                  CONVERSAÇÃO
                </span>

                <h1>English Practice</h1>
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
                  {levels.find((item) => item.id === level)?.label}
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

                    <p>{message.text}</p>
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
                  disabled={!input.trim()}
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
                Sua evolução será registrada no seu histórico.
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

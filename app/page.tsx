"use client";

import { useState } from "react";

const modes = [
  {
    title: "Conversação",
    label: "Speaking",
    text: "Pratique situações reais em inglês com seu coach de IA.",
    icon: "◌",
  },
  {
    title: "Pronúncia",
    label: "Speaking",
    text: "Treine sua fala e receba feedback direcionado.",
    icon: "◉",
  },
  {
    title: "Vocabulário",
    label: "Vocabulary",
    text: "Expanda seu repertório com situações práticas.",
    icon: "Aa",
  },
];

export default function Home() {
  const [active, setActive] = useState("home");

  return (
    <main className="sf-shell">
      <div className="sf-orb sf-orb-one" />
      <div className="sf-orb sf-orb-two" />

      <div className="sf-container">
        <header className="sf-header">
          <div className="sf-brand">
            <div className="sf-mark">S</div>

            <div>
              <div className="sf-logo">
                Speak<span>Flow</span>
              </div>

              <div className="sf-kicker">
                AI ENGLISH COACH
              </div>
            </div>
          </div>

          <button
            className="sf-profile"
            onClick={() => setActive("profile")}
          >
            Perfil
          </button>
        </header>

        <section className="sf-hero">
          <div className="sf-eyebrow">
            SPEAKFLOW IA
          </div>

          <h1>
            O inglês que você pratica.
            <br />
            <em>O inglês que você conquista.</em>
          </h1>

          <p>
            Conversas, pronúncia, vocabulário e feedback inteligente
            em uma experiência criada para acompanhar sua evolução.
          </p>

          <button
            className="sf-primary"
            onClick={() => setActive("coach")}
          >
            Começar um treino <span>→</span>
          </button>
        </section>

        <section className="sf-section">
          <div className="sf-section-head">
            <div>
              <div className="sf-label">
                SEU TREINO
              </div>

              <h2>
                Escolha como praticar
              </h2>
            </div>

            <span className="sf-status">
              <i />
              Coach pronto
            </span>
          </div>

          <div className="sf-grid">
            {modes.map((mode) => (
              <button
                className="sf-card"
                key={mode.title}
                onClick={() => setActive("coach")}
              >
                <div className="sf-card-top">
                  <span className="sf-icon">
                    {mode.icon}
                  </span>

                  <span className="sf-card-label">
                    {mode.label}
                  </span>
                </div>

                <h3>
                  {mode.title}
                </h3>

                <p>
                  {mode.text}
                </p>

                <div className="sf-card-action">
                  Praticar <span>↗</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="sf-progress">
          <div>
            <div className="sf-label">
              SEU PROGRESSO
            </div>

            <h2>
              Construa sua fluência, uma sessão por vez.
            </h2>

            <p>
              Seu histórico e sua evolução aparecerão aqui
              conforme você pratica.
            </p>
          </div>

          <div className="sf-metric">
            <strong>0</strong>

            <span>
              SESSÕES
            </span>
          </div>
        </section>

        <nav
          className="sf-nav"
          aria-label="Navegação principal"
        >
          {[
            ["home", "Início"],
            ["coach", "Coach"],
            ["progress", "Progresso"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={active === key ? "active" : ""}
              onClick={() => setActive(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <footer className="sf-footer">
          <span>
            SpeakFlow IA
          </span>

          <span>
            Simples. Inteligente. Poderoso.
          </span>
        </footer>
      </div>
    </main>
  );
}

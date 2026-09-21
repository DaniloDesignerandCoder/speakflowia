"use client";

import { useRouter } from "next/navigation";

const trainingModes = [
  {
    icon: "◌",
    category: "SPEAKING",
    title: "Conversação",
    description:
      "Pratique situações reais em inglês com seu Coach.",
  },
  {
    icon: "◎",
    category: "SPEAKING",
    title: "Pronúncia",
    description:
      "Treine sua fala e desenvolva uma pronúncia mais natural.",
  },
  {
    icon: "Aa",
    category: "VOCABULARY",
    title: "Vocabulário",
    description:
      "Amplie seu repertório através de situações práticas.",
  },
];

export default function Home() {
  const router = useRouter();

  function goToCoach() {
    router.push("/coach");
  }

  return (
    <main className="home-v2">

      {/* SIDEBAR DESKTOP */}
      <aside className="home-v2-sidebar">

        <div className="home-v2-brand">
          <div className="home-v2-brand-symbol">
            S
          </div>

          <div>
            <strong>
              Speak<span>Flow</span>
            </strong>

            <small>
              AI ENGLISH COACH
            </small>
          </div>
        </div>

        <nav className="home-v2-menu">

          <button className="active">
            <span>⌂</span>
            Início
          </button>

          <button onClick={goToCoach}>
            <span>✦</span>
            Coach
          </button>

          <button>
            <span>▥</span>
            Progresso
          </button>

          <button>
            <span>♫</span>
            MusicLab™
          </button>

          <button>
            <span>⚙</span>
            Configurações
          </button>

        </nav>

        <div className="home-v2-sidebar-footer">
          <strong>SpeakFlow</strong>

          <span>
            Simples. Inteligente. Poderoso.
          </span>
        </div>

      </aside>

      {/* CONTEÚDO */}
      <section className="home-v2-main">

        {/* HEADER */}
        <header className="home-v2-header">

          <div className="home-v2-mobile-brand">
            <div className="home-v2-mobile-symbol">
              S
            </div>

            <strong>
              Speak<span>Flow</span>
            </strong>
          </div>

          <div className="home-v2-header-space" />

          <div className="home-v2-status">
            <i />
            App ativo
          </div>

          <button
            className="home-v2-account"
            onClick={() => router.push("/login")}
          >
            <span className="home-v2-avatar">
              S
            </span>

            <span className="home-v2-account-text">
              Minha conta
            </span>
          </button>

        </header>

        <div className="home-v2-content">

          {/* HERO */}
          <section className="home-v2-hero">

            <div className="home-v2-hero-copy">

              <span className="home-v2-eyebrow">
                SPEAKFLOW IA
              </span>

              <h1>
                O poder da IA
                <br />
                guiando sua
                <span> fluência.</span>
              </h1>

              <p>
                Pratique inglês em uma experiência criada
                para acompanhar sua evolução e transformar
                cada sessão em aprendizado.
              </p>

              <button
                className="home-v2-primary"
                onClick={goToCoach}
              >
                Começar um treino
                <span>→</span>
              </button>

            </div>

            <div
              className="home-v2-orbit"
              aria-hidden="true"
            >
              <div className="home-v2-orbit-outer" />
              <div className="home-v2-orbit-inner" />

              <div className="home-v2-orbit-core">
                S
              </div>

              <div className="home-v2-wave">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>

          </section>

          {/* TREINOS */}
          <section className="home-v2-section">

            <div className="home-v2-section-title">

              <div>
                <span className="home-v2-label">
                  SEU TREINO
                </span>

                <h2>
                  Escolha como praticar
                </h2>
              </div>

              <div className="home-v2-ready">
                <i />
                Treino disponível
              </div>

            </div>

            <div className="home-v2-training-grid">

              {trainingModes.map((mode) => (

                <button
                  className="home-v2-training-card"
                  key={mode.title}
                  onClick={goToCoach}
                >

                  <div className="home-v2-card-top">

                    <div className="home-v2-card-icon">
                      {mode.icon}
                    </div>

                    <span>
                      {mode.category}
                    </span>

                  </div>

                  <h3>
                    {mode.title}
                  </h3>

                  <p>
                    {mode.description}
                  </p>

                  <div className="home-v2-card-action">
                    Praticar
                    <span>→</span>
                  </div>

                </button>

              ))}

            </div>

          </section>

          {/* COACH */}
          <section className="home-v2-coach">

            <div className="home-v2-coach-info">

              <div className="home-v2-coach-avatar">
                S
              </div>

              <div>
                <span className="home-v2-label">
                  SPEAKFLOW COACH
                </span>

                <h2>
                  Pronto para conversar?
                </h2>

                <p>
                  Escolha um tema e comece sua prática.
                </p>
              </div>

            </div>

            <div className="home-v2-topics">

              {[
                "Conversação",
                "Viagens",
                "Trabalho",
                "Dia a dia",
              ].map((topic) => (

                <button
                  key={topic}
                  onClick={goToCoach}
                >
                  {topic}
                </button>

              ))}

            </div>

          </section>

          {/* PROGRESSO */}
          <section className="home-v2-progress">

            <div className="home-v2-progress-copy">

              <span className="home-v2-label">
                SEU PROGRESSO
              </span>

              <h2>
                Sua evolução começa aqui.
              </h2>

              <p>
                Seus resultados aparecerão conforme
                você concluir novas sessões.
              </p>

            </div>

            <div className="home-v2-stats">

              <div>
                <strong>0</strong>
                <span>SESSÕES</span>
              </div>

              <div>
                <strong>0</strong>
                <span>MINUTOS</span>
              </div>

              <div>
                <strong>0</strong>
                <span>DIAS</span>
              </div>

            </div>

          </section>

        </div>

        <footer className="home-v2-footer">
          <span>SpeakFlow IA</span>

          <span>
            O poder da IA guiando sua fluência em inglês.
          </span>
        </footer>

      </section>

      {/* NAVEGAÇÃO MOBILE */}
      <nav className="home-v2-mobile-nav">

        <button className="active">
          <span>⌂</span>
          Início
        </button>

        <button onClick={goToCoach}>
          <span>✦</span>
          Coach
        </button>

        <button>
          <span>▥</span>
          Progresso
        </button>

        <button>
          <span>♫</span>
          MusicLab
        </button>

        <button>
          <span>⚙</span>
          Ajustes
        </button>

      </nav>

    </main>
  );
}

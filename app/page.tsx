"use client";

import { useRouter } from "next/navigation";

const modules = [
  {
    title: "Conversação",
    subtitle: "Speaking",
    description: "Pratique situações reais em inglês com seu Coach IA.",
    icon: "◌",
    route: "/coach",
  },
  {
    title: "Pronúncia",
    subtitle: "Speaking",
    description: "Treine sua fala e prepare sua pronúncia para situações reais.",
    icon: "◉",
    route: "/coach",
  },
  {
    title: "Vocabulário",
    subtitle: "Vocabulary",
    description: "Amplie seu repertório com prática contextualizada.",
    icon: "Aa",
    route: "/coach",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="dashboard-shell">

      {/* SIDEBAR */}
      <aside className="dashboard-sidebar">

        <div className="dashboard-brand">
          <img
            src="/speakflow-logo.svg"
            alt="SpeakFlow"
          />

          <div>
            <strong>
              Speak<span>Flow</span>
            </strong>

            <small>
              AI ENGLISH COACH
            </small>
          </div>
        </div>

        <nav
          className="dashboard-menu"
          aria-label="Menu principal"
        >

          <button className="dashboard-menu-item active">
            <span>⌂</span>
            Início
          </button>

          <button
            className="dashboard-menu-item"
            onClick={() => router.push("/coach")}
          >
            <span>✦</span>
            Coach
          </button>

          <button className="dashboard-menu-item">
            <span>▥</span>
            Progresso
          </button>

          <button className="dashboard-menu-item">
            <span>♫</span>
            MusicLab™
          </button>

          <button className="dashboard-menu-item">
            <span>⚙</span>
            Configurações
          </button>

        </nav>

        <div className="dashboard-sidebar-footer">

          <img
            src="/speakflow-logo.svg"
            alt=""
            aria-hidden="true"
          />

          <div>
            <strong>SpeakFlow</strong>

            <small>
              Simples. Inteligente. Poderoso.
            </small>
          </div>

        </div>

      </aside>

      {/* ÁREA PRINCIPAL */}
      <section className="dashboard-main">

        {/* TOPBAR */}
        <header className="dashboard-topbar">

          <div className="dashboard-mobile-brand">

            <img
              src="/speakflow-logo.svg"
              alt="SpeakFlow"
            />

            <strong>
              Speak<span>Flow</span>
            </strong>

          </div>

          <div className="dashboard-topbar-spacer" />

          <div className="dashboard-online">
            <i />
            Online
          </div>

          <button
            className="dashboard-profile"
            onClick={() => router.push("/login")}
          >
            <span className="dashboard-avatar">
              D
            </span>

            <span className="dashboard-profile-name">
              Usuário
            </span>

            <span>⌄</span>
          </button>

        </header>

        <div className="dashboard-content">

          {/* HERO */}
          <section className="dashboard-hero">

            <div className="dashboard-hero-copy">

              <div className="dashboard-eyebrow">
                SPEAKFLOW IA
              </div>

              <h1>
                O poder da IA
                <br />
                guiando sua <em>fluência.</em>
              </h1>

              <p>
                Converse, pratique e evolua em inglês
                com um Coach criado para acompanhar
                seu nível e transformar cada sessão
                em aprendizado.
              </p>

              <button
                className="dashboard-primary"
                onClick={() => router.push("/coach")}
              >
                Começar um treino
                <span>→</span>
              </button>

            </div>

            {/* VISUAL DO COACH */}
            <div
              className="dashboard-ai-visual"
              aria-hidden="true"
            >

              <div className="ai-ring ai-ring-one" />
              <div className="ai-ring ai-ring-two" />

              <div className="ai-face">
                S
              </div>

              <div className="ai-wave">
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

          {/* MODOS DE TREINO */}
          <section className="dashboard-section">

            <div className="dashboard-section-heading">

              <div>

                <span className="dashboard-label">
                  SEU TREINO
                </span>

                <h2>
                  Escolha como praticar
                </h2>

              </div>

              <span className="dashboard-ready">
                <i />
                Coach pronto
              </span>

            </div>

            <div className="dashboard-module-grid">

              {modules.map((module) => (

                <button
                  className="dashboard-module"
                  key={module.title}
                  onClick={() =>
                    router.push(module.route)
                  }
                >

                  <div className="dashboard-module-top">

                    <span className="dashboard-module-icon">
                      {module.icon}
                    </span>

                    <span>
                      {module.subtitle}
                    </span>

                  </div>

                  <h3>
                    {module.title}
                  </h3>

                  <p>
                    {module.description}
                  </p>

                  <div className="dashboard-module-action">
                    Praticar
                    <span>↗</span>
                  </div>

                </button>

              ))}

            </div>

          </section>

          {/* COACH */}
          <section className="dashboard-training">

            <div className="dashboard-training-brand">

              <div className="dashboard-mini-logo">

                <img
                  src="/speakflow-logo.svg"
                  alt=""
                  aria-hidden="true"
                />

              </div>

              <div>

                <strong>
                  Seu Coach de Inglês
                </strong>

                <span>
                  <i />
                  Online agora
                </span>

              </div>

            </div>

            <div className="dashboard-training-center">

              <span className="dashboard-label">
                PRÓXIMO TREINO
              </span>

              <h2>
                Pronto para conversar?
              </h2>

              <p>
                Escolha um tema e comece
                a praticar em inglês.
              </p>

              <div className="dashboard-topics">

                {[
                  "Conversação geral",
                  "Viagens",
                  "Trabalho",
                  "Vida cotidiana",
                ].map((topic) => (

                  <button
                    key={topic}
                    onClick={() =>
                      router.push("/coach")
                    }
                  >
                    {topic}
                  </button>

                ))}

              </div>

            </div>

            <div className="dashboard-training-time">

              <span>
                Sessão em andamento
              </span>

              <strong>
                00:00
              </strong>

            </div>

          </section>

          {/* PROGRESSO */}
          <section className="dashboard-progress">

            <div>

              <span className="dashboard-label">
                SEU PROGRESSO
              </span>

              <h2>
                Construa sua fluência,
                uma sessão por vez.
              </h2>

              <p>
                Seu histórico e sua evolução
                aparecerão aqui conforme você pratica.
              </p>

            </div>

            <div className="dashboard-stat">

              <strong>0</strong>

              <span>
                SESSÕES
              </span>

            </div>

            <div className="dashboard-stat">

              <strong>0</strong>

              <span>
                MINUTOS
              </span>

            </div>

            <div className="dashboard-stat">

              <strong>0</strong>

              <span>
                DIAS
              </span>

            </div>

          </section>

        </div>

        {/* FOOTER */}
        <footer className="dashboard-footer">

          <span>
            SpeakFlow IA
          </span>

          <span>
            O poder da IA guiando
            sua fluência em inglês.
          </span>

        </footer>

      </section>

    </main>
  );
}

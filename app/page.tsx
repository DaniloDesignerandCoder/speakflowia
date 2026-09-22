"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";

const modules = [
  {
    title: "Conversação",
    subtitle: "Speaking",
    description:
      "Pratique situações reais em inglês com seu Coach.",
    icon: "◌",
    route: "/coach",
  },
  {
    title: "Pronúncia",
    subtitle: "Speaking",
    description:
      "Treine sua fala e desenvolva uma pronúncia mais natural.",
    icon: "◎",
    route: "/coach",
  },
  {
    title: "Vocabulário",
    subtitle: "Vocabulary",
    description:
      "Amplie seu repertório através de situações práticas.",
    icon: "Aa",
    route: "/coach",
  },
];

export default function Home() {
  const router = useRouter();

  const [progress, setProgress] = useState({
    conversations_count: 0,
    total_minutes: 0,
    streak_days: 0,
  });

  useEffect(() => {
    async function loadProgress() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const { data } = await supabase
      .from("progress")
      .select("conversations_count, total_minutes, streak_days")
      .eq("user_id", session.user.id)
      .single();

    if (data) {
      setProgress(data);
    }
  }

  loadProgress();
}, []);
  
  return (
    <main className="dashboard-shell">

      <aside className="dashboard-sidebar">

        <div className="dashboard-brand">
          <img
            src="/speakflow-logo.png"
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
            src="/speakflow-logo.png"
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


      <section className="dashboard-main">

        <header className="dashboard-topbar">

          <div className="dashboard-mobile-brand">

            <img
              src="/speakflow-logo.png"
              alt="SpeakFlow"
            />

            <strong>
              Speak<span>Flow</span>
            </strong>

          </div>

          <div className="dashboard-topbar-spacer" />

          <div className="dashboard-online">
            <i />
            App ativo
          </div>

          <button
            className="dashboard-profile"
            onClick={() => router.push("/login")}
          >
            
<span className="dashboard-avatar">
  <img
    src="/speakflow-logo.png"
    alt=""
    aria-hidden="true"
  />
</span>
            <span className="dashboard-profile-name">
              Minha conta
            </span>

            <span>⌄</span>
          </button>

        </header>


        <div className="dashboard-content">

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
                Pratique inglês em uma experiência criada
                para acompanhar sua evolução e transformar
                cada sessão em aprendizado.
              </p>

              <button
                className="dashboard-primary"
                onClick={() => router.push("/coach")}
              >
                Começar um treino
                <span>→</span>
              </button>

            </div>


            <div
              className="dashboard-ai-visual"
              aria-hidden="true"
            >
              <div className="ai-ring ai-ring-one" />
              <div className="ai-ring ai-ring-two" />

              <div className="ai-face">
  <img
    src="/speakflow-logo.png"
    alt=""
    aria-hidden="true"
  />
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
                Treino disponível
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


          <section className="dashboard-training">

            <div className="dashboard-training-brand">

              <div className="dashboard-mini-logo">
                <img
                  src="/speakflow-logo.png"
                  alt=""
                  aria-hidden="true"
                />
              </div>

              <div>
                <strong>
                  SpeakFlow Coach
                </strong>

                <span>
                  <i />
                  Modo prática
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
                Escolha um tema e comece sua prática.
              </p>

              <div className="dashboard-topics">

                {[
                  "Conversação",
                  "Viagens",
                  "Trabalho",
                  "Dia a dia",
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
                Tempo da sessão
              </span>

              <strong>
                00:00
              </strong>

            </div>

          </section>


          <section className="dashboard-progress">

            <div>

              <span className="dashboard-label">
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


            <div className="dashboard-stat">
  <strong>{progress.conversations_count}</strong>
  <span>SESSÕES</span>
</div>

            <div className="dashboard-stat">
  <strong>{progress.total_minutes}</strong>
  <span>MINUTOS</span>
</div>

            <div className="dashboard-stat">
  <strong>{progress.streak_days}</strong>
  <span>DIAS</span>
</div>

          </section>

        </div>


        <footer className="dashboard-footer">

          <span>
            SpeakFlow IA
          </span>

          <span>
            O poder da IA guiando sua fluência em inglês.
          </span>

        </footer>

      </section>

    </main>
  );
}

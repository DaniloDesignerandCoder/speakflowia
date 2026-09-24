"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";
import { AudioLines, BookOpenText, ChartNoAxesColumnIncreasing, House, Layers3, MessageCircleMore, Mic2, Settings2, type LucideIcon } from "lucide-react";

const modules: Array<{ title: string; subtitle: string; description: string; icon: LucideIcon; route: string }> = [
  {
    title: "Conversação",
    subtitle: "Speaking",
    description:
      "Pratique situações reais em inglês com seu Coach.",
    icon: MessageCircleMore,
    route: "/coach?mode=conversation",
  },
  {
    title: "Pronúncia",
    subtitle: "Pronunciation",
    description:
      "Treine sua fala e desenvolva uma pronúncia mais natural.",
    icon: Mic2,
    route: "/pronunciation",
  },
  {
    title: "Vocabulário",
    subtitle: "Vocabulary",
    description:
      "Amplie seu repertório através de situações práticas.",
    icon: BookOpenText,
    route: "/vocabulary",
  },
  {
    title: "MusicLab™",
    subtitle: "Music × Language",
    description:
      "Aprenda inglês ouvindo música em uma experiência audiovisual interativa.",
    icon: AudioLines,
    route: "/musiclab",
  },
];

export default function Home() {
  const router = useRouter();

  const [userProfile, setUserProfile] = useState({
    name: "Minha conta",
    email: "",
    avatarUrl: "",
  });

  const [heroExperience, setHeroExperience] = useState<"coach" | "musiclab">("coach");

  const [progress, setProgress] = useState({
    conversations_count: 0,
    total_minutes: 0,
    streak_days: 0,
  });

  const [currentLevel, setCurrentLevel] = useState({
    id: "intermediate",
    label: "Intermediate",
    description: "Intermediário",
  });

  const [learningFocus, setLearningFocus] = useState({
    skill: "Seu aprendizado",
    tip: "Continue praticando para o SpeakFlow identificar seu próximo foco.",
    sessions: 0,
    minutes: 0,
    route: "/coach?mode=conversation",
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroExperience((current) => current === "coach" ? "musiclab" : "coach");
    }, 8500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadProgress() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    setUserProfile({
      name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Minha conta",
      email: session.user.email ?? "",
      avatarUrl: "",
    });

    const { data } = await supabase
      .from("progress")
      .select("conversations_count, total_minutes, streak_days")
      .eq("user_id", session.user.id)
      .single();

    if (data) {
      setProgress(data);
    }

    const [sessionsResult, insightsResult, profileResult] = await Promise.all([
      supabase
        .from("learning_sessions")
        .select("duration_seconds")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("learning_insights")
        .select("skill_category, tip")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("profiles")
        .select("preferred_level, avatar_url")
        .eq("id", session.user.id)
        .maybeSingle(),
    ]);

    const levelMap: Record<string, { label: string; description: string }> = {
      beginner: { label: "Beginner", description: "Iniciante" },
      elementary: { label: "Elementary", description: "Básico" },
      intermediate: { label: "Intermediate", description: "Intermediário" },
      upper_intermediate: { label: "Upper Intermediate", description: "Intermediário avançado" },
      advanced: { label: "Advanced", description: "Avançado" },
    };
    const levelId = profileResult.data?.preferred_level ?? "intermediate";
    const levelInfo = levelMap[levelId] ?? levelMap.intermediate;
    setCurrentLevel({ id: levelId, ...levelInfo });
    setUserProfile((current) => ({
      ...current,
      avatarUrl: profileResult.data?.avatar_url ?? "",
    }));

    const sessions = sessionsResult.data ?? [];
    const insights = insightsResult.data ?? [];
    const minutes = Math.round(
      sessions.reduce((sum, item) => sum + Math.max(0, item.duration_seconds ?? 0), 0) / 60
    );

    const normalizeSkill = (value: string | null) => {
      const raw = value?.trim().toLowerCase() ?? "";
      if (raw.includes("pronun")) return "Pronúncia";
      if (raw.includes("grammar") || raw.includes("tense") || raw.includes("verb") || raw.includes("article") || raw.includes("preposition")) return "Gramática";
      if (raw.includes("vocab") || raw.includes("word")) return "Vocabulário";
      if (raw.includes("sentence")) return "Estrutura de frases";
      if (raw.includes("conversation")) return "Conversação";
      return "Seu aprendizado";
    };

    const counts = new Map<string, number>();
    insights.forEach((item) => {
      const skill = normalizeSkill(item.skill_category);
      if (skill !== "Seu aprendizado") counts.set(skill, (counts.get(skill) ?? 0) + 1);
    });

    const skill = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Seu aprendizado";
    const route =
      skill === "Pronúncia"
        ? "/pronunciation"
        : skill === "Vocabulário"
          ? "/vocabulary"
          : "/coach?mode=conversation";

    setLearningFocus({
      skill,
      tip: insights[0]?.tip ?? "Continue praticando para o SpeakFlow identificar seu próximo foco.",
      sessions: sessions.length,
      minutes,
      route,
    });
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
            <span><House /></span>
            Início
          </button>

          <button
            className="dashboard-menu-item"
            onClick={() => router.push("/coach")}
          >
            <span><MessageCircleMore /></span>
            Coach
          </button>

          <button
            className="dashboard-menu-item"
            onClick={() => router.push("/progress")}
          >
            <span><ChartNoAxesColumnIncreasing /></span>
            Progresso
          </button>

          <button
            className="dashboard-menu-item"
            onClick={() => router.push("/musiclab")}
          >
            <span><AudioLines /></span>
            MusicLab™
          </button>

          <button className="dashboard-menu-item" onClick={() => router.push("/plans")}>
            <span><Layers3 /></span>
            Planos
          </button>

          <button className="dashboard-menu-item dashboard-settings-item" onClick={() => router.push("/settings")}>
            <span><Settings2 /></span>
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

          <button
            className="dashboard-profile"
            onClick={() => router.push("/profile")}
          >
            
<span className="dashboard-avatar">
  <img
    src={userProfile.avatarUrl || "/speakflow-logo.png"}
    alt={userProfile.avatarUrl ? "Foto do perfil" : ""}
  />
</span>
            <span className="dashboard-profile-name">
              {userProfile.name}
            </span>

            <span>⌄</span>
          </button>

        </header>


        <div className="dashboard-content">

          <section className="dashboard-hero">

            <div className="dashboard-hero-copy">

              <div className="dashboard-hero-brand">
                <img src="/speakflow-logo.png" alt="" aria-hidden="true" />
                <div>
                  <strong>Speak<span>Flow</span></strong>
                  <small>AI ENGLISH COACH</small>
                </div>
              </div>

              <div className="dashboard-eyebrow">
                SUA FLUÊNCIA. EM MOVIMENTO.
              </div>

              <h1>
                Fale inglês.
                <br />
                <em>Viva sem traduzir.</em>
              </h1>

              <p>
                Conversas reais, feedback inteligente e uma IA que transforma
                cada prática em evolução.
              </p>

              <button
                className="dashboard-primary"
                onClick={() => router.push("/coach")}
              >
                Começar um treino
                <span>→</span>
              </button>

            </div>


            <div className={"dashboard-live-demo " + (heroExperience === "musiclab" ? "show-musiclab" : "show-coach")} aria-label="Demonstração interativa SpeakFlow">
              <div className="live-demo-scene live-demo-coach-scene" aria-hidden={heroExperience !== "coach"}>
                <div className="live-demo-brand"><img src="/speakflow-logo.png" alt="" aria-hidden="true" /><div><strong>SpeakFlow Coach</strong><span>CONVERSAÇÃO</span></div></div>
                <div className="live-demo-conversation"><div className="live-demo-message student"><span>YOU</span><p>Yesterday I go to school.</p></div><div className="live-demo-message coach"><span>SPEAKFLOW</span><p>Almost! Try: “Yesterday I went to school.”</p></div><div className="live-demo-insight"><span>✦ SMART FEEDBACK</span><strong>went</strong><small>past tense of “go”</small></div></div>
                <div className="live-demo-caption"><span>Speak naturally.</span><span>Learn while you talk.</span></div>
              </div>
              <div className="live-demo-scene live-demo-musiclab-scene" aria-hidden={heroExperience !== "musiclab"}>
                <div className="live-music-head"><div><span>MUSICLAB™</span><small>NOW LISTENING</small></div><b>LIVE EXPERIENCE</b></div>
                <div className="live-music-core"><div className="live-music-rings"><div className="live-music-disc"><img src="/speakflow-logo.png" alt="" aria-hidden="true" /></div></div></div>
                <div className="live-music-copy"><span>ACOUSTIC POP</span><strong>The Circle</strong><small>Kira Daly / Good Time Villains</small></div>
                <div className="live-music-wave">{Array.from({length:24},(_,i)=><i key={i} style={{height: (22 + ((i * 17) % 72)) + "%"}} />)}</div>
                <div className="live-music-progress"><span /></div>
                <div className="live-music-footer"><span>LISTEN</span><span>DISCOVER</span><span>SHADOW</span></div>
              </div>
              <div className="live-demo-switch" aria-hidden="true"><i className={heroExperience === "coach" ? "active" : ""} /><i className={heroExperience === "musiclab" ? "active" : ""} /></div>
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

            </div>


            <div className="dashboard-module-grid">

              {modules.map((module) => {
                const ModuleIcon = module.icon;
                return (

                <button
                  className="dashboard-module"
                  key={module.title}
                  onClick={() =>
                    router.push(module.route)
                  }
                >

                  <div className="dashboard-module-top">

                    <span className="dashboard-module-icon">
                      <ModuleIcon />
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

              );
              })}

            </div>

          </section>


          <section className="dashboard-level-journey">
            <div className="dashboard-level-main">
              <span className="dashboard-label">SEU NÍVEL ATUAL</span>
              <div className="dashboard-level-title">
                <div className="dashboard-level-orb">✦</div>
                <div>
                  <h2>{currentLevel.label}</h2>
                  <p>{currentLevel.description}</p>
                </div>
              </div>
            </div>
            <div className="dashboard-level-adaptive">
              <span>APRENDIZADO ADAPTATIVO</span>
              <strong>Seu Coach acompanha seu ritmo.</strong>
              <p>Vocabulário, perguntas e feedback são ajustados ao seu nível durante os treinos.</p>
              <button onClick={() => router.push("/coach")}>Treinar neste nível <span>→</span></button>
            </div>
          </section>

          <section className="dashboard-learning-focus">
            <div className="dashboard-focus-copy">
              <span className="dashboard-label">CONTINUE DE ONDE PAROU</span>
              <h2>{learningFocus.skill}</h2>
              <p>{learningFocus.tip}</p>
              <button className="dashboard-focus-action" onClick={() => router.push(learningFocus.route)}>
                Continuar praticando <span>→</span>
              </button>
            </div>

            <div className="dashboard-focus-stats">
              <div><strong>{learningFocus.sessions}</strong><span>SESSÕES</span></div>
              <div><strong>{learningFocus.minutes}</strong><span>MINUTOS</span></div>
              <button onClick={() => router.push("/progress")}>Ver progresso <span>↗</span></button>
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
  <strong>{learningFocus.sessions}</strong>
  <span>SESSÕES</span>
</div>

            <div className="dashboard-stat">
  <strong>{learningFocus.minutes}</strong>
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
            © 2026 SpeakFlow IA. Todos os direitos reservados.
          </span>

          <span>
            Conteúdo, identidade visual e materiais educacionais protegidos.
          </span>

        </footer>

      </section>

    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import "./musiclab.css";

type Track = {
  id: string;
  title: string;
  artist: string;
  level: string;
  focus: string;
  duration: string;
  description: string;
  phrases: { line: string; meaning: string; note: string }[];
};

const tracks: Track[] = [
  {
    id: "city-lights",
    title: "City Lights",
    artist: "SpeakFlow Originals",
    level: "Beginner",
    focus: "Everyday English",
    duration: "6 min",
    description: "Treine compreensão e expressão com uma história curta sobre rotina, cidade e planos.",
    phrases: [
      { line: "I’m walking home under the city lights.", meaning: "Estou voltando para casa sob as luzes da cidade.", note: "Walking home é uma forma natural de dizer que você está indo para casa a pé." },
      { line: "Tomorrow, I’ll take a different road.", meaning: "Amanhã, vou pegar um caminho diferente.", note: "I’ll é a contração de I will, muito comum ao falar de decisões e futuro." },
      { line: "There’s still time to change my mind.", meaning: "Ainda há tempo para mudar de ideia.", note: "Change my mind significa mudar de ideia, não mudar a mente literalmente." },
    ],
  },
  {
    id: "new-day",
    title: "A New Day",
    artist: "SpeakFlow Originals",
    level: "Elementary",
    focus: "Listening & Vocabulary",
    duration: "7 min",
    description: "Explore linguagem sobre novos começos, hábitos e pequenas decisões do cotidiano.",
    phrases: [
      { line: "I woke up early and opened the window.", meaning: "Acordei cedo e abri a janela.", note: "Woke up é o passado irregular de wake up." },
      { line: "I’m ready to start again.", meaning: "Estou pronto para começar de novo.", note: "Ready to + verbo é uma estrutura frequente para indicar disposição." },
      { line: "One small step can change the day.", meaning: "Um pequeno passo pode mudar o dia.", note: "Can expressa possibilidade ou capacidade, dependendo do contexto." },
    ],
  },
  {
    id: "weekend-call",
    title: "Weekend Call",
    artist: "SpeakFlow Originals",
    level: "Intermediate",
    focus: "Natural Conversation",
    duration: "8 min",
    description: "Pratique expressões naturais usadas para combinar planos e conversar sobre o fim de semana.",
    phrases: [
      { line: "Are you free this weekend?", meaning: "Você está livre neste fim de semana?", note: "Uma pergunta curta e natural para descobrir se alguém tem disponibilidade." },
      { line: "I haven’t made any plans yet.", meaning: "Ainda não fiz nenhum plano.", note: "Yet aparece com frequência no fim de frases negativas no present perfect." },
      { line: "Let’s figure something out.", meaning: "Vamos combinar alguma coisa.", note: "Figure something out pode significar encontrar uma solução ou decidir algo." },
    ],
  },
];

export default function MusicLab() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState(tracks[0].id);
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setName(data.session.user.user_metadata?.full_name?.split(" ")[0] ?? "");
    });
  }, [router]);

  const track = useMemo(() => tracks.find((item) => item.id === selectedId) ?? tracks[0], [selectedId]);
  const phrase = track.phrases[step];

  function chooseTrack(id: string) {
    setSelectedId(id);
    setStep(0);
    setRevealed(false);
  }

  function nextPhrase() {
    setStep((current) => (current + 1) % track.phrases.length);
    setRevealed(false);
  }

  async function speak(text: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/speakflow-voice`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) throw new Error("Neural voice unavailable");

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.addEventListener("ended", () => URL.revokeObjectURL(audioUrl), { once: true });
      await audio.play();
      return;
    } catch {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.88;
      window.speechSynthesis.speak(utterance);
    }
  }

  return (
    <main className="musiclab-shell">
      <header className="musiclab-topbar">
        <button className="musiclab-back" onClick={() => router.push("/")} aria-label="Voltar para o início">←</button>
        <div className="musiclab-brand">
          <img src="/speakflow-logo.png" alt="SpeakFlow" />
          <div><strong>MusicLab<span>™</span></strong><small>BY SPEAKFLOW</small></div>
        </div>
        <div className="musiclab-user">{name ? `Olá, ${name}` : "SpeakFlow"}</div>
      </header>

      <section className="musiclab-hero">
        <div className="musiclab-hero-copy">
          <span>MUSIC · LANGUAGE · FLOW</span>
          <h1>Ouça o inglês.<br/><em>Entenda de verdade.</em></h1>
          <p>Uma experiência de aprendizado criada para transformar música em contexto, vocabulário e inglês que você consegue usar.</p>
        </div>
        <div className="musiclab-now">
          <span>EM ESTÚDIO</span>
          <div className="musiclab-cover"><img src="/speakflow-logo.png" alt="" /></div>
          <div><strong>{track.title}</strong><p>{track.artist}</p></div>
          <div className="musiclab-wave" aria-hidden="true">{Array.from({length:18}).map((_,i)=><i key={i}/>)}</div>
        </div>
      </section>

      <section className="musiclab-library">
        <div className="musiclab-section-head">
          <div><span>SELEÇÃO MUSICLAB</span><h2>Escolha sua experiência</h2></div>
          <p>Conteúdo original criado para aprender sem distrações.</p>
        </div>
        <div className="musiclab-tracks">
          {tracks.map((item, index) => (
            <button key={item.id} className={selectedId === item.id ? "musiclab-track active" : "musiclab-track"} onClick={() => chooseTrack(item.id)}>
              <span className="musiclab-track-number">0{index + 1}</span>
              <div><strong>{item.title}</strong><p>{item.focus}</p></div>
              <small>{item.level} · {item.duration}</small>
              <b>→</b>
            </button>
          ))}
        </div>
      </section>

      <section className="musiclab-studio">
        <div className="musiclab-studio-copy">
          <span>LISTENING STUDIO</span>
          <h2>{track.title}</h2>
          <p>{track.description}</p>
          <div className="musiclab-meta"><span>{track.level}</span><span>{track.focus}</span><span>{track.duration}</span></div>
        </div>

        <div className="musiclab-lesson">
          <div className="musiclab-lesson-top"><span>FRASE {step + 1} DE {track.phrases.length}</span><small>Ouça primeiro. Depois explore.</small></div>
          <blockquote>{phrase.line}</blockquote>
          <div className="musiclab-actions">
            <button className="musiclab-listen" onClick={() => speak(phrase.line)}>Ouvir frase</button>
            <button className="musiclab-reveal" onClick={() => setRevealed((value) => !value)}>{revealed ? "Ocultar contexto" : "Entender contexto"}</button>
          </div>
          {revealed && (
            <div className="musiclab-context">
              <div><span>SIGNIFICADO</span><strong>{phrase.meaning}</strong></div>
              <div><span>INGLÊS EM CONTEXTO</span><p>{phrase.note}</p></div>
            </div>
          )}
          <button className="musiclab-next" onClick={nextPhrase}>Próxima frase <span>→</span></button>
        </div>
      </section>

      <footer className="musiclab-footer">
        <img src="/speakflow-logo.png" alt="" />
        <p>MusicLab™ é uma experiência de aprendizado SpeakFlow.</p>
      </footer>
    </main>
  );
}

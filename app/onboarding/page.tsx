"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const questions = [
  ["Qual frase está correta?", "She go to work every day.", "She goes to work every day.", "She going to work every day.", 1],
  ["Complete: I ___ English for two years.", "study", "am studying since", "have studied", 2],
  ["O que significa: I'm looking forward to it?", "Estou procurando por isso.", "Estou ansioso por isso.", "Estou desistindo disso.", 1],
  ["Escolha a opção mais natural.", "If I knew, I would tell you.", "If I know, I would told you.", "If I knew, I will tell you.", 0],
  ["Complete: By the time we arrived, the meeting ___.", "already starts", "has already started", "had already started", 2],
  ["Escolha a frase mais natural.", "Despite being tired, she carried on working.", "Despite she was tired, she carried working.", "Although tired, but she continued work.", 0],
] as const;

const results = [
  ["beginner", "Beginner", "Iniciante"],
  ["elementary", "Elementary", "Básico"],
  ["intermediate", "Intermediate", "Intermediário"],
  ["upper_intermediate", "Upper Intermediate", "Intermediário avançado"],
  ["advanced", "Advanced", "Avançado"],
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const score = useMemo(() => answers.reduce((n, a, i) => n + (a === questions[i][4] ? 1 : 0), 0), [answers]);
  const result = results[score <= 1 ? 0 : score === 2 ? 1 : score === 3 ? 2 : score === 4 ? 3 : 4];
  const finished = step === questions.length;

  function next() {
    if (selected === null) return;
    setAnswers(v => [...v, selected]);
    setSelected(null);
    setStep(v => v + 1);
  }

  async function finish() {
    setSaving(true);
    setSaveError("");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) { setSaving(false); router.replace("/login"); return; }
    const { error } = await supabase.from("profiles").update({
      preferred_level: result[0],
      onboarding_completed: true,
    }).eq("id", user.id);
    if (error) {
      setSaveError("Não foi possível salvar sua personalização agora. Tente novamente.");
      setSaving(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return <main className="onboarding-shell">
    <section className="onboarding-card">
      <div className="onboarding-brand">
        <img src="/speakflow-logo.png" alt="SpeakFlow" />
        <div><strong>Speak<span>Flow</span></strong><small>AI ENGLISH COACH</small></div>
      </div>
      {!finished ? <>
        <div className="onboarding-progress"><span>AVALIAÇÃO INICIAL · {step + 1} DE {questions.length}</span><i style={{width: ((step + 1) / questions.length * 100) + "%"}} /></div>
        <div className="onboarding-copy"><span>ENCONTRE SEU PONTO DE PARTIDA</span><h1>{questions[step][0]}</h1><p>Escolha a resposta que parece correta. Isso serve para personalizar seus primeiros treinos.</p></div>
        <div className="onboarding-options">{questions[step].slice(1,4).map((option, i) =>
          <button key={option} type="button" className={selected === i ? "selected" : ""} onClick={() => setSelected(i)}><b>{String.fromCharCode(65+i)}</b>{option}</button>
        )}</div>
        <button className="onboarding-primary" disabled={selected === null} onClick={next}>Continuar →</button>
      </> : <div className="onboarding-result">
        <span>SEU PONTO DE PARTIDA</span><div className="onboarding-orb">✦</div><h1>{result[1]}</h1><strong>{result[2]}</strong>
        <p>O SpeakFlow usará este nível para ajustar vocabulário, complexidade, perguntas e feedback. Você poderá alterá-lo depois.</p>
        {saveError && <p role="alert">{saveError}</p>}
        <button className="onboarding-primary" disabled={saving} onClick={finish}>{saving ? "Personalizando..." : "Começar minha jornada →"}</button>
      </div>}
    </section>
  </main>;
}

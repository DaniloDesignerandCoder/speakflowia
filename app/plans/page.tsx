"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./plans.css";
import { supabase } from "../lib/supabase";
import { SPEAKFLOW_PLAN_LIMITS } from "../lib/entitlements";
import { ArrowLeft, Check, BrainCircuit, Headphones, Mic2, TrendingUp, BookOpenText } from "lucide-react";

const freePlan = SPEAKFLOW_PLAN_LIMITS.free;
const proPlan = SPEAKFLOW_PLAN_LIMITS.pro;

const proFeatures = [
  { icon: BrainCircuit, title: "Coach IA ampliado", text: `Até ${proPlan.coachMonthlyLimit.toLocaleString("pt-BR")} interações mensais` },
  { icon: Mic2, title: "Labs completos", text: "Vocabulary e Pronunciation sem a experiência reduzida do Free" },
  { icon: Headphones, title: "Voz neural SpeakFlow", text: `Até ${proPlan.voiceCharacterMonthlyLimit.toLocaleString("pt-BR")} caracteres mensais` },
  { icon: TrendingUp, title: "Evolução adaptativa", text: "Plano de aprendizado e histórico completo de progresso" },
];

const freeFeatures = [
  `Até ${freePlan.coachMonthlyLimit.toLocaleString("pt-BR")} interações mensais com o Coach`,
  "Acesso essencial aos Labs",
  `Até ${freePlan.voiceCharacterMonthlyLimit.toLocaleString("pt-BR")} caracteres mensais de voz neural SpeakFlow`,
  "Progresso essencial vinculado à sua conta",
];

export default function PlansPage() {
  const router = useRouter();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");
  const [hasActivePro, setHasActivePro] = useState(false);
  const [activeCore, setActiveCore] = useState(0);
  const proCardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    async function loadPlanStatus() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.rpc("get_account_access");
      if (error) return;

      const access = Array.isArray(data) ? data[0] : data;
      setHasActivePro(access?.effective_plan === "pro");
    }

    const billing = new URLSearchParams(window.location.search).get("billing");

    if (billing === "canceled") {
      setBillingMessage("Assinatura cancelada. Nenhuma alteração foi feita no seu plano.");
      loadPlanStatus();
      return;
    }

    if (billing === "success") {
      setBillingMessage("Pagamento recebido. Estamos confirmando a ativação do SpeakFlow Pro...");
      let attempts = 0;
      const checkActivation = async () => {
        attempts += 1;
        await loadPlanStatus();
        const { data } = await supabase.rpc("get_account_access");
        const access = Array.isArray(data) ? data[0] : data;
        if (access?.effective_plan === "pro") {
          setHasActivePro(true);
          setBillingMessage("SpeakFlow Pro ativado com sucesso.");
          return;
        }
        if (attempts < 5) window.setTimeout(checkActivation, 1500);
        else setBillingMessage("Pagamento recebido. A ativação do Pro pode levar alguns instantes.");
      };
      checkActivation();
      return;
    }

    loadPlanStatus();
  }, []);

  useEffect(() => {
    const card = proCardRef.current;
    if (!card) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      card.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        card.classList.add("is-visible");
        observer.disconnect();
      }
    }, { threshold: 0.22 });
    observer.observe(card);

    let frame = 0;
    const updatePointer = (clientX: number, clientY: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
        card.style.setProperty("--pro-x", `${x}%`);
        card.style.setProperty("--pro-y", `${y}%`);
        card.style.setProperty("--pro-tilt-x", `${((50 - y) / 50) * 1.15}deg`);
        card.style.setProperty("--pro-tilt-y", `${((x - 50) / 50) * 1.15}deg`);
      });
    };
    const resetPointer = () => {
      card.style.setProperty("--pro-x", "78%");
      card.style.setProperty("--pro-y", "12%");
      card.style.setProperty("--pro-tilt-x", "0deg");
      card.style.setProperty("--pro-tilt-y", "0deg");
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse") updatePointer(event.clientX, event.clientY);
    };
    card.addEventListener("pointermove", onPointerMove);
    card.addEventListener("pointerleave", resetPointer);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      card.removeEventListener("pointermove", onPointerMove);
      card.removeEventListener("pointerleave", resetPointer);
    };
  }, []);

  async function subscribeToPro() {
    if (isSubscribing || hasActivePro) return;

    setIsSubscribing(true);
    setBillingMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/speakflow-stripe-checkout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 409) {
        setBillingMessage(
          data?.status === "active"
            ? ""
            : "Já existe uma assinatura SpeakFlow Pro em andamento para esta conta."
        );
        if (data?.status === "active") setHasActivePro(true);
        return;
      }

      if (!response.ok || typeof data?.checkoutUrl !== "string") {
        throw new Error("Billing request failed");
      }

      window.location.assign(data.checkoutUrl);
    } catch (error) {
      console.error("Erro ao iniciar assinatura SpeakFlow Pro:", error);
      setBillingMessage("Não foi possível abrir a assinatura agora. Tente novamente em alguns instantes.");
    } finally {
      setIsSubscribing(false);
    }
  }

  return (
    <main className="plans-shell">
      <header className="plans-topbar">
        <button type="button" className="plans-back" onClick={() => router.push("/")}><ArrowLeft /> Início</button>
        <div className="plans-brand">
          <img src="/speakflow-logo.png" alt="SpeakFlow" />
          <div><strong>Speak<span>Flow</span></strong><small>PLANOS</small></div>
        </div>
        <div className="plans-topbar-spacer" aria-hidden="true" />
      </header>

      <section className="plans-hero">
        <span>SPEAKFLOW MEMBERSHIP</span>
        <h1>Escolha como você quer<br/><em>evoluir seu inglês.</em></h1>
        <p>Comece gratuitamente e evolua para a experiência completa quando estiver pronto.</p>
      </section>

      <section className="plans-grid" aria-label="Planos SpeakFlow">
        <article className="plans-card plans-free">
          <div className="plans-free-mark" aria-hidden="true"><span><img src="/speakflow-logo.png" alt="" /></span></div>
          <div className="plans-card-head"><span>FREE</span><h2>SpeakFlow Free</h2><p>Para começar sua jornada e conhecer a experiência SpeakFlow.</p></div>
          <div className="plans-price"><strong>R$ 0</strong><span>/ para começar</span></div>
          <ul>{freeFeatures.map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul>
          {hasActivePro ? <div className="plans-secondary" aria-label="Plano Free disponível">Plano Free</div> : <button type="button" className="plans-secondary" onClick={() => router.push("/coach")}>Continuar no Free</button>}
        </article>

        <article ref={proCardRef} className="plans-card plans-pro">
          <div className="plans-pro-aura" aria-hidden="true" /><div className="plans-pro-orbit" aria-hidden="true" /><div className="plans-pro-energy" aria-hidden="true" />
          <div className="plans-pro-label">EXPERIÊNCIA COMPLETA</div>
          <div className="plans-card-head plans-pro-head"><span>SPEAKFLOW PRO</span><h2>Desbloqueie seu próximo nível.</h2><p>Uma experiência mais completa, adaptativa e contínua para transformar prática em evolução.</p></div>
          <div className="plans-pro-price-row">
            <div className="plans-price"><strong><small>R$</small> 35,99</strong><span>/ mês</span></div>
            <div className="plans-pro-status"><i /> Acesso premium</div>
          </div>
          <div className="plans-neural" aria-label="Ecossistema SpeakFlow Pro">
            <div className="plans-neural-stage">
              <svg className="plans-neural-lines" viewBox="0 0 400 220" aria-hidden="true">
                <path d="M200 110 L70 48" /><path d="M200 110 L330 48" /><path d="M200 110 L70 172" /><path d="M200 110 L330 172" />
              </svg>
              <button type="button" className={`plans-neural-node node-coach ${activeCore === 0 ? "is-active" : ""}`} onClick={() => setActiveCore(0)}><BrainCircuit /><span>Coach</span></button>
              <button type="button" className={`plans-neural-node node-pronunciation ${activeCore === 1 ? "is-active" : ""}`} onClick={() => setActiveCore(1)}><Mic2 /><span>Pronúncia</span></button>
              <button type="button" className={`plans-neural-node node-vocabulary ${activeCore === 2 ? "is-active" : ""}`} onClick={() => setActiveCore(2)}><BookOpenText /><span>Vocabulário</span></button>
              <button type="button" className={`plans-neural-node node-music ${activeCore === 3 ? "is-active" : ""}`} onClick={() => setActiveCore(3)}><Headphones /><span>MusicLab</span></button>
              <div className="plans-neural-core"><img src="/speakflow-logo.png" alt="SpeakFlow" /><span>PRO</span><i /></div>
            </div>
            <div className="plans-neural-caption" aria-live="polite">
              <span>0{activeCore + 1}</span><div><strong>{["Converse com inteligência", "Refine sua fala", "Expanda seu repertório", "Aprenda com música"][activeCore]}</strong><p>{["Prática guiada pelo Coach com contexto contínuo.", "Treinos direcionados para desenvolver clareza e confiança.", "Vocabulário conectado a situações que fazem sentido para você.", "Transforme música em uma experiência ativa de aprendizado."][activeCore]}</p></div>
            </div>
          </div>
          <div className="plans-unlock-title">O que você desbloqueia</div>
          <div className="plans-pro-features">
            {proFeatures.map(({ icon: Icon, title, text }) => (
              <div className="plans-pro-feature" key={title}><span><Icon /></span><div><strong>{title}</strong><p>{text}</p></div></div>
            ))}
          </div>
          <button type="button" className="plans-primary" onClick={subscribeToPro} disabled={isSubscribing || hasActivePro} aria-busy={isSubscribing}>
            {hasActivePro ? "SpeakFlow Pro ativo" : isSubscribing ? "Abrindo assinatura..." : "Assinar SpeakFlow Pro"}
          </button>
          <p className="plans-safe-note"><Check /> Sua experiência Pro está pronta para acompanhar sua evolução.</p>
          {billingMessage && <p className="plans-billing-message" role="status">{billingMessage}</p>}
        </article>
      </section>

      <section className="plans-journey" aria-label="Jornada SpeakFlow">
        <div className="plans-journey-line" aria-hidden="true"><i /><i /><i /></div>
        <article><span>01</span><strong>Pratique</strong><p>Entre em contato com o inglês todos os dias no seu ritmo.</p></article>
        <article><span>02</span><strong>Conecte</strong><p>Coach, Labs e MusicLab trabalham como partes da mesma jornada.</p></article>
        <article><span>03</span><strong>Evolua</strong><p>Seu aprendizado ganha continuidade conforme você avança.</p></article>
      </section>
    </main>
  );
}

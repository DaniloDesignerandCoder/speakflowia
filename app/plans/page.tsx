"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./plans.css";
import { supabase } from "../lib/supabase";
import { SPEAKFLOW_PLAN_LIMITS } from "../lib/entitlements";
import { ArrowLeft, Check } from "lucide-react";

const freePlan = SPEAKFLOW_PLAN_LIMITS.free;
const proPlan = SPEAKFLOW_PLAN_LIMITS.pro;

const proFeatures = [
  `Até ${proPlan.coachMonthlyLimit.toLocaleString("pt-BR")} interações mensais com o Coach`,
  "Vocabulary Lab e Pronunciation Lab completos",
  `Até ${proPlan.voiceCharacterMonthlyLimit.toLocaleString("pt-BR")} caracteres mensais de voz neural SpeakFlow`,
  "Aprendizado adaptativo e histórico completo",
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

  useEffect(() => {
    async function loadPlanStatus() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("entitlements")
        .select("plan, subscription_status, current_period_end")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const periodIsValid = !data?.current_period_end || new Date(data.current_period_end).getTime() > Date.now();
      setHasActivePro(data?.plan === "pro" && data?.subscription_status === "active" && periodIsValid);
    }

    loadPlanStatus();
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
        <article className="plans-card">
          <div className="plans-card-head"><span>FREE</span><h2>SpeakFlow Free</h2><p>Para começar sua jornada e conhecer a experiência SpeakFlow.</p></div>
          <div className="plans-price"><strong>R$ 0</strong><span>/ para começar</span></div>
          <ul>{freeFeatures.map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul>
          <button type="button" className="plans-secondary" onClick={() => router.push("/coach")}>Continuar no Free</button>
        </article>

        <article className="plans-card plans-pro">
          <div className="plans-pro-label">EXPERIÊNCIA COMPLETA</div>
          <div className="plans-card-head"><span>PRO</span><h2>SpeakFlow Pro</h2><p>Para transformar prática constante em evolução contínua.</p></div>
          <div className="plans-price"><strong>R$ 35,99</strong><span>/ mês</span></div>
          <ul>{proFeatures.map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul>
          <button type="button" className="plans-primary" onClick={subscribeToPro} disabled={isSubscribing || hasActivePro} aria-busy={isSubscribing}>
            {hasActivePro ? "SpeakFlow Pro ativo" : isSubscribing ? "Abrindo assinatura..." : "Assinar SpeakFlow Pro"}
          </button>
          {billingMessage && <p className="plans-billing-message" role="status">{billingMessage}</p>}
          <small className="plans-safe-note">A ativação será confirmada com segurança pelo sistema de cobrança. Esta página não concede acesso Pro.</small>
        </article>
      </section>

      <section className="plans-trust">
        <div><span>01</span><strong>Comece no seu ritmo</strong><p>O plano gratuito mantém uma porta de entrada simples para o SpeakFlow.</p></div>
        <div><span>02</span><strong>Upgrade seguro</strong><p>O acesso Pro só será liberado após confirmação do pagamento pelo backend.</p></div>
        <div><span>03</span><strong>Uma conta, uma jornada</strong><p>Seu aprendizado permanece associado à sua identidade SpeakFlow.</p></div>
      </section>
    </main>
  );
}

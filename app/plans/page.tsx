"use client";

import { useRouter } from "next/navigation";
import "./plans.css";

const proFeatures = [
  "Coach com experiência completa",
  "Vocabulary Lab e Pronunciation Lab",
  "Voz neural SpeakFlow",
  "Aprendizado adaptativo e histórico completo",
];

export default function PlansPage() {
  const router = useRouter();

  return (
    <main className="plans-shell">
      <header className="plans-topbar">
        <button type="button" className="plans-back" onClick={() => router.push("/")}>← Início</button>
        <div className="plans-brand">
          <img src="/speakflow-logo.png" alt="SpeakFlow" />
          <div><strong>Speak<span>Flow</span></strong><small>PLANOS</small></div>
        </div>
        <button type="button" className="plans-account" onClick={() => router.push("/settings")}>Minha conta</button>
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
          <ul>
            <li>✓ Acesso inicial ao Coach</li>
            <li>✓ Experiência de aprendizado SpeakFlow</li>
            <li>✓ Progresso vinculado à sua conta</li>
          </ul>
          <button type="button" className="plans-secondary" onClick={() => router.push("/coach")}>Continuar no Free</button>
        </article>

        <article className="plans-card plans-pro">
          <div className="plans-pro-label">EXPERIÊNCIA COMPLETA</div>
          <div className="plans-card-head"><span>PRO</span><h2>SpeakFlow Pro</h2><p>Para transformar prática constante em evolução contínua.</p></div>
          <div className="plans-price"><strong>R$ 35,99</strong><span>/ mês</span></div>
          <ul>{proFeatures.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
          <button type="button" className="plans-primary" disabled aria-disabled="true">Assinatura em preparação</button>
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

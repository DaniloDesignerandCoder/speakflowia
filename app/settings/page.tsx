"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function SettingsPage(){
  const router=useRouter();
  const [userId,setUserId]=useState("");
  const [email,setEmail]=useState("");
  const [learningGoal,setLearningGoal]=useState("conversation");
  const [correctionStyle,setCorrectionStyle]=useState("balanced");
  const [conversationPace,setConversationPace]=useState("natural");
  const [level,setLevel]=useState("intermediate");
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);
  const [theme,setTheme]=useState<"dark"|"light"|"system">("dark");

  useEffect(()=>{const saved=(localStorage.getItem("speakflow-theme")||"dark") as "dark"|"light"|"system";setTheme(saved);(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){router.replace("/login");return;}
    setUserId(session.user.id);setEmail(session.user.email??"");
    const {data}=await supabase.from("profiles").select("preferred_level, learning_goal, correction_style, conversation_pace").eq("id",session.user.id).maybeSingle();
    if(data){setLevel(data.preferred_level||"intermediate");setLearningGoal(data.learning_goal||"conversation");setCorrectionStyle(data.correction_style||"balanced");setConversationPace(data.conversation_pace||"natural");}
    setLoading(false);
  })();},[router]);

  async function saveLearning(){
    if(!userId)return;setSaving(true);setMessage("");
    const {error}=await supabase.from("profiles").update({preferred_level:level,learning_goal:learningGoal,correction_style:correctionStyle,conversation_pace:conversationPace}).eq("id",userId);
    setMessage(error?"Não foi possível salvar agora.":"✓ Configurações aplicadas ao seu Coach");
    setSaving(false);window.setTimeout(()=>setMessage(""),3500);
  }

  function applyTheme(value:"dark"|"light"|"system"){
    setTheme(value);localStorage.setItem("speakflow-theme",value);
    const resolved=value==="system"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):value;
    document.documentElement.dataset.theme=resolved;document.documentElement.style.colorScheme=resolved;
  }

  async function signOut(){await supabase.auth.signOut();router.replace("/login");router.refresh();}

  if(loading)return <main className="settings-shell"><p className="settings-loading">Carregando configurações…</p></main>;

  return <main className="settings-shell">
    <aside className="settings-nav">
      <button className="settings-back" onClick={()=>router.push("/")}>← Início</button>
      <div className="settings-brand"><img src="/speakflow-logo.png" alt="SpeakFlow"/><div><strong>Speak<span>Flow</span></strong><small>SETTINGS</small></div></div>
      <nav><a href="#appearance" className="active"><i>◐</i><span>Aparência</span></a><a href="#learning"><i>✦</i><span>Aprendizado</span></a><a href="#account"><i>◎</i><span>Conta</span></a><a href="#privacy"><i>◇</i><span>Privacidade</span></a></nav>
      <div className="settings-nav-foot"><span>PERSONALIZAÇÃO</span><p>Suas escolhas moldam a experiência do Coach.</p></div>
    </aside>

    <section className="settings-main">
      <header><div><span>CONFIGURAÇÕES</span><h1>Seu SpeakFlow.<br/><em>Do seu jeito.</em></h1><p>Ajuste como a inteligência conversa, corrige e evolui com você.</p></div><button onClick={()=>router.push("/profile")}>Ver perfil →</button></header>

      <section id="appearance" className="settings-section">
        <div className="settings-section-title"><span>01</span><div><small>ACCESSIBILITY & APPEARANCE</small><h2>Aparência</h2><p>Escolha o contraste visual mais confortável para usar a SpeakFlow.</p></div></div>
        <div className="settings-theme-picker" role="group" aria-label="Tema da aplicação">
          <button className={theme==="dark"?"selected":""} aria-pressed={theme==="dark"} onClick={()=>applyTheme("dark")}><i className="theme-preview dark"/><span><strong>Escuro</strong><small>Experiência original SpeakFlow</small></span><b>{theme==="dark"?"✓":""}</b></button>
          <button className={theme==="light"?"selected":""} aria-pressed={theme==="light"} onClick={()=>applyTheme("light")}><i className="theme-preview light"/><span><strong>Claro</strong><small>Maior luminosidade e leitura</small></span><b>{theme==="light"?"✓":""}</b></button>
          <button className={theme==="system"?"selected":""} aria-pressed={theme==="system"} onClick={()=>applyTheme("system")}><i className="theme-preview system"/><span><strong>Sistema</strong><small>Acompanha seu dispositivo</small></span><b>{theme==="system"?"✓":""}</b></button>
        </div>
      </section>

      <section id="learning" className="settings-section">
        <div className="settings-section-title"><span>02</span><div><small>LEARNING ENGINE</small><h2>Experiência de aprendizado</h2><p>Essas preferências são usadas pelo Coach para adaptar suas sessões.</p></div></div>
        <div className="settings-grid">
          <label><span>OBJETIVO PRINCIPAL</span><strong>O que você quer desenvolver?</strong><select value={learningGoal} onChange={e=>setLearningGoal(e.target.value)}><option value="conversation">Conversação</option><option value="pronunciation">Pronúncia</option><option value="vocabulary">Vocabulário</option><option value="professional">Inglês profissional</option></select></label>
          <label><span>ESTILO DE CORREÇÃO</span><strong>Como o Coach deve intervir?</strong><select value={correctionStyle} onChange={e=>setCorrectionStyle(e.target.value)}><option value="gentle">Suave · menos interrupções</option><option value="balanced">Equilibrado</option><option value="direct">Direto · corrija com frequência</option></select></label>
          <label><span>RITMO DA CONVERSA</span><strong>Velocidade das interações</strong><select value={conversationPace} onChange={e=>setConversationPace(e.target.value)}><option value="slow">Calmo</option><option value="natural">Natural</option><option value="fast">Dinâmico</option></select></label>
          <label><span>NÍVEL DE INGLÊS</span><strong>Base atual de personalização</strong><select value={level} onChange={e=>setLevel(e.target.value)}><option value="beginner">Beginner · Iniciante</option><option value="elementary">Elementary · Básico</option><option value="intermediate">Intermediate · Intermediário</option><option value="upper_intermediate">Upper Intermediate</option><option value="advanced">Advanced · Avançado</option></select></label>
        </div>
        <div className="settings-save-row"><div>{message||"Alterações afetam as próximas experiências do Coach."}</div><button disabled={saving} onClick={saveLearning}>{saving?"Aplicando…":"Salvar configurações"}</button></div>
      </section>

      <section id="account" className="settings-section">
        <div className="settings-section-title"><span>03</span><div><small>ACCOUNT</small><h2>Conta</h2><p>Identidade usada para manter seu histórico e aprendizado sincronizados.</p></div></div>
        <div className="settings-account"><div><span>E-MAIL</span><strong>{email}</strong><small>Conta autenticada no SpeakFlow</small></div><button onClick={()=>router.push("/profile")}>Gerenciar perfil</button></div>
      </section>

      <section id="privacy" className="settings-section">
        <div className="settings-section-title"><span>04</span><div><small>PRIVACY & SESSION</small><h2>Privacidade e sessão</h2><p>Controle básico da sua sessão neste dispositivo.</p></div></div>
        <div className="settings-privacy"><div><strong>Sair deste dispositivo</strong><p>Encerra sua sessão atual. Seu progresso permanece associado à sua conta.</p></div><button onClick={signOut}>Sair da conta</button></div>
      </section>
    </section>
  </main>;
}

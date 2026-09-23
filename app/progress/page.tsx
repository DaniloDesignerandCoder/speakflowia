"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import "./progress.css";

type Progress = { conversations_count:number; total_minutes:number; streak_days:number; last_practice_date:string|null };
type LearningSession = { id?:string; mode:string|null; duration_seconds:number|null; created_at:string };
type LearningInsight = { id?:string; level:string|null; original_text:string|null; corrected_text:string|null; tip:string|null; skill_category:string|null; created_at:string };

const emptyProgress: Progress = { conversations_count:0,total_minutes:0,streak_days:0,last_practice_date:null };

function formatDate(value:string|null){if(!value)return "Ainda não registrada";return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value))}
function formatDuration(seconds:number|null){return `${Math.max(1,Math.round((seconds??0)/60))} min`}

export default function ProgressPage(){
 const router=useRouter();
 const [progress,setProgress]=useState<Progress>(emptyProgress);
 const [sessions,setSessions]=useState<LearningSession[]>([]);
 const [insights,setInsights]=useState<LearningInsight[]>([]);
 const [loading,setLoading]=useState(true);
 const [errorMessage,setErrorMessage]=useState("");

 useEffect(()=>{async function load(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){router.replace("/login");return}
  const [p,s,i]=await Promise.all([
   supabase.from("progress").select("conversations_count, total_minutes, streak_days, last_practice_date").eq("user_id",session.user.id).single(),
   supabase.from("learning_sessions").select("id, mode, duration_seconds, created_at").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(30),
   supabase.from("learning_insights").select("id, level, original_text, corrected_text, tip, skill_category, created_at").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(30)
  ]);
  if(p.data)setProgress(p.data); if(s.data)setSessions(s.data); if(i.data)setInsights(i.data);
  if(p.error||s.error||i.error){console.error("Erro ao carregar progresso:",{progress:p.error,sessions:s.error,insights:i.error});setErrorMessage("Parte dos seus dados não pôde ser carregada agora.")}
  setLoading(false);
 }load()},[router]);

 const skills=useMemo(()=>{const m=new Map<string,number>();insights.forEach(x=>{const c=x.skill_category?.trim()||"Outros";m.set(c,(m.get(c)??0)+1)});return Array.from(m.entries()).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)},[insights]);
 const maxSkill=Math.max(1,...skills.map(x=>x.count));
 const activity=useMemo(()=>{const days=Array.from({length:7},(_,n)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(6-n));return{key:d.toISOString().split("T")[0],label:new Intl.DateTimeFormat("pt-BR",{weekday:"short"}).format(d).replace(".",""),minutes:0}});sessions.forEach(x=>{const k=new Date(x.created_at).toISOString().split("T")[0];const d=days.find(y=>y.key===k);if(d)d.minutes+=Math.max(1,Math.round((x.duration_seconds??0)/60))});return days},[sessions]);
 const maxActivity=Math.max(1,...activity.map(x=>x.minutes));
 const avg=sessions.length?Math.max(1,Math.round(sessions.reduce((a,x)=>a+(x.duration_seconds??0),0)/sessions.length/60)):0;

 return <main className="progress-shell">
  <aside className="progress-sidebar">
   <button className="progress-brand" onClick={()=>router.push("/")}><img src="/speakflow-logo.png" alt="SpeakFlow"/><div><strong>Speak<span>Flow</span></strong><small>AI ENGLISH COACH</small></div></button>
   <nav className="progress-menu"><button onClick={()=>router.push("/")}><span>⌂</span>Início</button><button onClick={()=>router.push("/coach")}><span>✦</span>Coach</button><button className="active"><span>▥</span>Progresso</button></nav>
   <div className="progress-sidebar-footer"><img src="/speakflow-logo.png" alt=""/><div><strong>SpeakFlow</strong><small>Sua evolução, em movimento.</small></div></div>
  </aside>
  <section className="progress-main">
   <header className="progress-topbar"><button className="progress-mobile-brand" onClick={()=>router.push("/")}><img src="/speakflow-logo.png" alt="SpeakFlow"/><strong>Speak<span>Flow</span></strong></button><div className="progress-topbar-spacer"/><span className="progress-live"><i/>Dados sincronizados</span><button className="progress-coach-link" onClick={()=>router.push("/coach")}>Praticar agora <span>→</span></button></header>
   <div className="progress-content">
    <section className="progress-hero"><div><span className="progress-eyebrow">SEU PROGRESSO</span><h1>Sua evolução.<br/><em>Visível.</em></h1><p>Acompanhe sua constância, suas sessões e os insights que o SpeakFlow identifica ao longo da sua prática.</p></div><div className="progress-hero-mark"><div className="progress-orbit"/><img src="/speakflow-logo.png" alt=""/></div></section>
    {loading?<section className="progress-state">Carregando sua jornada...</section>:<>
     {errorMessage&&<div className="progress-alert">{errorMessage}</div>}
     <section className="progress-metrics">
      <article><span>SESSÕES</span><strong>{progress.conversations_count}</strong><small>conversas concluídas</small></article>
      <article><span>TEMPO TOTAL</span><strong>{progress.total_minutes}<b> min</b></strong><small>de prática acumulada</small></article>
      <article><span>SEQUÊNCIA</span><strong>{progress.streak_days}<b> dias</b></strong><small>de constância</small></article>
      <article><span>ÚLTIMA PRÁTICA</span><strong className="metric-date">{formatDate(progress.last_practice_date)}</strong><small>registro mais recente</small></article>
     </section>
     <section className="progress-grid">
      <article className="progress-card"><div className="progress-card-heading"><div><span>ATIVIDADE</span><h2>Últimos 7 dias</h2></div><small>Média: {avg} min/sessão</small></div><div className="activity-chart">{activity.map(d=><div className="activity-day" key={d.key}><div className="activity-track"><div className="activity-bar" style={{height:`${Math.max(d.minutes?12:2,(d.minutes/maxActivity)*100)}%`}}/></div><strong>{d.minutes}</strong><span>{d.label}</span></div>)}</div></article>
      <article className="progress-card"><div className="progress-card-heading"><div><span>SPEAKFLOW SKILLS</span><h2>Foco do aprendizado</h2></div></div>{skills.length?<div className="skills-list">{skills.slice(0,6).map(x=><div className="skill-row" key={x.name}><div><strong>{x.name}</strong><span>{x.count} insight{x.count===1?"":"s"}</span></div><div className="skill-track"><i style={{width:`${x.count/maxSkill*100}%`}}/></div></div>)}</div>:<p className="progress-empty">Suas habilidades aparecerão aqui conforme o Coach gerar novos insights.</p>}</article>
     </section>
     <section className="progress-card progress-insights"><div className="progress-card-heading"><div><span>INSIGHTS RECENTES</span><h2>O que você está aprendendo</h2></div><small>{insights.length} registros recentes</small></div>{insights.length?<div className="insights-grid">{insights.slice(0,6).map((x,n)=><article className="progress-insight" key={x.id??`${x.created_at}-${n}`}><div className="progress-insight-top"><span>{x.skill_category||"Insight"}</span><small>{x.level||"practice"}</small></div>{x.original_text&&<p><b>Você disse</b>{x.original_text}</p>}{x.corrected_text&&<p className="corrected"><b>Forma sugerida</b>{x.corrected_text}</p>}{x.tip&&<div className="progress-tip">✦ {x.tip}</div>}</article>)}</div>:<p className="progress-empty">Conclua novas conversas para construir seu histórico de aprendizado.</p>}</section>
     <section className="progress-card progress-sessions"><div className="progress-card-heading"><div><span>SUA JORNADA</span><h2>Sessões recentes</h2></div></div>{sessions.length?<div className="session-list">{sessions.slice(0,8).map((x,n)=><div className="session-row" key={x.id??`${x.created_at}-${n}`}><span className="session-icon">✦</span><div><strong>{x.mode==="conversation"?"Conversação":x.mode||"Prática"}</strong><small>{formatDate(x.created_at)}</small></div><b>{formatDuration(x.duration_seconds)}</b></div>)}</div>:<p className="progress-empty">Sua primeira sessão concluída aparecerá aqui.</p>}</section>
    </>}
   </div>
  </section>
 </main>
}

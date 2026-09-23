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

 const skills=useMemo(()=>{const normalizeSkill=(value:string|null)=>{const raw=value?.trim().toLowerCase()||"";if(!raw)return "Outros";if(raw.includes("pronun")||raw.includes("pronunciation"))return "Pronúncia";if(raw.includes("gram")||raw.includes("grammar")||raw.includes("past_tense")||raw.includes("past tense")||raw.includes("present_tense")||raw.includes("present tense")||raw.includes("future_tense")||raw.includes("future tense")||raw.includes("verb")||raw.includes("tense"))return "Gramática";if(raw.includes("vocab")||raw.includes("word choice"))return "Vocabulário";if(raw.includes("flu")||raw.includes("fluency"))return "Fluência";if(raw.includes("listen")||raw.includes("compreens"))return "Compreensão";if(raw.includes("speak")||raw.includes("conversation")||raw.includes("conversa"))return "Conversação";return "Outros"};const m=new Map<string,number>();insights.forEach(x=>{const c=normalizeSkill(x.skill_category);m.set(c,(m.get(c)??0)+1)});return Array.from(m.entries()).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)},[insights]);
 const maxSkill=Math.max(1,...skills.map(x=>x.count));
 const skillEvolution=useMemo(()=>{const now=Date.now();const recentCutoff=now-7*24*60*60*1000;const previousCutoff=now-14*24*60*60*1000;const normalize=(value:string|null)=>{const raw=value?.trim().toLowerCase()||"";if(!raw)return "Outros";if(raw.includes("pronun")||raw.includes("pronunciation"))return "Pronúncia";if(raw.includes("gram")||raw.includes("grammar")||raw.includes("past_tense")||raw.includes("past tense")||raw.includes("present_tense")||raw.includes("present tense")||raw.includes("future_tense")||raw.includes("future tense")||raw.includes("verb")||raw.includes("tense"))return "Gramática";if(raw.includes("vocab")||raw.includes("word choice"))return "Vocabulário";if(raw.includes("flu")||raw.includes("fluency"))return "Fluência";if(raw.includes("listen")||raw.includes("compreens"))return "Compreensão";if(raw.includes("speak")||raw.includes("conversation")||raw.includes("conversa"))return "Conversação";return "Outros"};const map=new Map<string,{recent:number;previous:number}>();insights.forEach(x=>{const time=new Date(x.created_at).getTime();const name=normalize(x.skill_category);const entry=map.get(name)??{recent:0,previous:0};if(time>=recentCutoff)entry.recent+=1;else if(time>=previousCutoff)entry.previous+=1;map.set(name,entry)});return map},[insights]);
 const activity=useMemo(()=>{const days=Array.from({length:7},(_,n)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(6-n));return{key:d.toISOString().split("T")[0],label:new Intl.DateTimeFormat("pt-BR",{weekday:"short"}).format(d).replace(".",""),minutes:0}});sessions.forEach(x=>{const k=new Date(x.created_at).toISOString().split("T")[0];const d=days.find(y=>y.key===k);if(d)d.minutes+=(x.duration_seconds??0)/60});days.forEach(d=>{d.minutes=Math.round(d.minutes)});return days},[sessions]);
 const maxActivity=Math.max(1,...activity.map(x=>x.minutes));
 const sessionTotalSeconds=sessions.reduce((sum,x)=>sum+Math.max(0,x.duration_seconds??0),0);
 const sessionTotalMinutes=Math.round(sessionTotalSeconds/60);
 const sessionCount=sessions.length;
 const avg=sessions.length?Math.max(1,Math.round(sessions.reduce((a,x)=>a+(x.duration_seconds??0),0)/sessions.length/60)):0;
 const smartSummary=useMemo(()=>{if(!sessions.length&&!insights.length)return null;const topSkill=skills[0]?.name??null;const recentSessions=sessions.filter(x=>Date.now()-new Date(x.created_at).getTime()<=7*24*60*60*1000).length;const latestInsight=insights[0]??null;let headline="Seu aprendizado está ganhando forma.";if(topSkill)headline=`${topSkill} é o foco mais presente agora.`;let recommendation="Continue praticando para o SpeakFlow identificar novos padrões no seu aprendizado.";if(topSkill==="Gramática")recommendation="Na próxima conversa, pratique frases completas e variações de tempo verbal para reforçar o padrão que apareceu nos seus insights.";else if(topSkill==="Pronúncia")recommendation="Na próxima prática, priorize respostas faladas e repita construções que exigem mais clareza de pronúncia.";else if(topSkill==="Vocabulário")recommendation="Na próxima conversa, tente reutilizar palavras novas em contextos diferentes para ampliar seu repertório ativo.";else if(topSkill==="Fluência")recommendation="Na próxima prática, tente sustentar respostas um pouco mais longas, mantendo o fluxo natural da conversa.";else if(topSkill==="Conversação")recommendation="Na próxima sessão, explore respostas mais completas e perguntas de continuidade para desenvolver a conversação.";return{headline,recentSessions,topSkill,latestTip:latestInsight?.tip??null,recommendation}},[sessions,insights,skills]);

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
      <article><span>SESSÕES</span><strong>{sessionCount}</strong><small>conversas concluídas</small></article>
      <article><span>TEMPO TOTAL</span><strong>{sessionTotalMinutes}<b> min</b></strong><small>de prática acumulada</small></article>
      <article><span>SEQUÊNCIA</span><strong>{progress.streak_days}<b> dias</b></strong><small>de constância</small></article>
      <article><span>ÚLTIMA PRÁTICA</span><strong className="metric-date">{formatDate(progress.last_practice_date)}</strong><small>registro mais recente</small></article>
     </section>
     <section className="progress-grid">
      <article className="progress-card"><div className="progress-card-heading"><div><span>ATIVIDADE</span><h2>Últimos 7 dias</h2></div><small>Média: {avg} min/sessão</small></div><div className="activity-chart">{activity.map(d=><div className="activity-day" key={d.key}><div className="activity-track"><div className="activity-bar" style={{height:`${Math.max(d.minutes?12:2,(d.minutes/maxActivity)*100)}%`}}/></div><strong>{d.minutes}</strong><span>{d.label}</span></div>)}</div></article>
      <article className="progress-card"><div className="progress-card-heading"><div><span>SPEAKFLOW SKILLS</span><h2>Foco do aprendizado</h2></div></div>{skills.length?<div className="skills-list">{skills.slice(0,6).map(x=>{const trend=skillEvolution.get(x.name);const delta=(trend?.recent??0)-(trend?.previous??0);return <div className="skill-row" key={x.name}><div><strong>{x.name}</strong><span>{x.count} insight{x.count===1?"":"s"} · {delta>0?`+${delta} esta semana`:delta<0?`${delta} vs. semana anterior`:"ritmo estável"}</span></div><div className="skill-track"><i style={{width:`${x.count/maxSkill*100}%`}}/></div></div>})}</div>:<p className="progress-empty">Suas habilidades aparecerão aqui conforme o Coach gerar novos insights.</p>}</article>
     </section>
     {smartSummary&&<section className="progress-card progress-smart"><div className="progress-card-heading"><div><span>SPEAKFLOW INTELLIGENCE</span><h2>Resumo inteligente</h2></div><small>Baseado no seu histórico real</small></div><div className="smart-summary-grid"><div className="smart-summary-main"><span>LEITURA ATUAL</span><h3>{smartSummary.headline}</h3><p>Você concluiu {smartSummary.recentSessions} sessão{smartSummary.recentSessions===1?"":"ões"} nos últimos 7 dias{smartSummary.topSkill?` e ${smartSummary.topSkill.toLowerCase()} aparece como seu foco mais recorrente.`:"."}</p></div><div className="smart-summary-next"><span>PRÓXIMO FOCO</span><p>{smartSummary.recommendation}</p>{smartSummary.latestTip&&<small>✦ Insight recente: {smartSummary.latestTip}</small>}</div></div></section>}
     <section className="progress-card progress-insights"><div className="progress-card-heading"><div><span>INSIGHTS RECENTES</span><h2>O que você está aprendendo</h2></div><small>{insights.length} registros recentes</small></div>{insights.length?<div className="insights-grid">{insights.slice(0,6).map((x,n)=><article className="progress-insight" key={x.id??`${x.created_at}-${n}`}><div className="progress-insight-top"><span>{x.skill_category||"Insight"}</span><small>{x.level||"practice"}</small></div>{x.original_text&&<p><b>Você disse</b>{x.original_text}</p>}{x.corrected_text&&<p className="corrected"><b>Forma sugerida</b>{x.corrected_text}</p>}{x.tip&&<div className="progress-tip">✦ {x.tip}</div>}</article>)}</div>:<p className="progress-empty">Conclua novas conversas para construir seu histórico de aprendizado.</p>}</section>
     <section className="progress-card progress-sessions"><div className="progress-card-heading"><div><span>SUA JORNADA</span><h2>Sessões recentes</h2></div></div>{sessions.length?<div className="session-list">{sessions.slice(0,8).map((x,n)=><div className="session-row" key={x.id??`${x.created_at}-${n}`}><span className="session-icon">✦</span><div><strong>{x.mode==="conversation"?"Conversação":x.mode||"Prática"}</strong><small>{formatDate(x.created_at)}</small></div><b>{formatDuration(x.duration_seconds)}</b></div>)}</div>:<p className="progress-empty">Sua primeira sessão concluída aparecerá aqui.</p>}</section>
    </>}
   </div>
  </section>
 </main>
}

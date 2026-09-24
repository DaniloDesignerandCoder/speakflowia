"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import "./vocabulary.css";

type Insight={id?:string;original_text:string|null;corrected_text:string|null;tip:string|null;skill_category:string|null;created_at:string};
function isVocabulary(value:string|null){const v=(value||"").toLowerCase();return v.includes("vocab")||v.includes("word")||v.includes("lex")||v.includes("expression")||v.includes("phrase")}
function focusText(item:Insight){const corrected=(item.corrected_text||"").trim();const original=(item.original_text||"").trim();return corrected||original||"New expression"}

export default function VocabularyPage(){
 const router=useRouter(); const [items,setItems]=useState<Insight[]>([]); const [loading,setLoading]=useState(true); const [active,setActive]=useState(0); const [speaking,setSpeaking]=useState(false);
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace("/login");return}const {data}=await supabase.from("learning_insights").select("id, original_text, corrected_text, tip, skill_category, created_at").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(80);setItems((data||[]).filter(x=>isVocabulary(x.skill_category)));setLoading(false)})()},[router]);
 const unique=useMemo(()=>{const seen=new Set<string>();return items.filter(x=>{const k=focusText(x).toLowerCase();if(seen.has(k))return false;seen.add(k);return true})},[items]); const current=unique[active]||null;
 async function speak(text:string){if(!text||speaking)return;setSpeaking(true);try{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error();const res=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/speakflow-voice`,{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,"Content-Type":"application/json"},body:JSON.stringify({text})});if(!res.ok)throw new Error();const url=URL.createObjectURL(await res.blob());const audio=new Audio(url);const done=()=>{URL.revokeObjectURL(url);setSpeaking(false)};audio.addEventListener("ended",done,{once:true});audio.addEventListener("error",done,{once:true});await audio.play()}catch{setSpeaking(false)}}
 if(loading)return <main className="vocab-shell"><p className="vocab-loading">Preparando seu vocabulário…</p></main>;
 return <main className="vocab-shell"><header className="vocab-top"><button onClick={()=>router.push("/")}>← Início</button><div className="vocab-brand"><img src="/speakflow-logo.png" alt=""/><strong>Speak<span>Flow</span></strong><small>VOCABULARY LAB</small></div><button onClick={()=>router.push("/progress")}>Progresso →</button></header>
 <section className="vocab-hero"><span>PERSONAL VOCABULARY ENGINE</span><h1>Palavras que nasceram<br/><em>do seu inglês.</em></h1><p>O Vocabulary Lab transforma descobertas das suas conversas em material de estudo pessoal.</p><div><strong>{unique.length}</strong><span>itens do seu repertório</span></div></section>
 {unique.length===0?<section className="vocab-empty"><span>SEU VOCABULÁRIO COMEÇA NA CONVERSA</span><h2>Ainda não encontramos palavras para revisar.</h2><p>Converse naturalmente com o Coach. Conforme o SpeakFlow identifica novas palavras e escolhas de vocabulário, elas aparecem aqui.</p><button onClick={()=>router.push("/coach")}>Conversar com o Coach →</button></section>:
 <section className="vocab-workspace"><aside><span>SEU REPERTÓRIO</span>{unique.map((item,i)=><button key={item.id||i} className={i===active?"active":""} onClick={()=>setActive(i)}><strong>{focusText(item)}</strong><small>{new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short"}).format(new Date(item.created_at))}</small></button>)}</aside>
 {current&&<article className="vocab-study"><span>EM ESTUDO</span><h2>{focusText(current)}</h2>{current.original_text&&current.corrected_text&&current.original_text!==current.corrected_text&&<div className="vocab-origin"><small>NA SUA CONVERSA</small><p>{current.original_text}</p></div>}<div className="vocab-note"><small>INSIGHT DO COACH</small><p>{current.tip||"Revise esta expressão e use-a em uma nova frase para consolidar seu aprendizado."}</p></div><div className="vocab-actions"><button onClick={()=>speak(focusText(current))} disabled={speaking}>{speaking?"◉ Reproduzindo…":"🔊 Ouvir com SpeakFlow"}</button><button onClick={()=>router.push("/coach")}>Usar em uma conversa →</button></div></article>}</section>}
 </main>
}
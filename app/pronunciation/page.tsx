"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import "./pronunciation.css";

type Insight={id?:string;original_text:string|null;corrected_text:string|null;tip:string|null;skill_category:string|null;created_at:string};
type Drill={title:string;target:string;focus:string;tip:string};
const drills:Drill[]=[
 {title:"TH · clareza",target:"Think about three things.",focus:"TH",tip:"Mantenha o fluxo de ar suave no som de TH; não transforme o início em T ou F."},
 {title:"R · controle",target:"Really ready for the road.",focus:"R",tip:"Evite encostar a ponta da língua no céu da boca; mantenha o som contínuo."},
 {title:"W × V",target:"We value every victory.",focus:"W / V",tip:"No W, arredonde os lábios. No V, use contato leve entre dentes e lábio inferior."},
 {title:"Ritmo",target:"I would really like to learn.",focus:"STRESS",tip:"Destaque as palavras importantes e deixe as palavras menores mais leves."},
];
function normalize(value:string){return value.toLowerCase().replace(/[^a-z0-9\s']/g,"").replace(/\s+/g," ").trim()}
function similarity(a:string,b:string){const x=normalize(a).split(" ").filter(Boolean),y=normalize(b).split(" ").filter(Boolean);if(!x.length)return 0;const m=Array.from({length:x.length+1},(_,i)=>Array.from({length:y.length+1},(_,j)=>i?j?0:i:j));for(let i=1;i<=x.length;i++)for(let j=1;j<=y.length;j++)m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(x[i-1]===y[j-1]?0:1));return Math.max(0,Math.round((1-m[x.length][y.length]/x.length)*100))}
function isPronunciation(v:string|null){const x=(v||"").toLowerCase();return x.includes("pronun")||x.includes("sound")||x.includes("phon")}

export default function PronunciationPage(){
 const router=useRouter();const [insights,setInsights]=useState<Insight[]>([]);const [loading,setLoading]=useState(true);const [index,setIndex]=useState(0);const [listening,setListening]=useState(false);const [speaking,setSpeaking]=useState(false);const [result,setResult]=useState<{heard:string;score:number}|null>(null);
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace("/login");return}const {data}=await supabase.from("learning_insights").select("id, original_text, corrected_text, tip, skill_category, created_at").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(80);setInsights((data||[]).filter(x=>isPronunciation(x.skill_category)));setLoading(false)})()},[router]);
 const personal=useMemo(()=>insights.map(x=>({title:"Do seu Coach",target:(x.corrected_text||x.original_text||"").trim(),focus:"SEU PADRÃO",tip:x.tip||"Repita com calma e compare o que o reconhecimento entende."})).filter(x=>x.target),[insights]);const lessons=[...personal,...drills];const current=lessons[index%lessons.length];
 async function speak(){if(speaking)return;setSpeaking(true);try{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error();const res=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/speakflow-voice`,{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,"Content-Type":"application/json"},body:JSON.stringify({text:current.target})});if(!res.ok)throw new Error();const url=URL.createObjectURL(await res.blob());const audio=new Audio(url);const done=()=>{URL.revokeObjectURL(url);setSpeaking(false)};audio.addEventListener("ended",done,{once:true});audio.addEventListener("error",done,{once:true});await audio.play()}catch{setSpeaking(false)}}
 function record(){const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!SR){alert("O reconhecimento de voz não está disponível neste navegador.");return}const r=new SR();r.lang="en-US";r.interimResults=false;r.continuous=false;r.onstart=()=>setListening(true);r.onend=()=>setListening(false);r.onerror=()=>setListening(false);r.onresult=(e:any)=>{const heard=e.results[0][0].transcript;setResult({heard,score:similarity(current.target,heard)})};r.start()}
 if(loading)return <main className="pron-shell"><p className="pron-loading">Preparando seu treino de pronúncia…</p></main>;
 return <main className="pron-shell"><header className="pron-top"><button onClick={()=>router.push("/")}>← Início</button><div className="pron-brand"><img src="/speakflow-logo.png" alt=""/><strong>Speak<span>Flow</span></strong><small>PRONUNCIATION LAB</small></div><button onClick={()=>router.push("/progress")}>Progresso →</button></header>
 <section className="pron-hero"><span>SPEECH TRAINING ENGINE</span><h1>Treine o som.<br/><em>Leve para a conversa.</em></h1><p>Prática focada de frases, contrastes e padrões de fala com a voz neural SpeakFlow como modelo.</p><div className="pron-stats"><div><strong>{personal.length}</strong><span>focos pessoais</span></div><div><strong>{drills.length}</strong><span>treinos essenciais</span></div></div></section>
 <section className="pron-workspace"><aside><span>TRILHA DE TREINO</span>{lessons.map((x,i)=><button key={i} className={i===index?"active":""} onClick={()=>{setIndex(i);setResult(null)}}><strong>{x.title}</strong><small>{x.focus}</small></button>)}</aside>
 <article className="pron-study"><div className="pron-focus"><span>FOCO</span><strong>{current.focus}</strong></div><span className="pron-label">OUÇA · REPITA · COMPARE</span><h2>{current.target}</h2><p>{current.tip}</p><div className="pron-actions"><button onClick={speak} disabled={speaking}>{speaking?"◉ Reproduzindo…":"🔊 Ouvir modelo neural"}</button><button className={listening?"recording":""} onClick={record} disabled={listening}>{listening?"● Ouvindo…":"🎙️ Repetir frase"}</button></div>
 {result&&<div className="pron-result"><div><span>RECONHECIDO</span><strong>{result.heard}</strong></div><div><span>CORRESPONDÊNCIA</span><strong>{result.score}%</strong></div><p>Esta pontuação compara as palavras reconhecidas com a frase-alvo; não substitui uma análise fonética completa.</p></div>}
 <button className="pron-next" onClick={()=>{setIndex((index+1)%lessons.length);setResult(null)}}>Próximo treino →</button></article></section>
 </main>
}
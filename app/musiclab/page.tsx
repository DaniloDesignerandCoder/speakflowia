"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import "./musiclab.css";

type Track = {
  id: string; title: string; artist: string; level: string; focus: string; duration: string; mood: string;
  description: string; phrases: { line: string; meaning: string; note: string }[];
};

const tracks: Track[] = [
  { id:"city-lights", title:"City Lights", artist:"SpeakFlow Originals", level:"Beginner", focus:"Everyday English", duration:"6 min", mood:"Night Drive", description:"Uma história curta sobre rotina, cidade e planos.",
    phrases:[
      {line:"I’m walking home under the city lights.",meaning:"Estou voltando para casa sob as luzes da cidade.",note:"Walking home é uma forma natural de dizer que você está indo para casa a pé."},
      {line:"Tomorrow, I’ll take a different road.",meaning:"Amanhã, vou pegar um caminho diferente.",note:"I’ll é a contração de I will, muito comum ao falar de decisões e futuro."},
      {line:"There’s still time to change my mind.",meaning:"Ainda há tempo para mudar de ideia.",note:"Change my mind significa mudar de ideia, não mudar a mente literalmente."}
    ]},
  { id:"new-day", title:"A New Day", artist:"SpeakFlow Originals", level:"Elementary", focus:"Listening & Vocabulary", duration:"7 min", mood:"Morning Flow", description:"Novos começos, hábitos e pequenas decisões do cotidiano.",
    phrases:[
      {line:"I woke up early and opened the window.",meaning:"Acordei cedo e abri a janela.",note:"Woke up é o passado irregular de wake up."},
      {line:"I’m ready to start again.",meaning:"Estou pronto para começar de novo.",note:"Ready to + verbo é uma estrutura frequente para indicar disposição."},
      {line:"One small step can change the day.",meaning:"Um pequeno passo pode mudar o dia.",note:"Can expressa possibilidade ou capacidade, dependendo do contexto."}
    ]},
  { id:"weekend-call", title:"Weekend Call", artist:"SpeakFlow Originals", level:"Intermediate", focus:"Natural Conversation", duration:"8 min", mood:"Late Call", description:"Expressões naturais para combinar planos e conversar sobre o fim de semana.",
    phrases:[
      {line:"Are you free this weekend?",meaning:"Você está livre neste fim de semana?",note:"Uma pergunta curta e natural para descobrir se alguém tem disponibilidade."},
      {line:"I haven’t made any plans yet.",meaning:"Ainda não fiz nenhum plano.",note:"Yet aparece com frequência no fim de frases negativas no present perfect."},
      {line:"Let’s figure something out.",meaning:"Vamos combinar alguma coisa.",note:"Figure something out pode significar encontrar uma solução ou decidir algo."}
    ]}
];

export default function MusicLab() {
  const router = useRouter();
  const [name,setName]=useState("");
  const [selectedId,setSelectedId]=useState(tracks[0].id);
  const [step,setStep]=useState(0);
  const [revealed,setRevealed]=useState(false);
  const [playing,setPlaying]=useState(false);

  useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(!data.session){router.replace("/login");return;} setName(data.session.user.user_metadata?.full_name?.split(" ")[0]??"");});},[router]);

  const track=useMemo(()=>tracks.find(item=>item.id===selectedId)??tracks[0],[selectedId]);
  const phrase=track.phrases[step];
  const progress=((step+1)/track.phrases.length)*100;

  function chooseTrack(id:string){setSelectedId(id);setStep(0);setRevealed(false);setPlaying(false);}
  function movePhrase(direction:number){setStep(current=>(current+direction+track.phrases.length)%track.phrases.length);setRevealed(false);setPlaying(false);}

  async function speak(text:string){
    setPlaying(true);
    try{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session) throw new Error("No active session");
      const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/speakflow-voice`,{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,"Content-Type":"application/json"},body:JSON.stringify({text})});
      if(!response.ok) throw new Error("Neural voice unavailable");
      const blob=await response.blob(); const audioUrl=URL.createObjectURL(blob); const audio=new Audio(audioUrl);
      audio.addEventListener("ended",()=>{URL.revokeObjectURL(audioUrl);setPlaying(false);},{once:true});
      audio.addEventListener("error",()=>setPlaying(false),{once:true});
      await audio.play(); return;
    }catch{
      if(!("speechSynthesis" in window)){setPlaying(false);return;}
      window.speechSynthesis.cancel(); const utterance=new SpeechSynthesisUtterance(text); utterance.lang="en-US"; utterance.rate=.88; utterance.onend=()=>setPlaying(false); utterance.onerror=()=>setPlaying(false); window.speechSynthesis.speak(utterance);
    }
  }

  return <main className={playing?"musiclab-shell is-playing":"musiclab-shell"}>
    <div className="ml-aurora ml-a"/><div className="ml-aurora ml-b"/>
    <header className="musiclab-topbar">
      <button className="musiclab-back" onClick={()=>router.push("/")} aria-label="Voltar">←</button>
      <div className="musiclab-brand"><img src="/speakflow-logo.png" alt="SpeakFlow"/><div><strong>MusicLab<span>™</span></strong><small>BY SPEAKFLOW</small></div></div>
      <div className="musiclab-user">{name?name:"SpeakFlow"} <i/></div>
    </header>

    <section className="ml-stage">
      <div className="ml-stage-copy">
        <span className="ml-kicker">IMMERSIVE ENGLISH STUDIO</span>
        <h1>Não estude uma frase.<br/><em>Entre nela.</em></h1>
        <p>Escute, perceba o ritmo e descubra o inglês dentro do contexto. Cada faixa é um pequeno ambiente de aprendizagem.</p>
        <div className="ml-journey"><b>LISTEN</b><i/><span>DISCOVER</span><i/><span>SHADOW</span></div>
      </div>

      <div className="ml-player">
        <div className="ml-orbit"><div className="ml-disc"><img src="/speakflow-logo.png" alt=""/></div></div>
        <div className="ml-player-copy"><span>{track.mood}</span><h2>{track.title}</h2><p>{track.artist}</p></div>
        <div className="ml-spectrum" aria-hidden="true">{Array.from({length:34}).map((_,i)=><i key={i}/>)}</div>
        <div className="ml-timeline"><span style={{width:`${progress}%`}}/></div>
        <div className="ml-controls">
          <button onClick={()=>movePhrase(-1)} aria-label="Anterior">‹</button>
          <button className="ml-play" onClick={()=>speak(phrase.line)} aria-label="Ouvir frase">{playing?"Ⅱ":"▶"}</button>
          <button onClick={()=>movePhrase(1)} aria-label="Próxima">›</button>
        </div>
        <div className="ml-player-meta"><span>{step+1}/{track.phrases.length}</span><span>{track.level}</span><span>{track.duration}</span></div>
      </div>
    </section>

    <section className="ml-workspace">
      <aside className="ml-library">
        <div className="ml-label"><span>SESSIONS</span><small>Escolha uma atmosfera</small></div>
        {tracks.map((item,index)=><button key={item.id} className={selectedId===item.id?"ml-track active":"ml-track"} onClick={()=>chooseTrack(item.id)}>
          <span>0{index+1}</span><div><strong>{item.title}</strong><small>{item.mood} · {item.focus}</small></div><b>↗</b>
        </button>)}
      </aside>

      <div className="ml-focus">
        <div className="ml-focus-head"><div><span>NOW LISTENING</span><small>{track.focus}</small></div><b>{String(step+1).padStart(2,"0")}</b></div>
        <div className="ml-phrase">
          <div className={playing?"ml-pulse active":"ml-pulse"}><i/><i/><i/><i/><i/></div>
          <blockquote>{phrase.line}</blockquote>
          <button className="ml-hear" onClick={()=>speak(phrase.line)}>{playing?"Reproduzindo…":"Ouvir novamente"}</button>
        </div>
        <div className="ml-discovery">
          <button onClick={()=>setRevealed(v=>!v)}><span>{revealed?"FECHAR CAMADA":"DESCOBRIR A FRASE"}</span><b>{revealed?"−":"+"}</b></button>
          {revealed&&<div className="ml-discovery-content"><div><span>SENTIDO</span><strong>{phrase.meaning}</strong></div><div><span>POR DENTRO DO INGLÊS</span><p>{phrase.note}</p></div></div>}
        </div>
        <button className="ml-next" onClick={()=>movePhrase(1)}><span>Continuar a sessão</span><b>→</b></button>
      </div>
    </section>

    <footer className="musiclab-footer"><img src="/speakflow-logo.png" alt=""/><p>MusicLab™ · uma experiência SpeakFlow</p><span>LISTEN · FEEL · SPEAK</span></footer>
  </main>;
}

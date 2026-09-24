"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import {ArrowLeft, Check, LoaderCircle, Mic2, Pause, Play, Volume2 } from "lucide-react";
import * as THREE from "three";
import "./musiclab.css";
import { approvedMusicCatalog, attributionFor, type MusicTrack } from "./catalog";

const originalTracks: MusicTrack[] = [
  { catalogStatus:"original", id:"city-lights", title:"City Lights", artist:"SpeakFlow Originals", level:"Beginner", focus:"Everyday English", duration:"6 min", mood:"Night Drive", description:"Uma história curta sobre rotina, cidade e planos.",
    phrases:[
      {line:"I’m walking home under the city lights.",meaning:"Estou voltando para casa sob as luzes da cidade.",note:"Walking home é uma forma natural de dizer que você está indo para casa a pé."},
      {line:"Tomorrow, I’ll take a different road.",meaning:"Amanhã, vou pegar um caminho diferente.",note:"I’ll é a contração de I will, muito comum ao falar de decisões e futuro."},
      {line:"There’s still time to change my mind.",meaning:"Ainda há tempo para mudar de ideia.",note:"Change my mind significa mudar de ideia, não mudar a mente literalmente."}
    ]},
  { catalogStatus:"original", id:"new-day", title:"A New Day", artist:"SpeakFlow Originals", level:"Elementary", focus:"Listening & Vocabulary", duration:"7 min", mood:"Morning Flow", description:"Novos começos, hábitos e pequenas decisões do cotidiano.",
    phrases:[
      {line:"I woke up early and opened the window.",meaning:"Acordei cedo e abri a janela.",note:"Woke up é o passado irregular de wake up."},
      {line:"I’m ready to start again.",meaning:"Estou pronto para começar de novo.",note:"Ready to + verbo é uma estrutura frequente para indicar disposição."},
      {line:"One small step can change the day.",meaning:"Um pequeno passo pode mudar o dia.",note:"Can expressa possibilidade ou capacidade, dependendo do contexto."}
    ]},
  { catalogStatus:"original", id:"weekend-call", title:"Weekend Call", artist:"SpeakFlow Originals", level:"Intermediate", focus:"Natural Conversation", duration:"8 min", mood:"Late Call", description:"Expressões naturais para combinar planos e conversar sobre o fim de semana.",
    phrases:[
      {line:"Are you free this weekend?",meaning:"Você está livre neste fim de semana?",note:"Uma pergunta curta e natural para descobrir se alguém tem disponibilidade."},
      {line:"I haven’t made any plans yet.",meaning:"Ainda não fiz nenhum plano.",note:"Yet aparece com frequência no fim de frases negativas no present perfect."},
      {line:"Let’s figure something out.",meaning:"Vamos combinar alguma coisa.",note:"Figure something out pode significar encontrar uma solução ou decidir algo."}
    ]}
];

const playableLicensedTracks = approvedMusicCatalog.filter(track=>track.audioUrl && track.phrases.length > 0);
const tracks: MusicTrack[] = [...originalTracks, ...playableLicensedTracks];

export default function MusicLab() {
  const router = useRouter();
  const [name,setName]=useState("");
  const [selectedId,setSelectedId]=useState(tracks[0].id);
  const [step,setStep]=useState(0);
  const [revealed,setRevealed]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [audioCurrentTime,setAudioCurrentTime]=useState(0);
  const [audioDuration,setAudioDuration]=useState(0);
  const [audioError,setAudioError]=useState("");
  const [shadowPhase,setShadowPhase]=useState<"idle"|"model"|"speak"|"result">("idle");
  const [shadowListening,setShadowListening]=useState(false);
  const [shadowResult,setShadowResult]=useState<{heard:string;score:number}|null>(null);
  const [shadowSaved,setShadowSaved]=useState(false);
  const [sessionAttempts,setSessionAttempts]=useState<{phrase:string;score:number}[]>([]);
  const [sessionComplete,setSessionComplete]=useState(false);
  const [sessionSaving,setSessionSaving]=useState(false);
  const [adaptiveCue,setAdaptiveCue]=useState<{title:string;detail:string}|null>(null);
  const [adaptiveMode,setAdaptiveMode]=useState<"guided"|"free">("guided");
  const [recommendedPhrase,setRecommendedPhrase]=useState(0);
  const [missionStarted,setMissionStarted]=useState(false);
  const [missionComplete,setMissionComplete]=useState(false);
  const [missionScore,setMissionScore]=useState<number|null>(null);
  const [missionTarget,setMissionTarget]=useState<number|null>(null);
  const [studyTab,setStudyTab]=useState<"message"|"vocabulary"|"patterns"|"listening"|"reflection">("message");
  const [learnedWords,setLearnedWords]=useState<string[]>([]);
  const [studyXp,setStudyXp]=useState(0);
  const [completedStudyTabs,setCompletedStudyTabs]=useState<string[]>([]);
  const [studySaved,setStudySaved]=useState(false);
  const [recallIndex,setRecallIndex]=useState(0);
  const [recallAnswer,setRecallAnswer]=useState<string|null>(null);
  const [recallScore,setRecallScore]=useState(0);
  const [recallComplete,setRecallComplete]=useState(false);
  const [missedWords,setMissedWords]=useState<string[]>([]);
  const [wordMissionIndex,setWordMissionIndex]=useState(0);
  const [wordSpeakListening,setWordSpeakListening]=useState(false);
  const [wordSpeakResult,setWordSpeakResult]=useState<{heard:string;score:number}|null>(null);
  const [sentenceListening,setSentenceListening]=useState(false);
  const [sentenceResult,setSentenceResult]=useState<{heard:string;hasWord:boolean}|null>(null);
  const [sentenceCoach,setSentenceCoach]=useState<{status:"idle"|"loading"|"ready"|"error";feedback:string;improved:string}>({status:"idle",feedback:"",improved:""});
  const [naturalListening,setNaturalListening]=useState(false);
  const [naturalResult,setNaturalResult]=useState<{heard:string;score:number}|null>(null);
  const shellRef=useRef<HTMLElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const webglRef=useRef<HTMLDivElement>(null);
  const audioEnergyRef=useRef(0);
  const audioProgressRef=useRef(0);
  const activeWordRef=useRef(0);
  const trackAudioRef=useRef<HTMLAudioElement|null>(null);
  const audioContextRef=useRef<AudioContext|null>(null);
  const audioAnalyserRef=useRef<AnalyserNode|null>(null);
  const audioRafRef=useRef<number|null>(null);
  const audioTrackIdRef=useRef<string|null>(null);
  const spectrumRef=useRef<HTMLDivElement|null>(null);

  useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(!data.session){router.replace("/login");return;} setName(data.session.user.user_metadata?.full_name?.split(" ")[0]??"");void loadAdaptiveCue();});},[router]);

  useEffect(()=>()=>{ 
    if(audioRafRef.current!==null)cancelAnimationFrame(audioRafRef.current);
    trackAudioRef.current?.pause();
    if(audioContextRef.current)void audioContextRef.current.close();
    audioEnergyRef.current=0;
    audioProgressRef.current=0;
  },[]);

  useEffect(()=>{
    const host=webglRef.current; if(!host) return;
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,100);
    camera.position.set(0,0,8);
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.8)); renderer.setSize(innerWidth,innerHeight);
    renderer.outputColorSpace=THREE.SRGBColorSpace; host.appendChild(renderer.domElement);

    const group=new THREE.Group(); scene.add(group);
    const geo=new THREE.IcosahedronGeometry(2.15,4);
    const mat=new THREE.MeshPhysicalMaterial({color:0x6f79ff,wireframe:true,transparent:true,opacity:.18,roughness:.28,metalness:.25});
    const core=new THREE.Mesh(geo,mat); group.add(core);
    const shell=new THREE.Mesh(new THREE.IcosahedronGeometry(2.42,2),new THREE.MeshBasicMaterial({color:0xa873ff,wireframe:true,transparent:true,opacity:.055}));
    group.add(shell);
    const ringMat=new THREE.MeshBasicMaterial({color:0x8fa0ff,transparent:true,opacity:.13,side:THREE.DoubleSide});
    [2.9,3.35,3.8].forEach((radius,i)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.008,6,180),ringMat.clone());ring.rotation.set(1.1+i*.28,.2+i*.5,i*.65);group.add(ring)});
    const count=900, positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){const radius=3+Math.random()*6,theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);positions[i*3]=radius*Math.sin(phi)*Math.cos(theta);positions[i*3+1]=radius*Math.sin(phi)*Math.sin(theta);positions[i*3+2]=radius*Math.cos(phi)}
    const pgeo=new THREE.BufferGeometry();pgeo.setAttribute("position",new THREE.BufferAttribute(positions,3));
    const points=new THREE.Points(pgeo,new THREE.PointsMaterial({color:0xaeb8ff,size:.018,transparent:true,opacity:.38,sizeAttenuation:true}));scene.add(points);
    const light=new THREE.PointLight(0x7d82ff,8,18);light.position.set(2,2,4);scene.add(light);
    group.position.set(innerWidth<800?0:2.45,0,0); points.position.copy(group.position);
    let mx=0,my=0,raf=0;
    const pointer=(e:PointerEvent)=>{mx=(e.clientX/innerWidth-.5)*2;my=(e.clientY/innerHeight-.5)*2};
    const resize=()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);group.position.x=innerWidth<800?0:2.45;points.position.x=group.position.x};
    const clock=new THREE.Clock();
    const render=()=>{const t=clock.getElapsedTime(),energy=audioEnergyRef.current,speed=playing?.006+energy*.018:.0025;core.rotation.x+=speed;core.rotation.y+=speed*1.4;shell.rotation.y-=speed*.7;group.rotation.z=Math.sin(t*.18)*.08;group.rotation.y+=(mx*.12-group.rotation.y)*.018;group.rotation.x+=(-my*.08-group.rotation.x)*.018;const scale=playing?1+energy*.22+Math.sin(t*7)*.018:1+Math.sin(t*.9)*.012;core.scale.setScalar(scale);(mat as THREE.MeshPhysicalMaterial).opacity=.14+energy*.42;light.intensity=6+energy*22;points.rotation.y+=playing?.0008+energy*.004:.00035;points.rotation.x=Math.sin(t*.08)*.08;renderer.render(scene,camera);raf=requestAnimationFrame(render)};
    addEventListener("pointermove",pointer,{passive:true});addEventListener("resize",resize);render();
    return()=>{cancelAnimationFrame(raf);removeEventListener("pointermove",pointer);removeEventListener("resize",resize);host.removeChild(renderer.domElement);geo.dispose();mat.dispose();pgeo.dispose();renderer.dispose()};
  },[playing]);

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    let raf=0, pointerX=.5, pointerY=.5;
    const dots=Array.from({length:110},(_,i)=>({a:(i/110)*Math.PI*2,r:90+(i%17)*16,z:(i%13)/13,s:.0015+(i%7)*.00025}));
    const resize=()=>{const d=Math.min(window.devicePixelRatio||1,2);canvas.width=innerWidth*d;canvas.height=innerHeight*d;canvas.style.width=innerWidth+"px";canvas.style.height=innerHeight+"px";ctx.setTransform(d,0,0,d,0,0)};
    const pointer=(e:PointerEvent)=>{pointerX=e.clientX/innerWidth;pointerY=e.clientY/innerHeight};
    const draw=(t:number)=>{ctx.clearRect(0,0,innerWidth,innerHeight);const cx=innerWidth*(.68+(pointerX-.5)*.035),cy=innerHeight*(.43+(pointerY-.5)*.025);dots.forEach((p,i)=>{const speed=playing?3.1:1;p.a+=p.s*speed;const depth=.55+p.z*.75;const x=cx+Math.cos(p.a+t*.00005)*p.r*depth;const y=cy+Math.sin(p.a+t*.00004)*p.r*.42*depth;const pulse=playing?.55+.45*Math.sin(t*.008+i):.45;ctx.beginPath();ctx.arc(x,y,Math.max(.55,1.8*p.z),0,Math.PI*2);ctx.fillStyle=`rgba(150,160,255,${.08+p.z*.22*pulse})`;ctx.fill()});raf=requestAnimationFrame(draw)};
    resize();window.addEventListener("resize",resize);window.addEventListener("pointermove",pointer,{passive:true});raf=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);window.removeEventListener("pointermove",pointer)};
  },[playing]);

  const track=useMemo(()=>tracks.find(item=>item.id===selectedId)??tracks[0],[selectedId]);
  const phrase=track.phrases[step];
  const lessonProgress=((step+1)/track.phrases.length)*100;
  const playbackProgress=audioDuration>0?(audioCurrentTime/audioDuration)*100:0;
  const progress=track.audioUrl?playbackProgress:lessonProgress;
  const formatTime=(seconds:number)=>Number.isFinite(seconds)?`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,"0")}`:"0:00";

  function moveLight(e: React.PointerEvent<HTMLElement>){
    const rect=e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx",`${e.clientX-rect.left}px`);
    e.currentTarget.style.setProperty("--my",`${e.clientY-rect.top}px`);
  }

  function stopTrackAudio(resetProgress=true){
    if(audioRafRef.current!==null){cancelAnimationFrame(audioRafRef.current);audioRafRef.current=null;}
    trackAudioRef.current?.pause();
    trackAudioRef.current=null;
    audioTrackIdRef.current=null;
    audioAnalyserRef.current=null;
    if(audioContextRef.current){void audioContextRef.current.close();audioContextRef.current=null;}
    audioEnergyRef.current=0;
    audioProgressRef.current=0;
    shellRef.current?.style.setProperty("--audio-progress","0");
    shellRef.current?.style.setProperty("--audio-energy","0");
    if(resetProgress){setAudioCurrentTime(0);setAudioDuration(0);}
    setPlaying(false);
  }

  function sampleTrackAudio(){
    const audio=trackAudioRef.current;
    const analyser=audioAnalyserRef.current;
    if(!audio||!analyser||audio.paused)return;
    const data=new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let sum=0;
    for(let i=0;i<data.length;i++)sum+=data[i];
    audioEnergyRef.current=sum/(data.length*255);
    const bars=spectrumRef.current?.children;
    if(bars?.length){
      const nyquist=(audioContextRef.current?.sampleRate??44100)/2;
      for(let i=0;i<bars.length;i++){
        const curve=i/(bars.length-1);
        const hz=45+Math.pow(curve,1.75)*11000;
        const bin=Math.min(data.length-1,Math.max(0,Math.round(hz/nyquist*data.length)));
        const start=Math.max(0,bin-1),end=Math.min(data.length-1,bin+2);
        let peak=0;
        for(let j=start;j<=end;j++)peak=Math.max(peak,data[j]);
        const bassWeight=hz<180?1.85:hz<420?1.48:hz<1200?1.2:1.02;
        const raw=(peak/255)*bassWeight;
        const level=Math.min(1,Math.pow(raw,0.62));
        const height=2+level*34;
        const bar=bars[i] as HTMLElement;
        bar.style.height=`${height}px`;
        bar.style.opacity=String(.25+level*.75);
        bar.style.transform=`scaleY(${.88+level*.18})`;
      }
    }
    if(audio.duration&&Number.isFinite(audio.duration)){
      audioProgressRef.current=audio.currentTime/audio.duration;
      setAudioCurrentTime(audio.currentTime);
      setAudioDuration(audio.duration);
      shellRef.current?.style.setProperty("--audio-progress",String(audioProgressRef.current));
      shellRef.current?.style.setProperty("--audio-energy",String(audioEnergyRef.current));
    }
    audioRafRef.current=requestAnimationFrame(sampleTrackAudio);
  }

  function speechScore(target:string,heard:string){
    const clean=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim();
    const expected=clean(target).split(" ").filter(Boolean); const actual=clean(heard).split(" ").filter(Boolean); if(!expected.length)return 0;
    const matrix=Array.from({length:expected.length+1},()=>Array(actual.length+1).fill(0));
    for(let i=0;i<=expected.length;i++)matrix[i][0]=i; for(let j=0;j<=actual.length;j++)matrix[0][j]=j;
    for(let i=1;i<=expected.length;i++)for(let j=1;j<=actual.length;j++){const cost=expected[i-1]===actual[j-1]?0:1;matrix[i][j]=Math.min(matrix[i-1][j]+1,matrix[i][j-1]+1,matrix[i-1][j-1]+cost);}
    return Math.max(0,Math.round((1-matrix[expected.length][actual.length]/expected.length)*100));
  }

  function resetShadow(){setShadowPhase("idle");setShadowListening(false);setShadowResult(null);setShadowSaved(false);}

  function completeStudyLayer(layer:"message"|"vocabulary"|"patterns"|"listening"|"reflection",xp:number){const already=completedStudyTabs.includes(layer);setCompletedStudyTabs(current=>already?current:[...current,layer]);setStudyXp(current=>already?current:current+xp);if(layer==="reflection"&&!already)void saveSongStudyInsight();}

  async function saveSongStudyInsight(){
    if(!track.lesson||studySaved)return;
    try{
      const {data:{session}}=await supabase.auth.getSession(); if(!session)return;
      const vocabulary=track.lesson.vocabulary.filter(item=>learnedWords.includes(item.term)).map(item=>item.term).join(", ");
      const {error}=await supabase.from("learning_insights").insert({user_id:session.user.id,level:track.level.toLowerCase().replace(/\\s+/g,"_"),original_text:`Song Intelligence concluído em ${track.title}`,corrected_text:vocabulary?`Vocabulário explorado: ${vocabulary}`:"Compreensão musical e interpretação praticadas.",tip:"Reutilize o vocabulário e os padrões desta música em frases próprias e em novas sessões de listening.",skill_category:"Vocabulário & Listening · MusicLab"});
      if(error)throw error; setStudySaved(true);
    }catch(error){console.error("Erro ao salvar aprendizado Song Intelligence:",error);}
  }

  function answerRecall(answer:string){
    if(!track.lesson||recallAnswer)return;
    const item=track.lesson.vocabulary[recallIndex];
    const correct=answer===item.term; setRecallAnswer(answer); if(correct)setRecallScore(score=>score+1); else setMissedWords(words=>words.includes(item.term)?words:[...words,item.term]);
  }

  function nextRecall(){
    if(!track.lesson)return;
    if(recallIndex>=track.lesson.vocabulary.length-1){setRecallComplete(true);setStudyXp(xp=>xp+20);void saveRecallInsight();return;}
    setRecallIndex(index=>index+1);setRecallAnswer(null);
  }

  async function saveRecallInsight(){
    if(!track.lesson)return;
    try{
      const {data:{session}}=await supabase.auth.getSession(); if(!session)return;
      const total=track.lesson.vocabulary.length; const missed=missedWords.join(", ");
      const {error}=await supabase.from("learning_insights").insert({user_id:session.user.id,level:track.level.toLowerCase().replace(/\\s+/g,"_"),original_text:`Active Recall · ${track.title}`,corrected_text:missed?`Reforçar: ${missed}`:"Vocabulário recuperado sem erros.",tip:missed?"Priorize estas palavras na próxima sessão e use cada uma em uma frase própria.":"Avance para produção ativa usando o vocabulário em frases próprias.",skill_category:"Memória de Vocabulário · MusicLab"});
      if(error)throw error;
    }catch(error){console.error("Erro ao salvar Active Recall:",error);}
  }

  function practiceRecallWord(){
    if(!track.lesson)return;
    const target=missedWords[wordMissionIndex]; if(!target)return;
    const Recognition=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!Recognition){setAudioError("O reconhecimento de voz não está disponível neste navegador.");return;}
    const recognition=new Recognition(); recognition.lang="en-US"; recognition.interimResults=false; recognition.continuous=false;
    recognition.onstart=()=>{setWordSpeakListening(true);setWordSpeakResult(null);};
    recognition.onresult=(event:any)=>{const heard=event.results[0][0].transcript;setWordSpeakResult({heard,score:speechScore(target,heard)});};
    recognition.onerror=()=>setWordSpeakListening(false); recognition.onend=()=>setWordSpeakListening(false); recognition.start();
  }

  function speakOwnSentence(){
    const target=missedWords[wordMissionIndex]; if(!target)return;
    const Recognition=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!Recognition){setAudioError("O reconhecimento de voz não está disponível neste navegador.");return;}
    const recognition=new Recognition(); recognition.lang="en-US"; recognition.interimResults=false; recognition.continuous=false;
    recognition.onstart=()=>{setSentenceListening(true);setSentenceResult(null);};
    recognition.onresult=(event:any)=>{const heard=String(event.results[0][0].transcript||"").trim();const hasWord=heard.toLowerCase().split(/\s+/).some((part:string)=>part.replace(/[^a-z']/g,"")===target.toLowerCase());setSentenceResult({heard,hasWord});if(hasWord){setStudyXp(xp=>xp+10);void saveSentenceInsight(target,heard);void coachSentence(target,heard);}};
    recognition.onerror=()=>setSentenceListening(false);recognition.onend=()=>setSentenceListening(false);recognition.start();
  }

  async function coachSentence(word:string,sentence:string){
    setSentenceCoach({status:"loading",feedback:"",improved:""});
    try{
      const {data,error}=await supabase.functions.invoke("speakflow-coach",{body:{level:track.level.toLowerCase(),mode:"musiclab",learningGoal:"vocabulary",message:`Give brief English-learning feedback for this learner-created sentence using the target word "${word}": "${sentence}". Reply with JSON only: {"feedback":"one short explanation in Portuguese","improved":"a natural corrected English version"}. Preserve the learner's meaning.`}});
      if(error)throw error;
      const raw=typeof data==="string"?data:(data?.reply??data?.message??data?.response??"");
      let parsed:any=null; if(typeof raw==="string"){try{parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());}catch{}}
      const feedback=parsed?.feedback||data?.feedback||"Frase registrada. Observe clareza, ordem das palavras e uso natural do vocabulário.";
      const improved=parsed?.improved||data?.improved||sentence;
      setSentenceCoach({status:"ready",feedback:String(feedback),improved:String(improved)});
    }catch(error){console.error("Erro no Sentence Coach:",error);setSentenceCoach({status:"error",feedback:"Sua frase foi salva. O feedback avançado estará disponível em uma próxima tentativa.",improved:sentence});}
  }

  function shadowNaturalSentence(){
    const target=sentenceCoach.improved; if(!target)return;
    void speak(target,()=>setTimeout(()=>recordNaturalSentence(target),180),true);
  }

  function recordNaturalSentence(target:string){
    const Recognition=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!Recognition){setAudioError("O reconhecimento de voz não está disponível neste navegador.");return;}
    const recognition=new Recognition(); recognition.lang="en-US"; recognition.interimResults=false; recognition.continuous=false;
    recognition.onstart=()=>{setNaturalListening(true);setNaturalResult(null);};
    recognition.onresult=(event:any)=>{const heard=String(event.results[0][0].transcript||"").trim();const score=speechScore(target,heard);setNaturalResult({heard,score});setSessionAttempts(current=>[...current,{phrase:target,score}]);if(score>=70)void saveNaturalSentenceInsight(target,heard,score);};
    recognition.onerror=()=>setNaturalListening(false);recognition.onend=()=>setNaturalListening(false);recognition.start();
  }

  async function saveNaturalSentenceInsight(target:string,heard:string,score:number){
    try{const {data:{session}}=await supabase.auth.getSession();if(!session)return;const {error}=await supabase.from("learning_insights").insert({user_id:session.user.id,level:track.level.toLowerCase().replace(/\s+/g,"_"),original_text:heard,corrected_text:target,tip:`Você repetiu uma versão natural criada a partir da sua própria frase com ${score}% de correspondência no reconhecimento de fala.`,skill_category:"Fluência Contextual · MusicLab"});if(error)throw error;}catch(error){console.error("Erro ao salvar fluência contextual:",error);}
  }

  async function saveSentenceInsight(word:string,sentence:string){
    try{const {data:{session}}=await supabase.auth.getSession();if(!session)return;const {error}=await supabase.from("learning_insights").insert({user_id:session.user.id,level:track.level.toLowerCase().replace(/\s+/g,"_"),original_text:sentence,corrected_text:sentence,tip:`Você produziu uma frase própria usando “${word}”. Reutilize essa palavra em outro contexto para fortalecer a recuperação ativa.`,skill_category:"Produção de Vocabulário · MusicLab"});if(error)throw error;}catch(error){console.error("Erro ao salvar produção de vocabulário:",error);}
  }

  function advanceWordMission(){setWordMissionIndex(index=>(index+1)%missedWords.length);setWordSpeakResult(null);setSentenceResult(null);setSentenceCoach({status:"idle",feedback:"",improved:""});setNaturalListening(false);setNaturalResult(null);}

  function learnWord(term:string){setLearnedWords(words=>{if(words.includes(term))return words.filter(word=>word!==term);setStudyXp(xp=>xp+5);return [...words,term];});}

  function startMission(){setStep(recommendedPhrase);setRevealed(false);resetShadow();setMissionStarted(true);setMissionComplete(false);setMissionScore(null);setMissionTarget(null);document.querySelector(".ml-focus")?.scrollIntoView({behavior:"smooth",block:"center"});}

  function completeMission(score:number){const target=score>=90?Math.min(98,score+2):score>=70?85:70;setMissionScore(score);setMissionTarget(target);setMissionComplete(true);setMissionStarted(false);}

  function chooseTrack(id:string){
    stopTrackAudio();
    window.speechSynthesis?.cancel();
    setSelectedId(id);
    setStep(0);
    setRevealed(false);
    setAudioError("");
    setMissionStarted(false);setMissionComplete(false);setMissionScore(null);setMissionTarget(null);setStudyTab("message");setLearnedWords([]);setStudyXp(0);setCompletedStudyTabs([]);setStudySaved(false);setRecallIndex(0);setRecallAnswer(null);setRecallScore(0);setRecallComplete(false);setMissedWords([]);setWordMissionIndex(0);setWordSpeakListening(false);setWordSpeakResult(null);setSentenceListening(false);setSentenceResult(null);setSentenceCoach({status:"idle",feedback:"",improved:""});
    resetShadow();
  }

  function movePhrase(direction:number){
    setStep(current=>(current+direction+track.phrases.length)%track.phrases.length);
    setRevealed(false);
    if(!track.audioUrl)setPlaying(false);
    resetShadow();
  }

  async function playLicensedTrack(){
    if(!track.audioUrl)return;
    setAudioError("");
    const currentAudio=trackAudioRef.current;
    if(currentAudio&&audioTrackIdRef.current===track.id){
      if(!currentAudio.paused){
        currentAudio.pause();
        if(audioRafRef.current!==null){cancelAnimationFrame(audioRafRef.current);audioRafRef.current=null;}
        audioEnergyRef.current=0;
        shellRef.current?.style.setProperty("--audio-energy","0");
        setPlaying(false);
        return;
      }
      try{
        await audioContextRef.current?.resume();
        setPlaying(true);
        await currentAudio.play();
        sampleTrackAudio();
      }catch{
        setPlaying(false);
        setAudioError("Não foi possível retomar a faixa. Tente novamente.");
      }
      return;
    }

    stopTrackAudio();
    try{
      const audio=new Audio();
      audio.crossOrigin="anonymous";
      audio.preload="metadata";
      audio.src=track.audioUrl;
      const AudioContextClass=window.AudioContext||(window as typeof window & {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
      const context=new AudioContextClass();
      const source=context.createMediaElementSource(audio);
      const analyser=context.createAnalyser();
      analyser.fftSize=1024;
      analyser.smoothingTimeConstant=.42;
      analyser.minDecibels=-90;
      analyser.maxDecibels=-18;
      source.connect(analyser);
      analyser.connect(context.destination);
      trackAudioRef.current=audio;
      audioTrackIdRef.current=track.id;
      audioContextRef.current=context;
      audioAnalyserRef.current=analyser;
      audio.addEventListener("loadedmetadata",()=>{if(Number.isFinite(audio.duration))setAudioDuration(audio.duration)},{once:true});
      audio.addEventListener("ended",()=>{
        if(audioRafRef.current!==null){cancelAnimationFrame(audioRafRef.current);audioRafRef.current=null;}
        audioEnergyRef.current=0;
        audioProgressRef.current=1;
        shellRef.current?.style.setProperty("--audio-energy","0");
        shellRef.current?.style.setProperty("--audio-progress","1");
        setAudioCurrentTime(audio.duration||0);
        setPlaying(false);
      },{once:true});
      audio.addEventListener("error",()=>{
        stopTrackAudio();
        setAudioError("Não foi possível carregar a gravação licenciada.");
      },{once:true});
      await context.resume();
      setPlaying(true);
      await audio.play();
      sampleTrackAudio();
    }catch{
      stopTrackAudio();
      setAudioError("Não foi possível iniciar a gravação licenciada.");
    }
  }

  async function speak(text:string,onDone?:()=>void,preserveTrack=false){
    if(trackAudioRef.current){
      if(preserveTrack){trackAudioRef.current.pause();if(audioRafRef.current!==null){cancelAnimationFrame(audioRafRef.current);audioRafRef.current=null;}audioEnergyRef.current=0;shellRef.current?.style.setProperty("--audio-energy","0");setPlaying(false);}
      else stopTrackAudio();
    }
    setPlaying(true);
    try{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session) throw new Error("No active session");
      const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/speakflow-voice`,{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,"Content-Type":"application/json"},body:JSON.stringify({text})});
      if(!response.ok) throw new Error("Neural voice unavailable");
      const blob=await response.blob(); const audioUrl=URL.createObjectURL(blob); const audio=new Audio(audioUrl);
      const AudioContextClass=window.AudioContext||(window as typeof window & {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
      const context=new AudioContextClass(); const source=context.createMediaElementSource(audio); const analyser=context.createAnalyser();
      analyser.fftSize=256; analyser.smoothingTimeConstant=.78; source.connect(analyser); analyser.connect(context.destination);
      const data=new Uint8Array(analyser.frequencyBinCount); let audioRaf=0;
      const sample=()=>{analyser.getByteFrequencyData(data);let sum=0;for(let i=0;i<data.length;i++)sum+=data[i];audioEnergyRef.current=sum/(data.length*255);if(audio.duration&&Number.isFinite(audio.duration)){audioProgressRef.current=audio.currentTime/audio.duration;activeWordRef.current=Math.min(phrase.line.split(/\s+/).length-1,Math.floor(audioProgressRef.current*phrase.line.split(/\s+/).length));shellRef.current?.style.setProperty("--audio-progress",String(audioProgressRef.current));shellRef.current?.style.setProperty("--audio-energy",String(audioEnergyRef.current))}audioRaf=requestAnimationFrame(sample)};
      const cleanup=()=>{cancelAnimationFrame(audioRaf);audioEnergyRef.current=0;audioProgressRef.current=0;activeWordRef.current=0;URL.revokeObjectURL(audioUrl);void context.close();setPlaying(false);onDone?.()};
      audio.addEventListener("ended",cleanup,{once:true}); audio.addEventListener("error",cleanup,{once:true});
      await context.resume(); audioRaf=requestAnimationFrame(sample); await audio.play(); return;
    }catch{
      if(!("speechSynthesis" in window)){setPlaying(false);return;}
      window.speechSynthesis.cancel(); const utterance=new SpeechSynthesisUtterance(text); utterance.lang="en-US"; utterance.rate=.88; utterance.onend=()=>{setPlaying(false);onDone?.()}; utterance.onerror=()=>{setPlaying(false);onDone?.()}; window.speechSynthesis.speak(utterance);
    }
  }

  function startShadow(){
    setShadowResult(null); setShadowPhase("model");
    void speak(phrase.line,()=>setShadowPhase("speak"),true);
  }

  async function saveShadowInsight(heard:string,score:number){
    try{
      const {data:{session}}=await supabase.auth.getSession(); if(!session)return;
      const tip=score>=90?"Ótima correspondência. Repita mantendo o mesmo ritmo e naturalidade.":score>=70?"Boa correspondência. Repita prestando atenção às palavras que o reconhecimento não captou.":"Ouça o modelo novamente e repita em blocos curtos, mantendo o ritmo da frase.";
      const {error}=await supabase.from("learning_insights").insert({user_id:session.user.id,level:track.level.toLowerCase().replace(/\s+/g,"_"),original_text:heard,corrected_text:phrase.line,tip,skill_category:"Pronúncia · MusicLab"});
      if(error)throw error; setShadowSaved(true);
    }catch(error){console.error("Erro ao salvar insight do MusicLab:",error);}
  }

  function recordShadow(){
    const Recognition=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!Recognition){setAudioError("O reconhecimento de voz não está disponível neste navegador.");return;}
    const recognition=new Recognition(); recognition.lang="en-US"; recognition.interimResults=false; recognition.continuous=false;
    recognition.onstart=()=>setShadowListening(true);
    recognition.onresult=(event:any)=>{const heard=event.results[0][0].transcript;const score=speechScore(phrase.line,heard);setShadowResult({heard,score});setSessionAttempts(current=>[...current,{phrase:phrase.line,score}]);setShadowPhase("result");if(missionStarted&&step===recommendedPhrase)completeMission(score);void saveShadowInsight(heard,score);};
    recognition.onerror=()=>setShadowListening(false); recognition.onend=()=>setShadowListening(false); recognition.start();
  }

  async function loadAdaptiveCue(){
    try{
      const {data:{session}}=await supabase.auth.getSession(); if(!session)return;
      const [{data:plan},{data:recent}]=await Promise.all([
        supabase.from("learning_plans").select("current_focus, next_milestone, priority_skills").eq("user_id",session.user.id).maybeSingle(),
        supabase.from("learning_insights").select("skill_category, tip").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(5)
      ]);
      const musicInsight=(recent??[]).find(item=>(item.skill_category??"").toLowerCase().includes("musiclab"));
      const detail=musicInsight?.tip||plan?.current_focus||plan?.next_milestone||"Ouça a frase uma vez, depois repita tentando preservar o ritmo natural.";
      const title=musicInsight?"Seu último insight MusicLab":plan?.current_focus?"Seu foco adaptativo":"Foco desta sessão";
      setAdaptiveCue({title,detail});
      const text=`${musicInsight?.tip??""} ${plan?.current_focus??""} ${plan?.priority_skills??""}`.toLowerCase();
      const phraseIndex=text.includes("ritmo")||text.includes("flu")?Math.min(2,track.phrases.length-1):text.includes("vocab")||text.includes("word")?Math.min(1,track.phrases.length-1):0;
      setRecommendedPhrase(phraseIndex);
    }catch(error){console.error("Não foi possível carregar o foco adaptativo do MusicLab:",error);}
  }

  async function finishMusicSession(){
    if(sessionSaving||sessionAttempts.length===0)return; setSessionSaving(true);
    try{
      const {data:{session}}=await supabase.auth.getSession(); if(!session)return;
      const average=Math.round(sessionAttempts.reduce((sum,item)=>sum+item.score,0)/sessionAttempts.length);
      const duration=Math.max(1,Math.round(audioCurrentTime));
      const fallback={summary:`MusicLab · ${track.title}: ${sessionAttempts.length} prática(s) de shadowing, média de correspondência ${average}%.`,skills_practiced:"Listening, Shadowing, Pronúncia",positive_point:average>=80?"Boa correspondência nas frases praticadas.":"Você concluiu práticas de fala dentro do contexto musical.",improvement_point:average>=80?"Continue buscando ritmo e naturalidade.":"Repita as frases com mais calma após ouvir o modelo.",next_recommendation:"Continue no MusicLab e pratique novas frases da faixa."};
      let pedagogical=fallback;
      try{
        const {data,error:coachError}=await supabase.functions.invoke("speakflow-coach",{body:{operation:"session_summary",level:track.level.toLowerCase(),mode:"musiclab",learningGoal:"pronunciation",pronunciationResults:sessionAttempts.map(item=>({target:item.phrase,score:item.score})),feedbacks:sessionAttempts.map(item=>({skill_category:"Pronúncia · MusicLab",original:item.phrase,corrected:item.phrase,tip:`Correspondência reconhecida: ${item.score}%`}))}});
        if(!coachError&&data?.summary&&data?.skills_practiced&&data?.positive_point&&data?.improvement_point&&data?.next_recommendation)pedagogical=data;
      }catch(error){console.error("Resumo adaptativo MusicLab indisponível; usando resumo local.",error);}
      const {error}=await supabase.from("learning_sessions").insert({user_id:session.user.id,mode:"musiclab",duration_seconds:duration,score:average,summary:pedagogical.summary,skills_practiced:pedagogical.skills_practiced,positive_point:pedagogical.positive_point,improvement_point:pedagogical.improvement_point,next_recommendation:pedagogical.next_recommendation});
      if(error)throw error; setSessionComplete(true);
    }catch(error){console.error("Erro ao finalizar sessão MusicLab:",error);}
    finally{setSessionSaving(false);}
  }

  async function returnToMusic(){
    const audio=trackAudioRef.current;
    if(audio&&track.audioUrl){try{await audioContextRef.current?.resume();setPlaying(true);await audio.play();sampleTrackAudio();}catch{setAudioError("Não foi possível retomar a música.");}}
    resetShadow();
  }

  return <main ref={shellRef} onPointerMove={moveLight} className={playing?"musiclab-shell is-playing":"musiclab-shell"}>
    <div ref={webglRef} className="ml-webgl-world" aria-hidden="true"/>
    <canvas ref={canvasRef} className="ml-particle-field" aria-hidden="true"/>
    <div className="ml-cursor-light"/>
    <div className="ml-grid"/>
    <div className="ml-scanline"/>
    <div className="ml-floatwords" aria-hidden="true"><span>LISTEN</span><span>FLOW</span><span>ENGLISH</span><span>RHYTHM</span><span>SPEAK</span></div>
    <div className="ml-aurora ml-a"/><div className="ml-aurora ml-b"/>
    <header className="musiclab-topbar">
      <button className="musiclab-back" onClick={()=>router.push("/")} aria-label="Voltar"><ArrowLeft /></button>
      <div className="musiclab-brand"><img src="/speakflow-logo.png" alt="SpeakFlow"/><div><strong>MusicLab<span>™</span></strong><small>BY SPEAKFLOW</small></div></div>
      <div className="musiclab-user">{name?name:"SpeakFlow"}</div>
    </header>

    <section className="ml-stage">
      <div className="ml-depth-label depth-a">01 / SOUND</div><div className="ml-depth-label depth-b">02 / LANGUAGE</div><div className="ml-depth-label depth-c">03 / VOICE</div>
      <div className="ml-stage-copy">
        <span className="ml-kicker">REAL-TIME LANGUAGE SPACE</span>
        <h1>O inglês não está<br/><em>na tela.</em> Está no espaço.</h1>
        <p>Escute, perceba o ritmo e descubra o inglês dentro do contexto. Cada faixa é um pequeno ambiente de aprendizagem.</p>
        <div className="ml-journey"><b>LISTEN</b><i/><span>DISCOVER</span><i/><span>SHADOW</span></div>
      </div>

      <div className="ml-player-wrap"><div className="ml-spatial-title">SOUND<br/>CORE</div><div className="ml-ring r1"/><div className="ml-ring r2"/><div className="ml-ring r3"/><div className="ml-player">
        <div className="ml-orbit"><div className="ml-disc"><img src="/speakflow-logo.png" alt=""/></div></div>
        <div className="ml-player-copy"><span>{track.mood}</span><h2>{track.title}</h2><p>{track.artist}</p></div>
        <div ref={spectrumRef} className="ml-spectrum" aria-hidden="true">{Array.from({length:24}).map((_,i)=><i key={i}/>)}</div>
        <div className="ml-timeline"><span style={{width:`${progress}%`}}/></div>
        <div className="ml-controls">
          <button onClick={()=>movePhrase(-1)} aria-label="Anterior">Anterior</button>
          <button className="ml-play" onClick={()=>track.audioUrl?playLicensedTrack():speak(phrase.line)} aria-label={track.audioUrl?(playing?"Pausar música":"Reproduzir música"):"Ouvir frase"}>{playing ? <Pause /> : <Play />}</button>
          <button onClick={()=>movePhrase(1)} aria-label="Próxima">Próxima</button>
        </div>
        <div className="ml-player-meta"><span>{track.audioUrl?`${formatTime(audioCurrentTime)} / ${formatTime(audioDuration)}`:`${step+1}/${track.phrases.length}`}</span><span>{track.level}</span><span>{track.duration}</span>{track.catalogStatus==="rights-approved"&&<span>LICENSED · {track.rights?.license}</span>}</div>
        {audioError&&<p className="ml-audio-error" role="alert">{audioError}</p>}
        {track.rights?.attributionRequired&&<div className="ml-attribution" aria-label="Atribuição da música licenciada">
          <span>{track.title} · {track.artist}</span>
          <a href={track.rights.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>
          <a href={track.rights.sourceUrl} target="_blank" rel="noreferrer">{track.rights.sourceName}</a>
        </div>}
      </div></div>
    </section>

    <section className="ml-adaptive-route" aria-label="Rota de prática MusicLab">
      <div className="ml-route-head"><div><span>PERSONAL SESSION</span><strong>{adaptiveMode==="guided"?"Rota guiada pelo seu aprendizado":"Exploração livre"}</strong></div><div className="ml-route-toggle"><button className={adaptiveMode==="guided"?"active":""} onClick={()=>setAdaptiveMode("guided")}>Guiada</button><button className={adaptiveMode==="free"?"active":""} onClick={()=>setAdaptiveMode("free")}>Livre</button></div></div>
      {adaptiveMode==="guided"&&<div className="ml-route-body"><div><span>RECOMENDAÇÃO</span><p>Comece pela frase {recommendedPhrase+1} desta experiência. O SpeakFlow selecionou este ponto a partir do seu foco recente.</p></div><button onClick={startMission}>Ir para prática recomendada</button></div>}
      {adaptiveMode==="free"&&<p className="ml-route-free">Explore a faixa no seu ritmo. Seus resultados continuam alimentando o aprendizado adaptativo.</p>}
    </section>

    {adaptiveMode==="guided"&&missionStarted&&<section className="ml-mission-live"><div><span>PERSONAL MISSION ACTIVE</span><strong>Frase {recommendedPhrase+1} · complete o Shadow Mode</strong></div><p>Ouça o modelo, repita a frase e conclua o resultado para fechar esta missão.</p></section>}
    {missionComplete&&<section className="ml-mission-complete ml-mission-result"><div><span>MISSÃO CONCLUÍDA</span><strong>Prática recomendada concluída.</strong></div><div className="ml-mission-score"><span>RESULTADO</span><strong>{missionScore??0}<b>%</b></strong><i><em style={{width:`${missionScore??0}%`}}/></i></div><div className="ml-mission-next"><span>PRÓXIMO ALVO</span><strong>{missionTarget??70}<b>%</b></strong><small>{(missionScore??0)>=90?"Mantenha a consistência e avance para outra frase.":(missionScore??0)>=70?"Tente superar este resultado mantendo o ritmo natural.":"Ouça o modelo novamente e avance em blocos curtos."}</small></div><button onClick={()=>{setMissionComplete(false);movePhrase(1)}}>Continuar</button></section>}

    <section className="ml-adaptive-cue" aria-label="Foco adaptativo do MusicLab">
      <div><span>SPEAKFLOW ADAPTIVE SIGNAL</span><strong>{adaptiveCue?.title??"Preparando seu foco…"}</strong></div>
      <p>{adaptiveCue?.detail??"O MusicLab está conectando esta sessão ao seu histórico de aprendizado."}</p>
    </section>

    <section className="ml-workspace">
      <aside className="ml-library">
        <div className="ml-label"><span>SESSIONS</span><small>Escolha uma atmosfera</small></div>
        {tracks.map((item,index)=><button key={item.id} className={selectedId===item.id?"ml-track active":"ml-track"} onClick={()=>chooseTrack(item.id)}>
          <span>0{index+1}</span><div><strong>{item.title}</strong><small>{item.mood} · {item.focus}</small></div>
        </button>)}
      </aside>

      <div className="ml-focus"><div className="ml-hud-corner c1"/><div className="ml-hud-corner c2"/><div className="ml-hud-corner c3"/><div className="ml-hud-corner c4"/>
        <div className="ml-focus-head"><div><span>NOW LISTENING</span><small>{track.focus}</small></div><b>{String(step+1).padStart(2,"0")}</b></div>
        <div className="ml-phrase">
          <div className={playing?"ml-pulse active":"ml-pulse"}><i/><i/><i/><i/><i/></div>
          <blockquote className="ml-live-words">{phrase.line.split(/\s+/).map((word,index)=><span key={`${step}-${index}`} className={playing&&index===activeWordRef.current?"active":""}>{word} </span>)}</blockquote>
          <button className="ml-hear" onClick={()=>speak(phrase.line)}>{playing?"Reproduzindo…":"Ouvir novamente"}</button>
        </div>
        <div className="ml-discovery">
          <button onClick={()=>setRevealed(v=>!v)}><span>{revealed?"FECHAR CAMADA":"DESCOBRIR A FRASE"}</span><b>{revealed?"−":"+"}</b></button>
          {revealed&&<div className="ml-discovery-content"><div><span>SENTIDO</span><strong>{phrase.meaning}</strong></div><div><span>POR DENTRO DO INGLÊS</span><p>{phrase.note}</p></div></div>}
        </div>
        {track.lesson&&<section className="ml-song-study">
          <div className="ml-study-head"><span>SONG INTELLIGENCE</span><strong>Entenda o inglês por dentro da música</strong><small>{learnedWords.length}/{track.lesson.vocabulary.length} palavras · {studyXp} XP</small></div><div className="ml-study-progress"><i><em style={{width:`${Math.min(100,(completedStudyTabs.length/5)*100)}%`}}/></i><span>{completedStudyTabs.length}/5 camadas concluídas</span></div>
          <nav className="ml-study-tabs" aria-label="Camadas didáticas">
            <button className={studyTab==="message"?"active":""} onClick={()=>setStudyTab("message")}>Mensagem</button>
            <button className={studyTab==="vocabulary"?"active":""} onClick={()=>setStudyTab("vocabulary")}>Vocabulário</button>
            <button className={studyTab==="patterns"?"active":""} onClick={()=>setStudyTab("patterns")}>Inglês em uso</button>
            <button className={studyTab==="listening"?"active":""} onClick={()=>setStudyTab("listening")}>Listening</button>
            <button className={studyTab==="reflection"?"active":""} onClick={()=>setStudyTab("reflection")}>Interpretação</button>
          </nav>
          <div className="ml-study-stage">
            {studyTab==="message"&&<article><span>MENSAGEM CENTRAL</span><h3>Construa o sentido antes de procurar cada palavra.</h3><p>{track.lesson.centralMessage}</p><button onClick={()=>{completeStudyLayer("message",10);setStudyTab("vocabulary")}}>Explorar vocabulário</button></article>}
            {studyTab==="vocabulary"&&<article><span>VOCABULÁRIO-CHAVE</span><div className="ml-vocab-cards">{track.lesson.vocabulary.map(item=><button key={item.term} className={learnedWords.includes(item.term)?"learned":""} onClick={()=>learnWord(item.term)}><strong>{item.term}</strong><p>{item.meaning}</p><small>{item.usage}</small><em>{learnedWords.includes(item.term)?"EXPLORADA":"TOQUE PARA MARCAR"}</em></button>)}</div>{learnedWords.length===track.lesson.vocabulary.length&&<button className="ml-layer-complete" onClick={()=>{completeStudyLayer("vocabulary",20);setStudyTab("patterns")}}>Concluir vocabulário +20 XP</button>}</article>}
            {studyTab==="patterns"&&<article><span>INGLÊS EM USO</span>{track.lesson.languagePatterns.map(item=><div className="ml-pattern" key={item.pattern}><strong>{item.pattern}</strong><p>{item.explanation}</p><small>{item.example}</small><button onClick={()=>speak(item.example)}><Volume2 /> Ouvir exemplo</button></div>)}<button className="ml-layer-complete" onClick={()=>{completeStudyLayer("patterns",15);setStudyTab("listening")}}>Entendi os padrões +15 XP</button></article>}
            {studyTab==="listening"&&<article><span>MISSÃO DE LISTENING</span><h3>Volte à faixa com uma intenção específica.</h3>{track.lesson.listeningGoals.map((goal,index)=><p className="ml-study-task" key={goal}><b>0{index+1}</b>{goal}</p>)}<button className="ml-layer-complete" onClick={()=>{completeStudyLayer("listening",20);setStudyTab("reflection")}}>Concluir listening +20 XP</button></article>}
            {studyTab==="reflection"&&<article><span>THINK IN ENGLISH</span><h3>Transforme compreensão em produção.</h3>{track.lesson.reflectionPrompts.map((prompt,index)=><div className="ml-reflection-prompt" key={prompt}><b>0{index+1}</b><p>{prompt}</p></div>)}{!completedStudyTabs.includes("reflection")?<button className="ml-layer-complete" onClick={()=>completeStudyLayer("reflection",25)}>Finalizar Song Intelligence +25 XP</button>:<div className="ml-study-finished"><span>SONG INTELLIGENCE COMPLETE</span><strong>{studyXp} XP conquistados nesta experiência</strong><p>Agora teste o que ficou na memória antes de levar esse conhecimento para o Shadow Mode.</p>{studySaved&&<em>Vocabulário e listening adicionados ao seu aprendizado adaptativo</em>}</div>}{!recallComplete?<div className="ml-recall"><div className="ml-recall-head"><span>ACTIVE RECALL</span><strong>{recallIndex+1}/{track.lesson.vocabulary.length}</strong></div><p>Qual palavra corresponde a: <b>{track.lesson.vocabulary[recallIndex].meaning}</b>?</p><div className="ml-recall-options">{track.lesson.vocabulary.map(item=><button key={item.term} disabled={Boolean(recallAnswer)} className={recallAnswer===item.term?(item.term===track.lesson!.vocabulary[recallIndex].term?"correct":"wrong"):""} onClick={()=>answerRecall(item.term)}>{item.term}</button>)}</div>{recallAnswer&&<div className="ml-recall-feedback"><strong>{recallAnswer===track.lesson.vocabulary[recallIndex].term?"Correto":"Tente guardar esta associação"}</strong><small>{track.lesson.vocabulary[recallIndex].usage}</small><button onClick={nextRecall}>{recallIndex===track.lesson.vocabulary.length-1?"Ver resultado":"Próxima palavra"}</button></div>}</div>:<div className="ml-recall-complete"><span>MEMORY CHECK</span><strong>{recallScore}/{track.lesson.vocabulary.length}</strong><p>{recallScore===track.lesson.vocabulary.length?"Excelente retenção inicial. Agora use essas palavras em contexto.":recallScore>=Math.ceil(track.lesson.vocabulary.length*.6)?"Boa retenção. Reforce as palavras que ainda não vieram automaticamente.":"Volte ao vocabulário depois da música e faça uma nova recuperação ativa."}</p>{missedWords.length>0&&<div className="ml-word-mission"><span>NEXT BEST ACTION</span><strong>Transforme a palavra em produção ativa</strong><p>Crie mentalmente uma frase curta em inglês usando <b>{missedWords[wordMissionIndex]}</b>.</p><small>{track.lesson.vocabulary.find(item=>item.term===missedWords[wordMissionIndex])?.usage}</small><div><button onClick={()=>speak(missedWords[wordMissionIndex])}><Volume2 /> Ouvir palavra</button><button onClick={practiceRecallWord} disabled={wordSpeakListening}>{wordSpeakListening ? <><LoaderCircle className="ml-icon-spin" /> Ouvindo…</> : <><Mic2 /> Falar palavra</>}</button><button onClick={advanceWordMission}>Próxima palavra</button></div>{wordSpeakResult&&<div className="ml-word-speak-result"><span>SPEAK CHECK</span><strong>{wordSpeakResult.score}%</strong><p>Reconhecido: “{wordSpeakResult.heard}”</p><small>{wordSpeakResult.score>=90?"Ótima correspondência. Agora leve a palavra para uma frase sua.":wordSpeakResult.score>=70?"Boa correspondência. Ouça novamente e tente manter a palavra clara.":"Ouça o modelo outra vez e repita devagar."}</small>{wordSpeakResult.score>=70&&<button className="ml-create-sentence" onClick={speakOwnSentence} disabled={sentenceListening}>{sentenceListening ? <><LoaderCircle className="ml-icon-spin" /> Ouvindo sua frase…</> : <><Mic2 /> Criar frase com esta palavra</>}</button>}{sentenceResult&&<div className={"ml-sentence-result "+(sentenceResult.hasWord?"success":"retry")}><span>{sentenceResult.hasWord?"ACTIVE PRODUCTION":"TENTE NOVAMENTE"}</span><p>“{sentenceResult.heard}”</p><small>{sentenceResult.hasWord?"A palavra-alvo apareceu na sua frase. +10 XP e produção salva no aprendizado adaptativo.":"A frase foi reconhecida, mas a palavra-alvo não apareceu. Tente outra frase usando-a explicitamente."}</small>{sentenceResult.hasWord&&sentenceCoach.status==="loading"&&<div className="ml-sentence-coach loading"><LoaderCircle className="ml-icon-spin" /> SpeakFlow Coach analisando sua frase…</div>}{sentenceResult.hasWord&&(sentenceCoach.status==="ready"||sentenceCoach.status==="error")&&<div className="ml-sentence-coach"><span>AI LANGUAGE COACH</span><p>{sentenceCoach.feedback}</p><strong>{sentenceCoach.improved}</strong>{sentenceCoach.improved&&sentenceCoach.improved!==sentenceResult.heard&&<><button onClick={()=>speak(sentenceCoach.improved)}><Volume2 /> Ouvir versão natural</button><button onClick={shadowNaturalSentence} disabled={naturalListening}>{naturalListening ? <><LoaderCircle className="ml-icon-spin" /> Ouvindo sua repetição…</> : <><Mic2 /> Ouvir + repetir versão natural</>}</button></>}{naturalResult&&<div className="ml-natural-shadow"><span>CONTEXT SHADOW</span><strong>{naturalResult.score}%</strong><p>“{naturalResult.heard}”</p><small>{naturalResult.score>=90?"Excelente correspondência. A versão natural já está entrando na sua produção.":naturalResult.score>=70?"Boa correspondência. Repita buscando mais ritmo e continuidade.":"Ouça novamente e repita em blocos menores."}</small></div>}</div>}</div>}</div>}</div>}{missedWords.length===0&&<div className="ml-word-mission mastered"><span>NEXT BEST ACTION</span><strong>Vocabulário pronto para produção.</strong><p>Use duas palavras desta sessão em uma frase própria durante sua próxima prática.</p></div>}</div>}</article>}
          </div>
        </section>}
        <div className={"ml-shadow " + (shadowPhase!=="idle"?"active":"")}>
          <div className="ml-shadow-head"><span>SHADOW MODE</span><small>OUÇA · REPITA · VOLTE À MÚSICA</small></div>
          {shadowPhase==="idle"&&<button className="ml-shadow-start" onClick={startShadow}><span>Treinar esta frase com o Coach</span><b><Mic2 /></b></button>}
          {shadowPhase==="model"&&<div className="ml-shadow-state"><span>01 · LISTEN</span><strong>Ouça o modelo do SpeakFlow Coach…</strong></div>}
          {shadowPhase==="speak"&&<div className="ml-shadow-state"><span>02 · SPEAK</span><strong>Agora é sua vez.</strong><button onClick={recordShadow} disabled={shadowListening}>{shadowListening ? <><LoaderCircle className="ml-icon-spin" /> Ouvindo…</> : <><Mic2 /> Repetir frase</>}</button></div>}
          {shadowPhase==="result"&&shadowResult&&<div className="ml-shadow-result"><span>03 · RESULT</span><strong>{shadowResult.score}%</strong><p>Reconhecido: “{shadowResult.heard}”</p><small>Correspondência das palavras reconhecidas com a frase-alvo.</small>{shadowSaved&&<em className="ml-shadow-saved">Aprendizado salvo no seu perfil</em>}<button onClick={returnToMusic}>{track.audioUrl?"Voltar para a música":"Concluir prática"}</button></div>}
        </div>
        <button className="ml-next" onClick={()=>movePhrase(1)}><span>Continuar a sessão</span></button>
        {sessionAttempts.length>0&&<div className="ml-session-finish">
          {!sessionComplete?<><div><span>SESSÃO MUSICLAB</span><strong>{sessionAttempts.length} prática{sessionAttempts.length>1?"s":""} registrada{sessionAttempts.length>1?"s":""}</strong></div><button onClick={finishMusicSession} disabled={sessionSaving}>{sessionSaving?"Salvando…":"Finalizar sessão"}</button></>:<div className="ml-session-complete"><span>SESSÃO CONCLUÍDA</span><strong>Seu progresso MusicLab foi registrado.</strong><button onClick={()=>router.push("/progress")}>Ver meu progresso</button></div>}
        </div>}
      </div>
    </section>

    <footer className="musiclab-footer"><img src="/speakflow-logo.png" alt=""/><p>MusicLab™ · uma experiência SpeakFlow</p><span>{attributionFor(track)??"LISTEN · FEEL · SPEAK"}</span></footer>
  </main>;
}

"use client";

import { useEffect } from "react";

export default function ThemeBootstrap(){
  useEffect(()=>{
    const apply=()=>{
      const saved=localStorage.getItem("speakflow-theme")||"dark";
      const theme=saved==="system"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):saved;
      document.documentElement.dataset.theme=theme;
      document.documentElement.style.colorScheme=theme;
      const textScale=Math.min(130,Math.max(90,Number(localStorage.getItem("speakflow-text-scale")||100)));
      document.documentElement.style.setProperty("--sf-text-scale",String(textScale/100));
      document.documentElement.dataset.reduceMotion=localStorage.getItem("speakflow-reduce-motion")||"system";
    };
    apply();
    const media=window.matchMedia("(prefers-color-scheme: light)");
    const onChange=()=>{if(localStorage.getItem("speakflow-theme")==="system")apply();};
    media.addEventListener?.("change",onChange);
    return()=>media.removeEventListener?.("change",onChange);
  },[]);
  return null;
}

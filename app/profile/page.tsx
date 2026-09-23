"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("Usuário SpeakFlow");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("Intermediate");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const { data } = await supabase.from("profiles")
        .select("full_name, preferred_level")
        .eq("id", session.user.id)
        .maybeSingle();

      const labels: Record<string, string> = {
        beginner: "Beginner · Iniciante",
        elementary: "Elementary · Básico",
        intermediate: "Intermediate · Intermediário",
        upper_intermediate: "Upper Intermediate · Intermediário avançado",
        advanced: "Advanced · Avançado",
      };

      setName(data?.full_name || session.user.user_metadata?.full_name || "Usuário SpeakFlow");
      setEmail(session.user.email || "");
      setLevel(labels[data?.preferred_level || "intermediate"] || labels.intermediate);
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) return <main className="profile-shell"><p>Carregando seu perfil...</p></main>;

  return <main className="profile-shell">
    <section className="profile-card">
      <button className="profile-back" onClick={() => router.push("/")}>← Voltar para o início</button>
      <div className="profile-brand">
        <img src="/speakflow-logo.png" alt="SpeakFlow" />
        <div><strong>Speak<span>Flow</span></strong><small>MINHA CONTA</small></div>
      </div>
      <div className="profile-hero">
        <div className="profile-avatar"><img src="/speakflow-logo.png" alt="" /></div>
        <div><span>PERFIL DO ALUNO</span><h1>{name}</h1><p>{email}</p></div>
      </div>
      <div className="profile-grid">
        <article><span>NÍVEL ATUAL</span><strong>{level}</strong><p>O Coach adapta seus treinos a este nível.</p></article>
        <article><span>CONTA</span><strong>Conta ativa</strong><p>Seu progresso fica vinculado a este perfil.</p></article>
      </div>
      <div className="profile-actions">
        <button className="profile-primary" onClick={() => router.push("/coach")}>Abrir meu Coach →</button>
        <button className="profile-logout" onClick={signOut}>Sair da conta</button>
      </div>
    </section>
  </main>;
}

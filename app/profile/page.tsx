"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("Usuário SpeakFlow");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("Intermediate");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [userId, setUserId] = useState("");
  const [stats, setStats] = useState({ sessions: 0, minutes: 0, streak: 0 });
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      setUserId(session.user.id);
      const [{ data }, { data: progress }] = await Promise.all([
        supabase.from("profiles")
          .select("full_name, preferred_level, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle(),
        supabase.from("progress")
          .select("conversations_count, total_minutes, streak_days")
          .eq("user_id", session.user.id)
          .maybeSingle(),
      ]);

      const labels: Record<string, string> = {
        beginner: "Beginner · Iniciante",
        elementary: "Elementary · Básico",
        intermediate: "Intermediate · Intermediário",
        upper_intermediate: "Upper Intermediate · Intermediário avançado",
        advanced: "Advanced · Avançado",
      };

      setName(data?.full_name || session.user.user_metadata?.full_name || "Usuário SpeakFlow");
      setEmail(session.user.email || "");
      setAvatarUrl(data?.avatar_url || "");
      setStats({
        sessions: progress?.conversations_count || 0,
        minutes: progress?.total_minutes || 0,
        streak: progress?.streak_days || 0,
      });
      setLevel(labels[data?.preferred_level || "intermediate"] || labels.intermediate);
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  async function uploadAvatar(file: File) {
    if (!userId || !file.type.startsWith("image/")) return;
    setUploading(true);
    setMessage("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { setMessage("Não foi possível enviar a foto."); setUploading(false); return; }
    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicData.publicUrl}?v=${Date.now()}`;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
    if (!error) { setAvatarUrl(url); setMessage("Foto atualizada."); }
    else setMessage("A foto foi enviada, mas não foi possível atualizar o perfil.");
    setUploading(false);
  }

  async function removeAvatar() {
    if (!userId || !avatarUrl) return;
    setUploading(true);
    const marker = "/avatars/";
    const cleanUrl = avatarUrl.split("?")[0];
    const path = cleanUrl.includes(marker) ? cleanUrl.split(marker)[1] : "";
    if (path) await supabase.storage.from("avatars").remove([path]);
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
    if (!error) { setAvatarUrl(""); setMessage("Foto removida."); }
    setUploading(false);
  }

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
        <div className="profile-avatar"><img src={avatarUrl || "/speakflow-logo.png"} alt="Foto do perfil" /></div>
        <div><span>PERFIL DO ALUNO</span><h1>{name}</h1><p>{email}</p>
          <div className="profile-photo-actions">
            <label>{uploading ? "Enviando..." : avatarUrl ? "Alterar foto" : "Adicionar foto"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(e) => { const file=e.target.files?.[0]; if(file) uploadAvatar(file); e.currentTarget.value=""; }} /></label>
            {avatarUrl && <button type="button" disabled={uploading} onClick={removeAvatar}>Remover foto</button>}
          </div>{message && <small className="profile-message">{message}</small>}
        </div>
      </div>
      <div className="profile-stats">
        <article><strong>{stats.sessions}</strong><span>Sessões</span></article>
        <article><strong>{stats.minutes}</strong><span>Minutos</span></article>
        <article><strong>{stats.streak}</strong><span>Dias de sequência</span></article>
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

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Crown, Gem, BadgeCheck, Tag } from "lucide-react";

const levelOrder = ["beginner", "elementary", "intermediate", "upper_intermediate", "advanced"];

const levelLabels: Record<string, string> = {
  beginner: "Beginner · Iniciante",
  elementary: "Elementary · Básico",
  intermediate: "Intermediate · Intermediário",
  upper_intermediate: "Upper Intermediate · Intermediário avançado",
  advanced: "Advanced · Avançado",
};

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("Usuário SpeakFlow");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("intermediate");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [userId, setUserId] = useState("");
  const [stats, setStats] = useState({ sessions: 0, minutes: 0, streak: 0 });
  const [focusSkills, setFocusSkills] = useState<string[]>([]);
  const [learningGoal, setLearningGoal] = useState("conversation");
  const [correctionStyle, setCorrectionStyle] = useState("balanced");
  const [conversationPace, setConversationPace] = useState("natural");
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasActivePro, setHasActivePro] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { router.replace("/login"); return; }

      setUserId(user.id);
      const [{ data }, { data: accessData }, { data: accountAccess }] = await Promise.all([
        supabase.from("profiles")
          .select("full_name, preferred_level, avatar_url, learning_goal, correction_style, conversation_pace")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.rpc("get_progress_access_data"),
        supabase.rpc("get_account_access"),
      ]);
      const progress = accessData?.progress ?? {};
      const insights = accessData?.insights ?? [];
      const access = Array.isArray(accountAccess) ? accountAccess[0] : accountAccess;
      setHasActivePro(access?.effective_plan === "pro");

      setName(data?.full_name || user.user_metadata?.full_name || "Usuário SpeakFlow");
      setEmail(user.email || "");
      setAvatarUrl(data?.avatar_url || "");
      setStats({
        sessions: progress?.conversations_count || 0,
        minutes: progress?.total_minutes || 0,
        streak: progress?.streak_days || 0,
      });
      setLevel(data?.preferred_level || "intermediate");
      setLearningGoal(data?.learning_goal || "conversation");
      setCorrectionStyle(data?.correction_style || "balanced");
      setConversationPace(data?.conversation_pace || "natural");
      const counts = (insights || []).reduce((acc: Record<string, number>, item: { skill_category?: string | null }) => {
        const skill = item.skill_category?.trim();
        if (skill) acc[skill] = (acc[skill] || 0) + 1;
        return acc;
      }, {});
      setFocusSkills((Object.entries(counts) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([skill]) => skill));
      setLoading(false);
    }
    loadProfile();

    async function refreshAccountAccess() {
      if (document.visibilityState !== "visible") return;
      const { data: accountAccess } = await supabase.rpc("get_account_access");
      const access = Array.isArray(accountAccess) ? accountAccess[0] : accountAccess;
      setHasActivePro(access?.effective_plan === "pro");
    }

    const handleFocus = () => { void refreshAccountAccess(); };
    const handleVisibility = () => { void refreshAccountAccess(); };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
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

  async function saveProfile() {
    if (!userId || !name.trim()) return;
    setSaving(true);
    setMessage("");
    const cleanName = name.trim();
    const { error } = await supabase.from("profiles").update({ full_name: cleanName, preferred_level: level }).eq("id", userId);
    if (!error) {
      setName(cleanName);
      setEditing(false);
      setMessage("Perfil atualizado.");
    } else setMessage("Não foi possível atualizar o perfil.");
    setSaving(false);
  }

  async function savePreferences() {
    if (!userId) return;
    setSavingPreferences(true);
    setPreferencesMessage("");
    const { error } = await supabase.from("profiles").update({ learning_goal: learningGoal, correction_style: correctionStyle, conversation_pace: conversationPace }).eq("id", userId);
    setPreferencesMessage(error ? "Não foi possível salvar. Tente novamente." : "✓ Preferências atualizadas");
    setSavingPreferences(false);
    window.setTimeout(() => setPreferencesMessage(""), 3000);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const achievements = [
    { icon: "01", title: "Primeiro passo", description: "Conclua sua primeira sessão.", unlocked: stats.sessions >= 1 },
    { icon: "05", title: "Em movimento", description: "Complete 5 sessões de prática.", unlocked: stats.sessions >= 5 },
    { icon: "10", title: "Consistência", description: "Complete 10 sessões de prática.", unlocked: stats.sessions >= 10 },
    { icon: "30", title: "Meia hora de inglês", description: "Acumule 30 minutos de prática.", unlocked: stats.minutes >= 30 },
    { icon: "03", title: "Ritmo de estudo", description: "Mantenha uma sequência de 3 dias.", unlocked: stats.streak >= 3 },
    { icon: "07", title: "Semana em fluxo", description: "Mantenha uma sequência de 7 dias.", unlocked: stats.streak >= 7 },
  ];
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length;

  if (loading) return <main className="profile-shell"><p>Carregando seu perfil...</p></main>;

  return <main className="profile-shell">
    <section className="profile-card">
      <button className="profile-back" onClick={() => router.push("/")}><ArrowLeft /> Voltar para o início</button>
      <div className="profile-brand">
        <img src="/speakflow-logo.png" alt="SpeakFlow" />
        <div><strong>Speak<span>Flow</span></strong><small>MINHA CONTA</small></div>
      </div>
      <div className="profile-hero">
        <div className="profile-avatar"><img src={avatarUrl || "/speakflow-logo.png"} alt="Foto do perfil" /></div>
        <div><span>{hasActivePro ? "MEMBRO SPEAKFLOW PRO" : "PERFIL DO ALUNO"}</span><div className="profile-name-row"><h1>{name}</h1>{hasActivePro ? <span className="profile-pro-badge"><Crown aria-hidden="true" /> PRO</span> : <span className="profile-free-badge"><Tag aria-hidden="true" /> FREE</span>}</div><p>{email}</p>{hasActivePro && <div className="profile-premium-status"><div className="profile-premium-glow" aria-hidden="true" /><span className="profile-premium-mark"><Gem aria-hidden="true" /></span><div><small>EXPERIÊNCIA PREMIUM ATIVA</small><strong>Seu SpeakFlow está completo.</strong><p>Coach avançado, Labs completos e aprendizado adaptativo liberados para a sua jornada.</p></div><span className="profile-premium-verified"><BadgeCheck aria-hidden="true" /> PRO ATIVO</span></div>}
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
        <article className="profile-settings-card"><div className="profile-card-heading"><span>PERFIL DE APRENDIZADO</span><button type="button" className="profile-edit" onClick={() => setEditing((value) => !value)}>{editing ? "Cancelar" : "Editar"}</button></div>{editing ? <div className="profile-edit-form"><label><span>Nome</span><input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label><label><span>Nível</span><select value={level} onChange={(e) => setLevel(e.target.value)}><option value="beginner">Beginner · Iniciante</option><option value="elementary">Elementary · Básico</option><option value="intermediate">Intermediate · Intermediário</option><option value="upper_intermediate">Upper Intermediate · Intermediário avançado</option><option value="advanced">Advanced · Avançado</option></select></label><button type="button" className="profile-save" disabled={saving || !name.trim()} onClick={saveProfile}>{saving ? "Salvando..." : "Salvar alterações"}</button></div> : <><strong>{levelLabels[level] || levelLabels.intermediate}</strong><p>O Coach adapta vocabulário, perguntas e feedback ao seu nível.</p></>}</article>
        <article><span>CONTA</span><strong>{email}</strong><p>Seu histórico de aprendizado e progresso ficam vinculados a este perfil.</p></article>
      </div>
      <section className="profile-journey">
        <div className="profile-journey-heading"><div><span>SUA JORNADA</span><h2>Evolução no SpeakFlow</h2></div><strong>{levelLabels[level] || levelLabels.intermediate}</strong></div>
        <div className="profile-level-track">{levelOrder.map((item, index) => { const currentIndex = levelOrder.indexOf(level); const state = index < currentIndex ? "completed" : index === currentIndex ? "current" : "future"; return <div key={item} className={`profile-level-step ${state}`}><i>{index < currentIndex ? <Check aria-hidden="true" /> : index + 1}</i><span>{levelLabels[item].split(" · ")[0]}</span></div>; })}</div>
        <div className="profile-journey-insight">
          <div><span>FOCOS IDENTIFICADOS</span><strong>{focusSkills.length ? focusSkills.join(" · ") : "Sua jornada está começando"}</strong><p>{focusSkills.length ? "Baseado nos padrões recentes dos seus feedbacks. Continue praticando para refinar seu perfil de aprendizagem." : "À medida que você pratica, o SpeakFlow identifica padrões reais nos seus feedbacks e destaca habilidades para desenvolver."}</p></div>
          <button type="button" onClick={() => router.push("/progress")}>Ver progresso <ArrowRight /></button>
        </div>
      </section>
      <section className="profile-achievements">
        <div className="profile-achievements-heading">
          <div><span>CONQUISTAS</span><h2>Marcos da sua prática</h2></div>
          <strong>{unlockedAchievements}/{achievements.length}</strong>
        </div>
        <div className="profile-achievement-grid">
          {achievements.map((achievement) => (
            <article key={achievement.title} className={achievement.unlocked ? "unlocked" : "locked"}>
              <i>{achievement.unlocked ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}</i>
              <div><strong>{achievement.title}</strong><p>{achievement.description}</p></div>
            </article>
          ))}
        </div>
      </section>
      <section className="profile-preferences">
        <div className="profile-preferences-heading"><div><span>PREFERÊNCIAS DE APRENDIZADO</span><h2>Personalize seu Coach</h2></div><p>Estas escolhas orientam como o SpeakFlow conduz suas sessões.</p></div>
        <div className="profile-preference-grid">
          <label><span>OBJETIVO PRINCIPAL</span><select value={learningGoal} onChange={(e) => setLearningGoal(e.target.value)}><option value="conversation">Conversação</option><option value="vocabulary">Vocabulário</option><option value="pronunciation">Pronúncia</option></select></label>
          <label><span>ESTILO DE CORREÇÃO</span><select value={correctionStyle} onChange={(e) => setCorrectionStyle(e.target.value)}><option value="essential">Essencial</option><option value="balanced">Equilibrado</option><option value="detailed">Detalhado</option></select></label>
          <label><span>RITMO DA CONVERSA</span><select value={conversationPace} onChange={(e) => setConversationPace(e.target.value)}><option value="relaxed">Tranquilo</option><option value="natural">Natural</option><option value="challenging">Desafiador</option></select></label>
        </div>
        <div className="profile-preferences-actions"><button type="button" className="profile-preferences-save" disabled={savingPreferences} onClick={savePreferences}>{savingPreferences ? "Salvando..." : "Salvar preferências"}</button>{preferencesMessage && <span className={preferencesMessage.startsWith("✓") ? "profile-preferences-feedback success" : "profile-preferences-feedback error"}>{preferencesMessage}</span>}</div>
      </section>
      <div className="profile-actions">
        <button className="profile-primary" onClick={() => router.push("/coach")}>Abrir meu Coach <ArrowRight /></button>
        <button className="profile-logout" onClick={signOut}>Sair da conta</button>
      </div>
    </section>
  </main>;
}

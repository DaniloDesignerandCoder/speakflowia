"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function getFriendlyAuthMessage(errorMessage: string) {
    const raw = errorMessage.toLowerCase();

    if (raw.includes("invalid login credentials")) {
      return "E-mail ou senha incorretos. Confira seus dados e tente novamente.";
    }
    if (raw.includes("email not confirmed")) {
      return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada e a pasta de spam.";
    }
    if (raw.includes("user already registered") || raw.includes("already been registered")) {
      return "Este e-mail já possui uma conta no SpeakFlow. Entre com sua senha para continuar.";
    }
    if (raw.includes("password") && (raw.includes("weak") || raw.includes("least"))) {
      return "Escolha uma senha mais segura, com pelo menos 6 caracteres.";
    }
    if (raw.includes("rate limit") || raw.includes("too many")) {
      return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
    }
    if (raw.includes("network") || raw.includes("fetch")) {
      return "Não foi possível conectar ao SpeakFlow agora. Verifique sua internet e tente novamente.";
    }

    return "Não foi possível concluir esta ação agora. Tente novamente em alguns instantes.";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        setMessage(getFriendlyAuthMessage(error.message));
      } else {
        setMessage(
          "Conta criada com sucesso! Enviamos um link de confirmação para o seu e-mail. Verifique também a pasta de spam."
        );
      }
    } else {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(getFriendlyAuthMessage(error.message));
      } else {
        const session = authData.session;

        if (!session) {
          setMessage("Não foi possível iniciar sua sessão agora. Tente novamente.");
          setLoading(false);
          return;
        }

        const [{ data: profile }, { count: priorSessions }] = await Promise.all([
          supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", session.user.id)
            .maybeSingle(),
          supabase
            .from("learning_sessions")
            .select("user_id", { count: "exact", head: true })
            .eq("user_id", session.user.id),
        ]);

        const isExistingLearner =
          profile?.onboarding_completed === true || (priorSessions ?? 0) > 0;

        if (isExistingLearner && profile?.onboarding_completed !== true) {
          await supabase
            .from("profiles")
            .update({ onboarding_completed: true })
            .eq("id", session.user.id);
        }

        router.push(isExistingLearner ? "/" : "/onboarding");
        router.refresh();
      }
    }

    setLoading(false);
  }

  return (
    <main className="login-shell">
      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />

      <div className="login-container">
        <section className="login-card">
          <div className="login-brand">
            <div className="login-mark">
  <img
    src="/speakflow-logo.png"
    alt="SpeakFlow"
  />
</div>

            <div>
              <div className="login-logo">
                Speak<span>Flow</span>
              </div>

              <div className="login-kicker">
                AI ENGLISH COACH
              </div>
            </div>
          </div>

          <div className="login-heading">
            <div className="login-eyebrow">
              {mode === "login" ? "BEM-VINDO DE VOLTA" : "COMECE SUA JORNADA"}
            </div>

            <h1>
              {mode === "login"
                ? "Entre no seu SpeakFlow."
                : "Crie sua conta."}
            </h1>

            <p>
              {mode === "login"
                ? "Continue sua evolução em inglês."
                : "Sua jornada rumo à fluência começa aqui."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {mode === "signup" && (
              <label>
                <span>Nome</span>

                <input
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
            )}

            <label>
              <span>E-mail</span>

              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              <span>Senha</span>

              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>

            {message && (
              <div className="login-message">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? "Processando..."
                : mode === "login"
                  ? "Entrar no SpeakFlow"
                  : "Criar minha conta"}
            </button>
          </form>

          <div className="login-switch">
            <span>
              {mode === "login"
                ? "Ainda não tem uma conta?"
                : "Já possui uma conta?"}
            </span>

            <button
              onClick={() =>
                setMode(mode === "login" ? "signup" : "login")
              }
            >
              {mode === "login"
                ? "Criar conta"
                : "Entrar"}
            </button>
          </div>
        </section>

        <footer className="login-footer">
          SpeakFlow — o poder da IA guiando sua fluência em inglês.
        </footer>
      </div>
    </main>
  );
}


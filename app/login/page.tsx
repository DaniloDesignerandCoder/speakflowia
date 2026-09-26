"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const TURNSTILE_SITE_KEY = "0x4AAAAAAFD82y1uV5Y1kHXl";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        theme?: "auto" | "light" | "dark";
        callback: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
      }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(false);
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const captchaWidgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      setMode("reset");
      setMessage("");
    }
  }, []);

  useEffect(() => {
    if (mode === "reset") return;

    setCaptchaToken("");
    setCaptchaReady(false);
    captchaWidgetIdRef.current = null;

    const renderTurnstile = () => {
      if (!captchaContainerRef.current || !window.turnstile || captchaWidgetIdRef.current) return;
      captchaWidgetIdRef.current = window.turnstile.render(captchaContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "auto",
        callback: (token) => {
          setCaptchaToken(token);
          setCaptchaReady(true);
        },
        "expired-callback": () => {
          setCaptchaToken("");
          setCaptchaReady(false);
        },
        "error-callback": () => {
          setCaptchaToken("");
          setCaptchaReady(false);
        },
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-speakflow-turnstile="true"]');
    if (existingScript) {
      renderTurnstile();
      existingScript.addEventListener("load", renderTurnstile);
      return () => existingScript.removeEventListener("load", renderTurnstile);
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.speakflowTurnstile = "true";
    script.addEventListener("load", renderTurnstile);
    document.head.appendChild(script);

    return () => script.removeEventListener("load", renderTurnstile);
  }, [mode]);

  function resetCaptcha() {
    setCaptchaToken("");
    setCaptchaReady(false);
    if (window.turnstile && captchaWidgetIdRef.current) {
      window.turnstile.reset(captchaWidgetIdRef.current);
    }
  }

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

    const turnstileResponse =
      document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value ?? "";
    const verifiedCaptchaToken = captchaToken || turnstileResponse;

    if (mode !== "reset" && !verifiedCaptchaToken) {
      setMessage("Conclua a verificação de segurança para continuar.");
      setLoading(false);
      return;
    }

    if (mode === "reset") {
      if (password !== confirmPassword) {
        setMessage("As senhas não coincidem. Digite a mesma senha nos dois campos.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(getFriendlyAuthMessage(error.message));
      } else {
        await supabase.auth.signOut();
        setPassword("");
        setConfirmPassword("");
        setMode("login");
        window.history.replaceState({}, "", "/login");
        setMessage("Senha atualizada com sucesso. Entre novamente com sua nova senha.");
      }
    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?reset=1`,
        captchaToken: verifiedCaptchaToken,
      });
      resetCaptcha();

      if (error) {
        setMessage(getFriendlyAuthMessage(error.message));
      } else {
        setMessage("Se este e-mail estiver associado a uma conta SpeakFlow, enviaremos as instruções para redefinir sua senha.");
      }
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          captchaToken: verifiedCaptchaToken,
        },
      });
      resetCaptcha();

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
        options: { captchaToken: verifiedCaptchaToken },
      });
      resetCaptcha();

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
              {mode === "login" ? "BEM-VINDO DE VOLTA" : mode === "forgot" ? "RECUPERAÇÃO DE ACESSO" : mode === "reset" ? "NOVA SENHA" : "COMECE SUA JORNADA"}
            </div>

            <h1>
              {mode === "login"
                ? "Entre no seu SpeakFlow."
                : mode === "forgot"
                  ? "Redefina sua senha."
                  : mode === "reset"
                    ? "Crie uma nova senha."
                    : "Crie sua conta."}
            </h1>

            <p>
              {mode === "login"
                ? "Continue sua evolução em inglês."
                : mode === "forgot"
                  ? "Informe seu e-mail e enviaremos um link seguro para você."
                  : mode === "reset"
                    ? "Escolha uma nova senha para proteger sua conta SpeakFlow."
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

            {mode !== "reset" && (
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
            )}

            {mode !== "forgot" && (
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
            )}

            {mode === "reset" && (
              <label>
                <span>Confirmar nova senha</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={6}
                  required
                />
              </label>
            )}

            {mode === "login" && (
              <button
                type="button"
                className="login-forgot"
                onClick={() => {
                  setMode("forgot");
                  setMessage("");
                }}
              >
                Esqueci minha senha
              </button>
            )}

            {mode !== "reset" && (
              <div className="login-captcha" aria-label="Verificação de segurança">
                <div ref={captchaContainerRef} />
              </div>
            )}

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
                  : mode === "forgot"
                    ? "Enviar link de recuperação"
                    : mode === "reset"
                      ? "Salvar nova senha"
                      : "Criar minha conta"}
            </button>
          </form>

          {mode !== "reset" && <div className="login-switch">
            <span>
              {mode === "login"
                ? "Ainda não tem uma conta?"
                : mode === "forgot"
                  ? "Lembrou sua senha?"
                  : "Já possui uma conta?"}
            </span>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setMessage("");
              }}
            >
              {mode === "login" ? "Criar conta" : "Entrar"}
            </button>
          </div>}
        </section>

        <footer className="login-footer">
          SpeakFlow — o poder da IA guiando sua fluência em inglês.
        </footer>
      </div>
    </main>
  );
}


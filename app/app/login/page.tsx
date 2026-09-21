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
        setMessage(error.message);
      } else {
        setMessage(
          "Conta criada. Verifique seu e-mail para confirmar o acesso."
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        router.push("/");
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
        <button
          className="login-back"
          onClick={() => router.push("/")}
        >
          ← Voltar
        </button>

        <section className="login-card">
          <div className="login-brand">
            <div className="login-mark">S</div>

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

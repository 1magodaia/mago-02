import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LogoWordmark } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Entrar — Busca Mágica" },
      { name: "description", content: "Acesse sua conta Busca Mágica para prospectar comércios locais." },
      { property: "og:title", content: "Busca Mágica — Entrar" },
      { property: "og:description", content: "Acesse sua conta para prospectar leads com auditoria digital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) nav({ to: (redirect as string) || "/" });
  }, [user, loading, nav, redirect]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setInfo("Conta criada. Faça login abaixo.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("Se o e-mail existir, enviamos um link para redefinir a senha.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center">
          <LogoWordmark variant="full" className="h-28 sm:h-32 w-auto mx-auto" />
        </Link>
        <div className="glass-panel rounded-2xl p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {mode === "login" && "Entrar"}
            {mode === "signup" && "Criar conta"}
            {mode === "forgot" && "Recuperar senha"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" && "Acesse sua conta para começar a prospectar."}
            {mode === "signup" && "Comece grátis. Sem cartão de crédito."}
            {mode === "forgot" && "Enviaremos um link para você redefinir."}
          </p>

          <form onSubmit={handle} className="mt-6 space-y-3">
            {mode === "signup" && (
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Nome</span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-glass px-4 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/70"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">E-mail</span>
              <div className="mt-1 flex items-center gap-2 rounded-xl bg-glass px-4 py-2.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary/70">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>
            {mode !== "forgot" && (
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Senha</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl bg-glass px-4 py-2.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary/70">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
                {mode === "signup" && (
                  <span className="mt-1 block text-[10px] text-muted-foreground">Mínimo 8 caracteres.</span>
                )}
              </label>
            )}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
                {info}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110 hover:neon-primary disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" && "Entrar"}
              {mode === "signup" && "Criar conta"}
              {mode === "forgot" && "Enviar link"}
            </button>
          </form>

          <div className="mt-5 flex flex-col gap-1.5 text-center text-xs text-muted-foreground">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("forgot")} className="hover:text-primary">
                  Esqueci minha senha
                </button>
                <button onClick={() => setMode("signup")} className="hover:text-primary">
                  Não tem conta? <span className="text-primary">Criar agora</span>
                </button>
              </>
            )}
            {mode === "signup" && (
              <button onClick={() => setMode("login")} className="hover:text-primary">
                Já tem conta? <span className="text-primary">Entrar</span>
              </button>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} className="hover:text-primary">
                Voltar para login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "canonical", href: "https://buscamagica.lovable.app/auth" }
    ]
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
  const [googleLoading, setGoogleLoading] = useState(false);

  // Same-origin relative path guard for post-login redirects (e.g. MCP consent URL).
  const safeRedirect =
    typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : null;

  const handleGoogle = async () => {
    setError(null);
    setInfo(null);
    setGoogleLoading(true);
    try {
      // Stash the intended destination so we can consume it after the session hydrates,
      // regardless of whether Google returns via popup (web_message) or full-page redirect.
      if (safeRedirect && typeof window !== "undefined") {
        try { sessionStorage.setItem("bm.postLoginRedirect", safeRedirect); } catch { /* quota */ }
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        // Return to /auth so the useEffect below can pick up the stashed redirect
        // and forward the user to the original destination (e.g. /.lovable/oauth/consent).
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.error) throw result.error;
      // if redirected, browser navigates away; otherwise session is set and useEffect redirects
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar com Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      let stashed: string | null = null;
      if (typeof window !== "undefined") {
        try {
          stashed = sessionStorage.getItem("bm.postLoginRedirect");
          if (stashed) sessionStorage.removeItem("bm.postLoginRedirect");
        } catch { /* ignore */ }
      }
      const target = stashed && stashed.startsWith("/") && !stashed.startsWith("//")
        ? stashed
        : safeRedirect;
      if (target) {
        // Use full navigation to preserve query strings (authorization_id etc.).
        window.location.assign(target);
      } else {
        nav({ to: "/" });
      }
    }
  }, [user, loading, nav, safeRedirect]);

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
          <LogoWordmark variant="full" className="mx-auto" />
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

          {mode !== "forgot" && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading || submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-bold text-gray-900 ring-1 ring-border transition hover:brightness-95 disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                )}
                Continuar com Google
              </button>

              <div className="my-5 flex items-center gap-3 text-[10px] uppercase text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                ou com e-mail
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={handle} className={mode === "forgot" ? "mt-6 space-y-3" : "space-y-3"}>

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
            {mode === "login" && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-3.5 w-3.5 rounded border-border bg-glass accent-primary"
                  />
                  Lembrar de mim
                </label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="font-semibold text-primary hover:underline"
                >
                  Esqueci a senha
                </button>
              </div>
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

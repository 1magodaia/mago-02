import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LogoWordmark } from "@/components/logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Busca Mágica" },
      { name: "description", content: "Escolha uma nova senha para sua conta Busca Mágica." },
      { property: "og:title", content: "Busca Mágica — Redefinir senha" },
      { property: "og:description", content: "Defina uma nova senha para acessar sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase recovery link puts session tokens in URL hash → SDK reads it automatically
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setReady(true);
    } else {
      supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    }
  }, []);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Senha precisa ter no mínimo 8 caracteres.");
    if (password !== confirm) return setError("Senhas não conferem.");
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) return setError(error.message);
    setInfo("Senha atualizada. Redirecionando...");
    setTimeout(() => nav({ to: "/" }), 1500);
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center">
          <LogoWordmark variant="full" className="h-28 sm:h-32 w-auto mx-auto" />
        </Link>
        <div className="glass-panel rounded-2xl p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Nova senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escolha uma senha forte.</p>
          {!ready ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Link inválido ou expirado. <Link to="/auth" className="text-primary">Solicitar novo</Link>.
            </p>
          ) : (
            <form onSubmit={handle} className="mt-6 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Nova senha</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl bg-glass px-4 py-2.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary/70">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Confirmar senha</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl bg-glass px-4 py-2.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary/70">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
                </div>
              </label>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
                </div>
              )}
              {info && <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">{info}</div>}
              <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar nova senha
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

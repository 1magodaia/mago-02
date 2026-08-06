import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { 
  Loader2, Mail, Lock, AlertCircle, Eye, EyeOff, 
  ShieldCheck, Sparkles, MessageSquare, Zap, 
  ArrowRight, CheckCircle2, UserPlus, Star, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { LogoIcon } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo-mago.png.asset.json";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Mago Busca — Acesso Premium" },
      { name: "description", content: "Encontre arquivos, links e conteúdos em segundos com o poder da Busca Mágica." },
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
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const safeRedirect =
    typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : null;

  const handleGoogle = async () => {
    setError(null);
    setInfo(null);
    setGoogleLoading(true);
    try {
      if (safeRedirect && typeof window !== "undefined") {
        try { sessionStorage.setItem("bm.postLoginRedirect", safeRedirect); } catch { /* quota */ }
      }
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar com Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      setLoginSuccess(true);
      const timer = setTimeout(() => {
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
          window.location.assign(target);
        } else {
          nav({ to: "/" });
        }
      }, 2000);
      return () => clearTimeout(timer);
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
        setInfo("Conta criada com sucesso! Faça login abaixo.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("Enviamos um link para redefinir sua senha.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0A0B1F] px-4 py-8">
      {/* Dynamic Magical & IA Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Deep Night Base with Noise */}
        <div className="absolute inset-0 bg-[#0A0B1F] animate-noise mix-blend-overlay opacity-40" />
        
        {/* Animated Cyber Grid */}
        <div className="absolute inset-0 particle-bg opacity-30" />

        {/* Floating Magical Orbs */}
        <div className="absolute top-[-10%] left-[-5%] h-[60%] w-[60%] rounded-full bg-primary/25 blur-[120px] animate-float-slow" />
        <div className="absolute bottom-[-15%] right-[-5%] h-[60%] w-[60%] rounded-full bg-warn/15 blur-[120px] animate-float-slow" style={{ animationDelay: '-5s' }} />
        <div className="absolute top-[20%] right-[10%] h-[30%] w-[30%] rounded-full bg-primary/10 blur-[80px] animate-pulse-subtle" />
        
        {/* IA Scanning Effect Overlay */}
        <div className="absolute inset-0 scan-effect opacity-10" />

        {/* Abstract Business Connections (Decorative SVGs) */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" className="text-primary" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-[440px] animate-in fade-in zoom-in duration-700">
        <div className="glass-panel rounded-[32px] border-white/10 bg-[#0A0B1F]/60 p-10 shadow-elevated backdrop-blur-3xl relative overflow-hidden">
          {/* Subtle Inner Glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <Link to="/" className="group mb-8 block relative">
              <div className="absolute inset-0 -m-8 bg-primary/25 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <img 
                src={logoAsset.url} 
                alt="Mago Busca"
                className="h-40 w-auto animate-float-magical relative z-10 select-none pointer-events-none transition-transform duration-700 group-hover:scale-110"
              />
            </Link>
            <h1 className="text-3xl font-black tracking-tighter text-white mb-3 font-heading uppercase">
              {mode === "login" ? "Entrar" : mode === "signup" ? "Criar Conta Free" : "Recuperar Senha"}
            </h1>
            <p className="text-sm text-muted-foreground/90 max-w-[320px] leading-relaxed">
              Descubra o poder da prospecção mágica com o Mago Busca.
            </p>
          </div>

          {/* Opções de Login */}
          <div className="space-y-6">
            {/* Google Login - Agora como primeira opção */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-4.5 text-base font-black text-gray-900 shadow-glow-white transition-all hover:bg-gray-50 hover:scale-[1.02] active:scale-95 disabled:opacity-50 group"
              >
                {googleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                )}
                CONTINUAR COM GOOGLE
              </button>
              <p className="text-[10px] text-center text-muted-foreground px-4 font-medium uppercase tracking-wider">
                Acesso instantâneo para contas Google
              </p>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">OU ACESSE COM E-MAIL</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <form onSubmit={handle} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full rounded-2xl bg-white/[0.01] px-5 py-4 text-sm text-white outline-none border border-white/5 transition-all focus:border-primary/40 focus:bg-white/[0.04] focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1">📧 E-mail</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full rounded-2xl bg-white/[0.01] px-5 py-4 text-sm text-white outline-none border border-white/5 transition-all focus:border-primary/40 focus:bg-white/[0.04] focus:ring-4 focus:ring-primary/10"
                />
              </div>

              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1">🔒 Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl bg-white/[0.01] px-5 py-4 text-sm text-white outline-none border border-white/5 transition-all focus:border-primary/40 focus:bg-white/[0.04] focus:ring-4 focus:ring-primary/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "login" && (
                <div className="flex items-center gap-2 px-1">
                  <input 
                    type="checkbox" 
                    id="remember" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/10 bg-white/5 text-primary focus:ring-offset-0 focus:ring-primary" 
                  />
                  <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none">Lembrar de mim</label>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive animate-in slide-in-from-top-1">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {info && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary animate-in slide-in-from-top-1">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-white/5 py-4.5 text-base font-black tracking-widest text-white border border-white/10 transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (
                  mode === "login" ? "ENTRAR" : mode === "signup" ? "CRIAR CONTA FREE" : "ENVIAR LINK"
                )}
              </button>
            </form>
          </div>

          {/* Bottom Links */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs font-semibold text-primary">
            {mode === "login" ? (
              <button onClick={() => setMode("signup")} className="hover:underline">Criar Conta Free</button>
            ) : (
              <button onClick={() => setMode("login")} className="hover:underline">Voltar ao Login</button>
            )}
            <button onClick={() => setMode("forgot")} className="hover:underline">Esqueci minha Senha</button>
          </div>

          {/* WhatsApp / PRO Info Card */}
          <div className="mt-8 animate-in fade-in duration-700 delay-300">
            {loginSuccess ? (
              <a
                href="https://wa.me/55?text=Olá, acabei de fazer login no Mago Busca e gostaria de ativar meu acesso PRO."
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-lg"
              >
                <MessageSquare className="h-4 w-4" />
                Enviar comprovante no WhatsApp
              </a>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-[#0A0B1F]/40 p-6 text-center shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <p className="text-xs font-black text-white mb-2 flex items-center justify-center gap-2 uppercase tracking-tight relative z-10">
                  <Star className="h-3.5 w-3.5 text-warn fill-warn animate-pulse" /> Já adquiriu o Mago Busca PRO?
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed relative z-10 font-medium">
                  Faça login com o e-mail da compra. Após entrar, envie seu comprovante pelo WhatsApp para ativação instantânea.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Signup Benefits (only shown in signup mode) */}
        {mode === "signup" && (
          <div className="mt-6 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {[
              { icon: <Zap className="h-3.5 w-3.5" />, text: "Pesquisa inteligente" },
              { icon: <Sparkles className="h-3.5 w-3.5" />, text: "Recursos gratuitos" },
              { icon: <ShieldCheck className="h-3.5 w-3.5" />, text: "Limite diário" },
              { icon: <ChevronRight className="h-3.5 w-3.5" />, text: "Upgrade para PRO" }
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-[#0A0B1F]/40 p-2.5 border border-white/5">
                <div className="text-primary">{b.icon}</div>
                <span className="text-[10px] text-gray-300 font-medium">{b.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

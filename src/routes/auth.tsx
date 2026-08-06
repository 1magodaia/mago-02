import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { 
  Loader2, Mail, Lock, AlertCircle, Eye, EyeOff, 
  ShieldCheck, Sparkles, MessageSquare, Zap, 
  ArrowRight, CheckCircle2, UserPlus, Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { LogoWordmark, LogoIcon } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "IA PLAY — Acesso" },
      { name: "description", content: "Sua Central de Agentes Inteligentes." },
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
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.error) throw result.error;
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
    <div className="relative flex min-h-screen flex-col items-center justify-start overflow-x-hidden bg-[#0A0B1F] px-4 py-12 md:py-20 scrollbar-magical">
      {/* Premium Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[50%] w-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute top-[40%] -right-[10%] h-[40%] w-[40%] rounded-full bg-warn/10 blur-[100px] animate-pulse" style={{ animationDelay: '-2s' }} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.pattern')] opacity-10 mix-blend-overlay" />
      </div>

      <div className="relative z-10 w-full max-w-[900px] flex flex-col items-center gap-12 slide-up-fade">
        {/* Header / Logo */}
        <div className="flex flex-col items-center gap-6">
          <Link to="/" className="transition-transform duration-500 hover:scale-110 active:scale-95">
            <LogoIcon className="h-24 md:h-32 w-auto drop-shadow-[0_0_20px_rgba(107,70,224,0.6)]" />
          </Link>
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
              IA <span className="text-primary">PLAY</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl font-medium mt-1">Sua Central de Agentes Inteligentes</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
          
          {/* PRO SECTION (Left Column on Desktop) */}
          <div className="flex flex-col gap-6">
            <div className="glass-panel rounded-[2rem] border-primary/30 p-8 md:p-10 shadow-glow-primary relative overflow-hidden h-full flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Star className="h-16 w-16 text-primary" fill="currentColor" />
              </div>
              
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary/20 p-2 rounded-xl border border-primary/30">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Já comprou acesso PRO?</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Faça login utilizando exatamente o mesmo e-mail utilizado na compra para liberar seus agentes ilimitados.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  "Login com o e-mail da compra",
                  "Preferencialmente usando Google",
                  "Envie o comprovante após entrar"
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-200">
                    <CheckCircle2 className="h-5 w-5 text-emerald shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto space-y-4">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={googleLoading || submitting}
                  className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-4 text-base font-bold text-gray-900 transition-all hover:bg-gray-100 active:scale-95 disabled:opacity-60 shadow-xl overflow-hidden"
                >
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/5 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                  {googleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                  )}
                  Continuar com Google
                </button>

                {loginSuccess && (
                  <a
                    href="https://wa.me/55?text=Olá, acabei de fazer login no IA PLAY e gostaria de ativar meu acesso PRO. Segue o comprovante."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-4 text-base font-bold text-white transition-all hover:brightness-110 hover:-translate-y-1 active:translate-y-0 shadow-lg animate-in fade-in zoom-in duration-500"
                  >
                    <MessageSquare className="h-5 w-5" />
                    Enviar comprovante no WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* LOGIN/FREE FORM SECTION (Right Column on Desktop) */}
          <div className="flex flex-col gap-6">
            <div className="glass-panel rounded-[2rem] border-white/5 p-8 md:p-10 shadow-2xl backdrop-blur-3xl relative overflow-hidden h-full flex flex-col">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {mode === "login" && "Login por e-mail"}
                    {mode === "signup" && "Criar Conta Gratuita"}
                    {mode === "forgot" && "Recuperar Senha"}
                  </h2>
                </div>
                <div className="h-1 w-12 bg-primary rounded-full" />
              </div>

              <form onSubmit={handle} className="space-y-5">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</label>
                    <div className="relative group">
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full rounded-2xl bg-white/5 px-4 py-4 text-sm text-white outline-none border border-white/10 transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus:bg-white/10"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">E-mail</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full rounded-2xl bg-white/5 pl-12 pr-4 py-4 text-sm text-white outline-none border border-white/10 transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus:bg-white/10"
                    />
                  </div>
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Senha</label>
                      {mode === "login" && (
                        <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary font-bold hover:underline transition-all">
                          Esqueceu?
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-2xl bg-white/5 pl-12 pr-12 py-4 text-sm text-white outline-none border border-white/10 transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus:bg-white/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                {info && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary animate-in fade-in slide-in-from-top-2 font-medium">
                    {info}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-black uppercase tracking-[0.2em] text-primary-foreground shadow-glow-primary transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 overflow-hidden"
                >
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    mode === "login" ? "Entrar" : mode === "signup" ? "Criar Conta" : "Enviar Link"
                  )}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-4 text-center">
                {mode === "login" ? (
                  <>
                    <div className="text-sm text-muted-foreground">Ainda não é Pro?</div>
                    <button 
                      onClick={() => setMode("signup")}
                      className="group flex items-center justify-center gap-2 text-primary font-black uppercase tracking-widest hover:brightness-125 transition-all"
                    >
                      <UserPlus className="h-4 w-4" />
                      Criar Conta Gratuita
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setMode("login")}
                    className="group flex items-center justify-center gap-2 text-primary font-black uppercase tracking-widest hover:brightness-125 transition-all"
                  >
                    <ArrowRight className="h-4 w-4 rotate-180" />
                    Voltar para Login
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FREE PLAN FEATURES SECTION */}
        <div className="w-full space-y-8 pb-12">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-white">Ainda não possui o PRO?</h3>
            <p className="text-muted-foreground">Crie gratuitamente sua conta e experimente nossos agentes de IA.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Zap className="h-5 w-5 text-warn" />, title: "Diversos Agentes", desc: "IA configurada para marketing" },
              { icon: <Sparkles className="h-5 w-5 text-primary" />, title: "Acesso Imediato", desc: "Comece a usar agora mesmo" },
              { icon: <Star className="h-5 w-5 text-emerald" />, title: "Plano Gratuito", desc: "Limite diário de uso vitalício" },
              { icon: <ShieldCheck className="h-5 w-5 text-blue-400" />, title: "Upgrade Fácil", desc: "Migre para o PRO quando quiser" }
            ].map((item, i) => (
              <div key={i} className="glass-panel p-6 rounded-3xl border-white/5 flex flex-col items-center text-center gap-3 transition-transform hover:scale-105">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{item.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center px-6 py-4 rounded-2xl bg-white/5 border border-white/5 max-w-2xl mx-auto">
            <p className="text-xs text-muted-foreground italic">
              * Usuários gratuitos possuem limite diário de uso. Ao atingir o limite, o sistema solicitará upgrade para o plano PRO.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, MessageCircle, Sparkles, ArrowLeft } from "lucide-react";
import { LogoWordmark } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { FREE_MONTHLY_SEARCH_LIMIT } from "@/lib/profile.functions";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — Busca Mágica" },
      { name: "description", content: "Busca Mágica Free ou Pro. Prospecte comércios locais com auditoria digital, exportação CSV e mais." },
      { property: "og:title", content: "Busca Mágica — Planos" },
      { property: "og:description", content: "Escolha Free ou Pro. Buscas ilimitadas e exportação CSV no Pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Planos,
});

// Configurável: para onde o botão "Fale com a gente" leva.
const CONTACT_WHATSAPP = "https://wa.me/5511999999999?text=Quero+liberar+o+plano+Pro+do+Busca+M%C3%A1gica";

function Planos() {
  const { isPro, profile } = useAuth();
  const freeItems = [`${FREE_MONTHLY_SEARCH_LIMIT} buscas por mês`, "Auditoria digital básica", "Favoritos e histórico local"];
  const proItems = ["Buscas ilimitadas", "Exportação CSV liberada", "Prioridade nos dados de auditoria", "Histórico completo"];

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <LogoWordmark />
      </nav>

      <header className="mx-auto mt-10 max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" /> Planos
        </div>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Escolha o plano que combina com você</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sem pegadinhas. Sem cartão de crédito no Free.</p>
        {profile && (
          <p className="mt-3 text-xs text-muted-foreground">
            Você está no plano <span className="font-bold text-primary">{isPro ? "Pro" : "Free"}</span>
            {!isPro && (
              <> — usou {profile.search_count_month}/{FREE_MONTHLY_SEARCH_LIMIT} buscas este mês.</>
            )}
          </p>
        )}
      </header>

      <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2">
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-xl font-bold">Free</h2>
          <p className="mt-1 text-xs text-muted-foreground">Para começar a explorar.</p>
          <p className="mt-4 text-3xl font-extrabold">R$ 0<span className="text-sm text-muted-foreground">/mês</span></p>
          <ul className="mt-5 space-y-2 text-sm">
            {freeItems.map((f) => (
              <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" />{f}</li>
            ))}
          </ul>
        </div>

        <div className="glass-panel rounded-2xl border-primary/50 p-6 ring-1 ring-primary/30 neon-primary">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary">Pro</h2>
            <span className="rounded-full bg-warn/20 px-2 py-0.5 text-[10px] font-bold uppercase text-warn">Recomendado</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Para quem prospecta sério.</p>
          <p className="mt-4 text-3xl font-extrabold">Sob consulta</p>
          <ul className="mt-5 space-y-2 text-sm">
            {proItems.map((f) => (
              <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" />{f}</li>
            ))}
          </ul>
          {isPro ? (
            <div className="mt-6 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-center text-sm font-semibold text-primary">
              ✓ Você já é Pro
            </div>
          ) : (
            <a
              href={CONTACT_WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110"
            >
              <MessageCircle className="h-4 w-4" /> Fale com a gente para liberar
            </a>
          )}
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
        O upgrade é liberado manualmente pela equipe. Em breve teremos checkout automático.
      </p>
    </div>
  );
}

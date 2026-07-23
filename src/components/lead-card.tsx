import { Copy, MapPin, MessageCircle, Sparkles, TrendingDown } from "lucide-react";
import type { AnalyzedLead } from "@/lib/analyze-lead";

const STATUS_MAP = {
  red: {
    label: "Crítico",
    dot: "bg-destructive",
    ring: "ring-destructive/40",
    text: "text-destructive",
    glow: "shadow-[0_0_30px_-8px_var(--destructive)]",
  },
  yellow: {
    label: "Atenção",
    dot: "bg-warn",
    ring: "ring-warn/40",
    text: "text-warn",
    glow: "",
  },
  green: {
    label: "Saudável",
    dot: "bg-emerald",
    ring: "ring-emerald/40",
    text: "text-emerald",
    glow: "",
  },
} as const;

function OpportunityScore({ score }: { score: number }) {
  // score baixo = oportunidade alta
  const opportunity = 100 - score;
  const color = opportunity >= 50 ? "text-emerald" : opportunity >= 25 ? "text-warn" : "text-muted-foreground";
  return (
    <div className="flex items-baseline gap-1">
      <TrendingDown className={`h-4 w-4 ${color}`} />
      <span className={`font-bold text-2xl tabular-nums ${color}`}>{opportunity}</span>
      <span className="text-xs text-muted-foreground">/100</span>
    </div>
  );
}

export function LeadCard({ lead }: { lead: AnalyzedLead }) {
  const status = STATUS_MAP[lead.status];

  const copyEmail = () => {
    const email = lead.email ?? `contato@${(lead.name || "lead").toLowerCase().replace(/\s+/g, "")}.com.br`;
    navigator.clipboard.writeText(email);
  };

  const openWhats = () => {
    const raw = (lead.whatsapp ?? lead.phone ?? "").replace(/\D/g, "");
    if (!raw) return;
    const msg = encodeURIComponent(
      `Olá ${lead.name}, vi que sua presença digital tem oportunidades de melhoria. Podemos conversar?`,
    );
    window.open(`https://wa.me/55${raw}?text=${msg}`, "_blank");
  };

  return (
    <article
      className={`glass-panel group relative flex flex-col gap-4 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 ${status.glow}`}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${status.dot} ring-4 ${status.ring}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${status.text}`}>
              {status.label}
            </span>
            {lead.category && (
              <span className="text-[11px] text-muted-foreground">· {lead.category}</span>
            )}
          </div>
          <h3 className="mt-1.5 truncate text-lg font-bold text-foreground">{lead.name}</h3>
          {lead.address && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="truncate">{lead.address}</span>
            </p>
          )}
        </div>
        <div className="shrink-0 rounded-xl bg-glass px-3 py-2 text-right ring-1 ring-border">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Oportunidade</div>
          <OpportunityScore score={lead.score_lead} />
        </div>
      </header>

      {lead.signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {lead.signals.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive ring-1 ring-destructive/20"
            >
              <Sparkles className="h-3 w-3" />
              {s}
            </span>
          ))}
        </div>
      )}

      <footer className="flex gap-2 pt-1">
        <button
          onClick={openWhats}
          disabled={!(lead.whatsapp ?? lead.phone)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald px-3 py-2.5 text-sm font-semibold text-emerald-foreground transition-all hover:brightness-110 hover:neon-emerald disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </button>
        <button
          onClick={copyEmail}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary/15 px-3 py-2.5 text-sm font-semibold text-foreground ring-1 ring-primary/30 transition-all hover:bg-primary/25"
        >
          <Copy className="h-4 w-4" />
          E-mail
        </button>
      </footer>
    </article>
  );
}

import { useState } from "react";
import {
  Copy,
  MapPin,
  MessageCircle,
  Sparkles,
  TrendingDown,
  Zap,
  ScrollText,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { AnalyzedLead } from "@/lib/analyze-lead";
import { runAudit, generateScript, type AuditResult } from "@/lib/audit-lead";

const STATUS_MAP = {
  red: {
    label: "Quente",
    dot: "bg-primary",
    ring: "ring-primary/40",
    text: "text-primary",
    glow: "shadow-[0_0_30px_-10px_var(--primary)]",
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
    dot: "bg-muted-foreground",
    ring: "ring-muted-foreground/30",
    text: "text-muted-foreground",
    glow: "",
  },
} as const;

function OpportunityScore({ score }: { score: number }) {
  const opportunity = 100 - score;
  const color =
    opportunity >= 50
      ? "text-emerald"
      : opportunity >= 25
        ? "text-warn"
        : "text-muted-foreground";
  return (
    <div className="flex items-baseline gap-1">
      <TrendingDown className={`h-4 w-4 ${color}`} />
      <span className={`font-bold text-2xl tabular-nums ${color}`}>{opportunity}</span>
      <span className="text-xs text-muted-foreground">/100</span>
    </div>
  );
}

function AuditSkeleton() {
  return (
    <div className="space-y-2 rounded-xl bg-glass p-3 ring-1 ring-border">
      <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
    </div>
  );
}

function AuditPanel({ result }: { result: AuditResult }) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl bg-glass p-3 ring-1 ring-emerald/25">
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Site</div>
        <div className="mt-1 text-xs font-semibold text-foreground">{result.site_status}</div>
      </div>
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">IG</div>
        <div className="mt-1 text-xs font-semibold text-foreground">
          {result.last_ig_post_days == null ? "—" : `${result.last_ig_post_days}d`}
        </div>
      </div>
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Whats</div>
        <div className="mt-1 text-xs font-semibold text-foreground">
          {result.whatsapp_active ? "ativo" : "não"}
        </div>
      </div>
    </div>
  );
}

interface Props {
  lead: AnalyzedLead;
  distanceKm?: number;
  selected?: boolean;
  onSelect?: () => void;
}

export function LeadCard({ lead, distanceKm, selected, onSelect }: Props) {
  const status = STATUS_MAP[lead.status];
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const doAudit = async () => {
    setAuditing(true);
    try {
      const res = await runAudit(lead);
      setAudit(res);
    } finally {
      setAuditing(false);
    }
  };

  const doScript = async () => {
    const text = generateScript(lead);
    setScript(text);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const copyEmail = () => {
    const email =
      lead.email ?? `contato@${(lead.name || "lead").toLowerCase().replace(/\s+/g, "")}.com.br`;
    navigator.clipboard.writeText(email);
  };

  const openWhats = () => {
    const raw = (lead.whatsapp ?? lead.phone ?? "").replace(/\D/g, "");
    if (!raw) return;
    const msg = encodeURIComponent(script ?? generateScript(lead));
    window.open(`https://wa.me/55${raw}?text=${msg}`, "_blank");
  };

  return (
    <article
      onClick={onSelect}
      className={`glass-panel group relative flex cursor-pointer flex-col gap-3 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 ${
        selected ? "border-primary/60 ring-2 ring-primary/40" : ""
      } ${status.glow}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${status.dot} ring-4 ${status.ring}`} />
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${status.text}`}
            >
              {status.label}
            </span>
            {lead.category && (
              <span className="text-[11px] text-muted-foreground">· {lead.category}</span>
            )}
            {distanceKm != null && (
              <span className="ml-auto text-[11px] font-medium text-muted-foreground">
                {distanceKm.toFixed(1)} km
              </span>
            )}
          </div>
          <h3 className="mt-1.5 truncate text-base font-bold text-foreground">{lead.name}</h3>
          {lead.address && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="truncate">{lead.address}</span>
            </p>
          )}
        </div>
        <div className="shrink-0 rounded-xl bg-glass px-2.5 py-1.5 text-right ring-1 ring-border">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Oport.</div>
          <OpportunityScore score={lead.score_lead} />
        </div>
      </header>

      {lead.signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {lead.signals.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1 rounded-full bg-warn/10 px-2.5 py-0.5 text-[11px] font-medium text-warn ring-1 ring-warn/30"
            >
              <Sparkles className="h-3 w-3" />
              {s}
            </span>
          ))}
        </div>
      )}

      {auditing && <AuditSkeleton />}
      {!auditing && audit && <AuditPanel result={audit} />}

      {script && (
        <div className="max-h-32 overflow-y-auto rounded-xl bg-primary/5 p-3 text-xs leading-relaxed text-foreground/90 ring-1 ring-primary/20 whitespace-pre-wrap">
          {script}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            doAudit();
          }}
          disabled={auditing}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-primary/15 px-3 py-2 text-xs font-semibold text-foreground ring-1 ring-primary/30 transition-all hover:bg-primary/25 disabled:opacity-60"
        >
          {auditing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          {audit ? "Reauditar" : "Auditar Agora"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            doScript();
          }}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-glass px-3 py-2 text-xs font-semibold text-foreground ring-1 ring-border transition-all hover:bg-white/5"
        >
          {copied ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald" />
          ) : (
            <ScrollText className="h-3.5 w-3.5" />
          )}
          {copied ? "Copiado" : "Gerar Script"}
        </button>
      </div>

      <footer className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            openWhats();
          }}
          disabled={!(lead.whatsapp ?? lead.phone)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald px-3 py-2 text-xs font-semibold text-emerald-foreground transition-all hover:brightness-110 hover:neon-emerald disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyEmail();
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-glass px-3 py-2 text-xs font-semibold text-foreground ring-1 ring-border transition-all hover:bg-white/5"
        >
          <Copy className="h-3.5 w-3.5" />
          E-mail
        </button>
      </footer>
    </article>
  );
}

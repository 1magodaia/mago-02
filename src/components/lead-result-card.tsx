import { useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Instagram,
  Loader2,
  MessageCircle,
  Phone,
  Star,
  Zap,
} from "lucide-react";
import type { ScoredLead } from "@/lib/scoring";
import { auditWebsite } from "@/lib/audit.functions";
import { scoreLead } from "@/lib/scoring";
import {
  isContacted as chkContacted,
  isFavorite as chkFav,
  toggleContacted,
  toggleFavorite,
  type SavedLead,
} from "@/lib/storage";

const STATUS_META = {
  hot: { label: "Oportunidade quente", color: "text-primary", bg: "bg-primary/15", ring: "ring-primary/50", dot: "bg-primary" },
  warm: { label: "Atenção", color: "text-warn", bg: "bg-warn/10", ring: "ring-warn/40", dot: "bg-warn" },
  cold: { label: "Saudável", color: "text-muted-foreground", bg: "bg-muted", ring: "ring-border", dot: "bg-muted-foreground" },
} as const;

interface Props {
  lead: ScoredLead;
  selected?: boolean;
  onSelect?: () => void;
  onUpdate?: (updated: ScoredLead) => void;
}

function toSaved(lead: ScoredLead): SavedLead {
  return {
    place_id: lead.place_id,
    name: lead.name,
    address: lead.address,
    phone: lead.phone,
    website: lead.website,
    google_maps_uri: lead.google_maps_uri,
    saved_at: new Date().toISOString(),
  };
}

export function LeadResultCard({ lead, selected, onSelect, onUpdate }: Props) {
  const meta = STATUS_META[lead.status];
  const [auditing, setAuditing] = useState(false);
  const [fav, setFav] = useState(() => chkFav(lead.place_id));
  const [done, setDone] = useState(() => chkContacted(lead.place_id));
  const [copied, setCopied] = useState<"phone" | "wa" | null>(null);

  const runAudit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.website) return;
    setAuditing(true);
    try {
      const audit = await auditWebsite({ data: { website: lead.website, phone: lead.phone ?? undefined } });
      onUpdate?.(scoreLead(lead, audit));
    } catch (err) {
      console.error(err);
    } finally {
      setAuditing(false);
    }
  };

  const doFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(toSaved(lead));
    setFav((v) => !v);
  };
  const doDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleContacted(toSaved(lead));
    setDone((v) => !v);
  };

  const copy = async (kind: "phone" | "wa", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* ignore */ }
  };

  const waLink = lead.audit?.whatsapp_link ?? (lead.phone
    ? `https://wa.me/${(lead.phone.startsWith("+") ? lead.phone : `55${lead.phone}`).replace(/\D/g, "")}`
    : null);

  return (
    <article
      onClick={onSelect}
      className={`glass-panel group relative flex cursor-pointer flex-col gap-3 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 ${selected ? "border-primary/60 ring-2 ring-primary/40" : ""}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${meta.bg} ${meta.color} ${meta.ring}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            {!lead.website && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warn ring-1 ring-warn/40">
                <Flame className="h-2.5 w-2.5" /> Sem site
              </span>
            )}
            {lead.rating != null && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <Star className="h-3 w-3 text-warn" fill="currentColor" />
                {lead.rating.toFixed(1)} ({lead.user_ratings_total ?? 0})
              </span>
            )}
          </div>
          <h3 className="mt-1.5 truncate text-base font-bold text-foreground">{lead.name}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{lead.address}</p>
        </div>
        <div className="shrink-0 rounded-xl bg-glass px-2.5 py-1.5 text-center ring-1 ring-border">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Oport.</div>
          <div className={`font-extrabold text-2xl tabular-nums ${meta.color}`}>{lead.opportunity_score}</div>
        </div>
      </header>

      {lead.reasons.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {lead.reasons.slice(0, 3).map((r) => (
            <li key={r} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border">
              {r}
            </li>
          ))}
        </ul>
      )}

      {lead.audit && (
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-glass p-2.5 ring-1 ring-border text-center">
          <div>
            <div className="text-[9px] uppercase text-muted-foreground">Site</div>
            <div className={`text-xs font-semibold ${lead.audit.site_reachable ? "text-primary" : "text-warn"}`}>
              {lead.audit.site_reachable ? "Online" : (lead.audit.site_status_code ?? "off")}
            </div>
          </div>
          <div title="Estimado via sitemap.xml">
            <div className="text-[9px] uppercase text-muted-foreground">Atividade*</div>
            <div className="text-xs font-semibold text-foreground">
              {lead.audit.approx_stale_days == null ? "—" : `${lead.audit.approx_stale_days}d`}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-muted-foreground">Social</div>
            <div className="flex items-center justify-center gap-1 text-xs">
              {lead.audit.instagram ? <Instagram className="h-3 w-3 text-primary" /> : <span className="text-muted-foreground">—</span>}
              {lead.audit.whatsapp_link && <MessageCircle className="h-3 w-3 text-primary" />}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        {lead.website && (
          <button
            onClick={runAudit}
            disabled={auditing}
            className="flex items-center justify-center gap-1 rounded-lg bg-primary/15 px-2 py-1.5 text-[11px] font-semibold text-primary ring-1 ring-primary/30 hover:bg-primary/25 disabled:opacity-60"
          >
            {auditing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            {lead.audit ? "Reauditar" : "Auditar"}
          </button>
        )}
        {lead.website && (
          <a
            href={lead.website}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1 rounded-lg bg-glass px-2 py-1.5 text-[11px] font-semibold text-foreground ring-1 ring-border hover:bg-white/5"
          >
            <Globe className="h-3 w-3" /> Site
          </a>
        )}
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1 rounded-lg bg-glass px-2 py-1.5 text-[11px] font-semibold text-foreground ring-1 ring-border hover:bg-white/5"
          >
            <Phone className="h-3 w-3" /> Ligar
          </a>
        )}
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1 rounded-lg bg-primary px-2 py-1.5 text-[11px] font-semibold text-primary-foreground hover:brightness-110"
          >
            <MessageCircle className="h-3 w-3" /> Whats
          </a>
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex gap-1.5">
          {lead.phone && (
            <button
              onClick={(e) => { e.stopPropagation(); copy("phone", lead.phone!); }}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-white/5"
            >
              {copied === "phone" ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
              telefone
            </button>
          )}
          {lead.google_maps_uri && (
            <a
              href={lead.google_maps_uri}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-white/5"
            >
              <ExternalLink className="h-3 w-3" /> maps
            </a>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={doFav}
            title={fav ? "Remover favorito" : "Favoritar"}
            className={`rounded-md p-1.5 ring-1 ${fav ? "bg-warn/15 text-warn ring-warn/40" : "bg-glass ring-border hover:bg-white/5"}`}
          >
            {fav ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={doDone}
            title={done ? "Marcar como não contatado" : "Marcar como contatado"}
            className={`rounded-md p-1.5 ring-1 ${done ? "bg-primary/15 text-primary ring-primary/40" : "bg-glass ring-border hover:bg-white/5"}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </footer>
    </article>
  );
}

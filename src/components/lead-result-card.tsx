import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  HelpCircle,
  Instagram,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Star,
  Zap,
} from "lucide-react";
import type { ScoredLead } from "@/lib/scoring";
import { auditWebsite } from "@/lib/audit.functions";
import { refreshPlace } from "@/lib/places.functions";
import { scoreLead } from "@/lib/scoring";
import { lookupCitations, type CitationItem } from "@/lib/citations.functions";
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

function relTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return null;
  const min = Math.floor(ms / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `há ${mo} mês${mo > 1 ? "es" : ""}`;
  const y = Math.floor(mo / 12);
  return `há ${y} ano${y > 1 ? "s" : ""}`;
}

export function LeadResultCard({ lead, selected, onSelect, onUpdate }: Props) {
  const meta = STATUS_META[lead.status];
  const [auditing, setAuditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshErr, setRefreshErr] = useState<string | null>(null);
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

  const runRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshing(true);
    setRefreshErr(null);
    try {
      const resp = await refreshPlace({ data: { place_id: lead.place_id } });
      if (resp.error || !resp.place) {
        setRefreshErr(resp.error ?? "Não foi possível atualizar.");
        return;
      }
      // Preserva a auditoria anterior — refresh só re-lê o Google Places.
      onUpdate?.(scoreLead(resp.place, lead.audit));
    } catch (err) {
      setRefreshErr(err instanceof Error ? err.message : "Falha na atualização.");
    } finally {
      setRefreshing(false);
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

  const collectedAgo = relTime(lead.collected_at);
  const lastReviewAgo = relTime(lead.latest_review_at);
  // Instagram: sinal só é confiável quando o site foi auditado.
  const igStatus: "found" | "not_found_on_site" | "unverifiable" = lead.audit?.instagram
    ? "found"
    : lead.audit && lead.website
      ? "not_found_on_site"
      : "unverifiable";


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
            {lead.website ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary ring-1 ring-primary/30" title="Site confirmado no Google Places">
                <CheckCircle2 className="h-2.5 w-2.5" /> Com site
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warn ring-1 ring-warn/40">
                <Flame className="h-2.5 w-2.5" /> Sem site
              </span>
            )}
            {igStatus === "found" && (
              <a
                href={lead.audit!.instagram!}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary ring-1 ring-primary/40 hover:bg-primary/25"
                title="Instagram encontrado no site"
              >
                <CheckCircle2 className="h-2.5 w-2.5" /> <Instagram className="h-2.5 w-2.5" /> Instagram
              </a>
            )}
            {igStatus === "not_found_on_site" && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-warn ring-1 ring-warn/30"
                title="Site auditado — nenhum link para Instagram encontrado."
              >
                <Instagram className="h-2.5 w-2.5" /> sem IG no site
              </span>
            )}
            {igStatus === "unverifiable" && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground ring-1 ring-border"
                title="Sem site conhecido — não conseguimos confirmar Instagram por fonte pública."
              >
                <HelpCircle className="h-2.5 w-2.5" /> <Instagram className="h-2.5 w-2.5" /> não verificável
              </span>
            )}
            {lead.rating != null && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Star className="h-3 w-3 text-warn" fill="currentColor" />
                <span className="font-semibold text-foreground">{lead.rating.toFixed(1)}</span>
                <span>({lead.user_ratings_total ?? 0})</span>
                {lastReviewAgo && (
                  <span className="text-muted-foreground">· última avaliação {lastReviewAgo}</span>
                )}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 truncate text-base font-bold text-foreground">{lead.name}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{lead.address}</p>
          {collectedAgo && (
            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/80">
              <RefreshCw className="h-2.5 w-2.5" aria-hidden />
              Dados atualizados {collectedAgo}
              {refreshErr && <span className="text-warn">· {refreshErr}</span>}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            onClick={runRefresh}
            disabled={refreshing}
            title="Atualizar dados deste lead (não conta na cota mensal)"
            aria-label="Atualizar este lead"
            className="rounded-md bg-glass p-1.5 text-muted-foreground ring-1 ring-border hover:text-primary hover:ring-primary/40 disabled:opacity-60"
          >
            {refreshing
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <RefreshCw className="h-3 w-3" />}
          </button>
          <div className="rounded-xl bg-glass px-2.5 py-1.5 text-center ring-1 ring-border">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Oport.</div>
            <div className={`font-extrabold text-2xl tabular-nums ${meta.color}`}>{lead.opportunity_score}</div>
          </div>
        </div>
      </header>

      {lead.latest_review_at && (() => {
        const days = Math.floor((Date.now() - Date.parse(lead.latest_review_at)) / 86400000);
        if (!Number.isFinite(days) || days <= 180) return null;
        return (
          <div className="flex items-center gap-2 rounded-lg border border-warn/40 bg-warn/10 px-2.5 py-1.5 text-[11px] font-semibold text-warn">
            <Flame className="h-3 w-3 shrink-0" />
            Sem avaliações novas há mais de {Math.floor(days / 30)} meses — sinal de baixa atividade.
          </div>
        );
      })()}




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
            <div
              className="flex items-center justify-center gap-1 text-xs"
              title={
                lead.audit!.instagram
                  ? "Instagram detectado no site"
                  : "Site auditado — nenhum link para Instagram encontrado na página"
              }
            >
              {lead.audit!.instagram
                ? <Instagram className="h-3 w-3 text-primary" />
                : <span className="inline-flex items-center gap-0.5 text-muted-foreground"><Instagram className="h-3 w-3" /><HelpCircle className="h-2.5 w-2.5" /></span>}
              {lead.audit!.whatsapp_link && <MessageCircle className="h-3 w-3 text-primary" />}
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

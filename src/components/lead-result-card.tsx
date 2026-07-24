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
import { Highlight } from "@/lib/highlight";
import { HelpTip } from "@/components/help-tip";
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
  /** true quando o kill switch está ON e o usuário atual é Pro (ou admin/master). */
  citationsAvailable?: boolean;
  /** Termos a destacar (accent/case-insensitive) no nome e endereço. */
  highlight?: string[];
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
    price_level: lead.price_level ?? null,
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

export function LeadResultCard({ lead, selected, onSelect, onUpdate, citationsAvailable, highlight }: Props) {
  const meta = STATUS_META[lead.status];
  const [auditing, setAuditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshErr, setRefreshErr] = useState<string | null>(null);
  const [fav, setFav] = useState(() => chkFav(lead.place_id));
  const [done, setDone] = useState(() => chkContacted(lead.place_id));
  const [copied, setCopied] = useState<"phone" | "wa" | null>(null);
  const [citations, setCitations] = useState<{
    items: CitationItem[];
    summary: string;
    cached: boolean;
    remaining?: number;
  } | null>(null);
  const [citLoading, setCitLoading] = useState(false);
  const [citError, setCitError] = useState<string | null>(null);
  const runCitations = useServerFn(lookupCitations);

  const doCitations = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCitLoading(true);
    setCitError(null);
    try {
      const r = await runCitations({
        data: {
          place_id: lead.place_id,
          name: lead.name,
          address: lead.address ?? null,
        },
      });
      setCitations({ items: r.items, summary: r.summary, cached: r.cached, remaining: r.remaining_today });
    } catch (err) {
      setCitError(err instanceof Error ? err.message : "Falha ao buscar citações.");
    } finally {
      setCitLoading(false);
    }
  };

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
  // Fonte do WhatsApp: "site" = link real encontrado no HTML; "phone" = derivado do telefone (presunção).
  const waSource: "site" | "phone" | null = lead.audit?.whatsapp_source ?? (waLink && lead.phone ? "phone" : null);
  const waVerified = waSource === "site";

  const collectedAgo = relTime(lead.collected_at);
  const lastReviewAgo = relTime(lead.latest_review_at);
  // Instagram: sinal só é confiável quando o site foi auditado.
  const igStatus: "found" | "not_found_on_site" | "unverifiable" = lead.audit?.instagram
    ? "found"
    : lead.audit && lead.website
      ? "not_found_on_site"
      : "unverifiable";


  const permanentlyClosed = lead.business_status === "CLOSED_PERMANENTLY";

  return (
    <article
      onClick={onSelect}
      className={`glass-panel group relative flex cursor-pointer flex-col gap-3 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 ${selected ? "border-primary/60 ring-2 ring-primary/40" : ""} ${permanentlyClosed ? "opacity-60 grayscale" : ""}`}
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
              >
                <HelpCircle className="h-2.5 w-2.5" /> <Instagram className="h-2.5 w-2.5" /> não verificável
                <HelpTip
                  title="Não verificável"
                  text="Não temos como confirmar esse dado com uma fonte confiável — não significa que o comércio não tenha, só que não conseguimos checar."
                />
              </span>
            )}
            {lead.rating != null && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Star className="h-3 w-3 text-warn" fill="currentColor" />
                <span className="font-semibold text-foreground">{lead.rating.toFixed(1)}</span>
                <span>({lead.user_ratings_total ?? 0})</span>
                {lastReviewAgo && (
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    · última avaliação {lastReviewAgo}
                    <HelpTip
                      title="Última avaliação"
                      text="Data da avaliação mais recente feita no Google — nosso sinal mais confiável de que o comércio está ativo."
                    />
                  </span>
                )}
              </span>
            )}
            <PriceLevelBadge level={lead.price_level ?? null} />
            <BusinessStatusBadge status={lead.business_status ?? null} />
          </div>
          <h3 className="mt-1.5 truncate text-base font-bold text-foreground">
            <Highlight text={lead.name} terms={highlight ?? []} />
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            <Highlight text={lead.address} terms={highlight ?? []} />
          </p>
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
      <TierSuggestion tier={lead.tier} suggestion={lead.tier_suggestion} />


      {lead.reasons.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {lead.reasons.slice(0, 3).map((r) => (
            <li key={r} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border">
              {r}
            </li>
          ))}
        </ul>
      )}

      {lead.audit && <CnpjBlock info={lead.audit.cnpj_info} />}
      {lead.audit && <EmailBlock email={lead.audit.email} />}


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
          <div className="flex items-center gap-0.5">
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={waVerified
                ? "Link de WhatsApp encontrado no site oficial"
                : "Presumido a partir do telefone do Google — pode não ser WhatsApp"}
              className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold ${waVerified ? "bg-primary text-primary-foreground hover:brightness-110" : "bg-primary/30 text-primary-foreground ring-1 ring-warn/40 hover:bg-primary/40"}`}
            >
              <MessageCircle className="h-3 w-3" /> {waVerified ? "Whats" : "Whats?"}
            </a>
            <HelpTip
              title={waVerified ? "WhatsApp confirmado" : "WhatsApp presumido"}
              text="Quando vem do site do comércio, já testamos que é um link de WhatsApp real. Quando vem só do telefone, é uma suposição — pode não ter WhatsApp nesse número."
            />
          </div>
        )}
      </div>

      {citationsAvailable && (
        <div className="rounded-xl bg-glass p-2.5 ring-1 ring-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <Search className="h-3 w-3 text-warn" /> Citações na web (IA)
            </div>
            <button
              onClick={doCitations}
              disabled={citLoading}
              className="inline-flex items-center gap-1 rounded-lg bg-warn/15 px-2 py-1 text-[11px] font-semibold text-warn ring-1 ring-warn/40 hover:bg-warn/25 disabled:opacity-60"
            >
              {citLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              {citations ? "Buscar novamente" : "Buscar citações"}
            </button>
          </div>
          {citError && <p className="mt-1.5 text-[11px] text-warn">{citError}</p>}
          {citations && (
            <div className="mt-2 space-y-1.5">
              {citations.summary && <p className="text-[11px] text-muted-foreground">{citations.summary}</p>}
              <ul className="space-y-1">
                {citations.items.map((it, i) => (
                  <li key={i} className="flex items-start justify-between gap-2 rounded-md bg-white/5 px-2 py-1 text-[11px]">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-foreground">{it.source}</div>
                      {it.snippet && <div className="truncate text-muted-foreground">{it.snippet}</div>}
                    </div>
                    {it.url && (
                      <a
                        href={it.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 text-primary hover:underline"
                      >
                        abrir
                      </a>
                    )}
                  </li>
                ))}
                {citations.items.length === 0 && (
                  <li className="text-[11px] text-muted-foreground">Nenhuma citação relevante encontrada.</li>
                )}
              </ul>
              <p className="text-[10px] text-muted-foreground">
                {citations.cached ? "resultado em cache (7 dias)" : "resultado novo"}
                {typeof citations.remaining === "number" && ` · restam ${citations.remaining} hoje`}
              </p>
            </div>
          )}
        </div>
      )}

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

const PRICE_LABELS: Record<number, string> = {
  0: "Grátis",
  1: "Econômico",
  2: "Moderado",
  3: "Caro",
  4: "Muito caro",
};

function PriceLevelBadge({ level }: { level: number | null }) {
  const helper = (
    <HelpTip
      title="Faixa de preço"
      text="Classificação de preço feita pelo próprio Google, não é um valor exato em reais."
    />
  );
  if (level == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground ring-1 ring-border">
        💰 Faixa de preço: não informada
        {helper}
      </span>
    );
  }
  const symbols = level === 0 ? "Grátis" : "$".repeat(Math.max(1, level));
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-[10px] font-bold uppercase text-warn ring-1 ring-warn/30">
      💰 {symbols} · {PRICE_LABELS[level]}
      {helper}
    </span>
  );
}

const TIER_META = {
  high:   { label: "Oportunidade alta",  dot: "bg-emerald-400",  ring: "ring-emerald-400/40", bg: "bg-emerald-500/10",  text: "text-emerald-300" },
  medium: { label: "Oportunidade média", dot: "bg-amber-400",    ring: "ring-amber-400/40",   bg: "bg-amber-500/10",    text: "text-amber-200" },
  low:    { label: "Oportunidade baixa", dot: "bg-orange-400",   ring: "ring-orange-400/40",  bg: "bg-orange-500/10",   text: "text-orange-200" },
} as const;

function TierSuggestion({ tier, suggestion }: { tier: "high" | "medium" | "low"; suggestion: string }) {
  const m = TIER_META[tier];
  return (
    <div className={`flex items-start gap-2 rounded-xl px-3 py-2 ring-1 ${m.bg} ${m.ring}`}>
      <span className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${m.text} ${m.ring} bg-black/20 shrink-0`}>
        <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
        {m.label}
        <HelpTip
          title="Como lemos o score"
          text="Verde = comércio sem presença digital, mais fácil de converter. Amarelo = tem algo, mas incompleto. Laranja = já tem bastante presença digital, oportunidade menor."
        />
      </span>
      <p className={`text-[11px] leading-snug ${m.text}`}>
        <span className="font-semibold">Sugestão:</span> {suggestion}
      </p>
    </div>
  );
}

function BusinessStatusBadge({ status }: { status: string | null }) {
  const helper = (
    <HelpTip
      title="Status do comércio"
      text="Informação direta do Google, atualizada quando você clica em 'Atualizar agora' no card."
    />
  );
  if (!status || status === "OPERATIONAL") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300 ring-1 ring-emerald-400/30">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Operando
        {helper}
      </span>
    );
  }
  if (status === "CLOSED_TEMPORARILY") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200 ring-1 ring-amber-400/40">
        ⏸ Fechado temporariamente
        {helper}
      </span>
    );
  }
  if (status === "CLOSED_PERMANENTLY") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-red-300 ring-1 ring-red-400/40">
        ✕ Fechado permanentemente
        {helper}
      </span>
    );
  }
  return null;
}


function EmailBlock({ email }: { email: string | null }) {
  if (!email) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-muted-foreground ring-1 ring-border" title="Nenhum e-mail de contato localizado no site.">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        E-mail: não localizado
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg bg-glass px-2.5 py-1.5 text-[11px] ring-1 ring-border">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
      <a
        href={`mailto:${email}`}
        onClick={(e) => e.stopPropagation()}
        className="truncate font-mono font-semibold text-foreground hover:text-primary hover:underline"
      >
        {email}
      </a>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(email).catch(() => {}); }}
        className="ml-auto rounded p-1 text-muted-foreground hover:text-primary"
        title="Copiar e-mail"
        aria-label="Copiar e-mail"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
}

  if (!info) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-muted-foreground ring-1 ring-border" title="Nenhum CNPJ localizado no site do comércio. Não estimamos esse valor a partir do nome.">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        CNPJ: não localizado
      </div>
    );
  }
  const situacao = info.situacao_cadastral ?? "—";
  const isAtiva = situacao.toLowerCase().startsWith("ativa");
  return (
    <div className="rounded-lg bg-glass px-2.5 py-2 ring-1 ring-border">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="font-mono font-bold text-foreground">{info.cnpj}</span>
        {info.razao_social && <span className="truncate text-muted-foreground">{info.razao_social}</span>}
        <HelpTip
          title="CNPJ / Razão social"
          text="Dado oficial da Receita Federal, encontrado no site do comércio. Pode, em raros casos, pertencer à agência que fez o site em vez do comércio em si — vale conferir se tiver dúvida."
        />
        <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${
          isAtiva ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30" : "bg-red-500/15 text-red-300 ring-red-400/40"
        }`}>{situacao}</span>
      </div>
      {info.data_abertura && (
        <div className="mt-1 text-[10px] text-muted-foreground/80" title="Data de abertura da empresa na Receita Federal (via BrasilAPI). Refere-se à criação da pessoa jurídica e pode não coincidir com o tempo de operação neste endereço específico.">
          Abertura: {new Date(info.data_abertura).toLocaleDateString("pt-BR")} · dado da empresa, não do endereço.
        </div>
      )}
    </div>
  );
}


import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import {
  Search,
  Sparkles,
  Wand2,
  Filter,
  Crosshair,
  MapPin,
  AlertCircle,
  Coins,
} from "lucide-react";
import { analyzeLead, type AnalyzedLead } from "@/lib/analyze-lead";
import { MOCK_LEADS } from "@/lib/mock-leads";
import { LeadCard } from "@/components/lead-card";
import { VersionLog } from "@/components/version-log";
import { haversineKm } from "@/lib/geo";

const MapView = lazy(() => import("@/components/map-view"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Busca Mágica — Prospecção geolocalizada de comércios locais" },
      {
        name: "description",
        content:
          "Encontre comércios próximos com presença digital fraca. Mapa interativo, raio de busca e auditoria sob demanda em tempo real.",
      },
      { property: "og:title", content: "Busca Mágica — Prospecção geolocalizada" },
      {
        property: "og:description",
        content:
          "Mapa + raio de busca + auditoria real-time (site, Instagram, WhatsApp) para marketers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type FilterKey = "all" | "no_site" | "ig_stale" | "no_whats";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "no_site", label: "Sem site" },
  { key: "ig_stale", label: "IG > 90d parado" },
  { key: "no_whats", label: "Sem WhatsApp" },
];

const DEFAULT_CENTER = { lat: -23.5613, lng: -46.6558 }; // Av. Paulista

function Home() {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [locating, setLocating] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [usingGps, setUsingGps] = useState(false);
  const [manualCity, setManualCity] = useState("São Paulo");
  const [category, setCategory] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoDenied(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoDenied(false);
        setUsingGps(true);
        setLocating(false);
      },
      () => {
        setGeoDenied(true);
        setUsingGps(false);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const leads: AnalyzedLead[] = useMemo(() => {
    let list = MOCK_LEADS.map(analyzeLead);
    if (category.trim()) {
      const q = category.trim().toLowerCase();
      list = list.filter(
        (l) => l.category?.toLowerCase().includes(q) || l.name.toLowerCase().includes(q),
      );
    }
    if (filter === "no_site") list = list.filter((l) => !l.has_website);
    if (filter === "ig_stale")
      list = list.filter((l) => (l.instagram_last_post_days ?? 0) > 90);
    if (filter === "no_whats") list = list.filter((l) => !l.has_whatsapp);

    list = list.filter((l) => {
      if (l.latitude == null || l.longitude == null) return false;
      const d = haversineKm(center, { lat: l.latitude, lng: l.longitude });
      return d <= radiusKm;
    });

    return list.sort((a, b) => a.score_lead - b.score_lead);
  }, [category, filter, center, radiusKm]);

  const hotCount = leads.filter((l) => l.status === "red").length;

  return (
    <div className="min-h-screen">
      {/* NAV */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/50 neon-primary">
            <Wand2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold tracking-tight text-foreground">Busca</span>
            <span className="text-lg font-extrabold tracking-tight text-primary">Mágica</span>
            <span className="ml-1 text-[10px] font-semibold text-muted-foreground">v2.1</span>
          </div>
        </div>
        <button className="flex items-center gap-1.5 rounded-full border border-warn/50 bg-warn/10 px-3 py-1.5 text-xs font-bold text-warn transition-all hover:bg-warn/20">
          <Coins className="h-3.5 w-3.5" />
          250 créditos
        </button>
      </nav>

      {/* HERO */}
      <header className="mx-auto max-w-7xl px-6 pt-2 pb-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Prospecção geolocalizada + auditoria real-time
          </div>
          <h1 className="mt-3 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl">
            Comércios que <span className="text-primary">precisam de você</span> —
            num raio de {radiusKm} km.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Localização nativa, mapa interativo e auditoria sob demanda de site,
            Instagram e WhatsApp.
          </p>
        </div>

        {geoDenied && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-4 py-2.5 text-xs text-warn">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Permissão de localização negada. Usando busca por cidade manual — os
              resultados estão centrados em <b>{manualCity}</b>.
            </span>
          </div>
        )}

        {/* CONTROLS */}
        <div className="glass-panel mt-5 grid gap-3 rounded-2xl p-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="flex items-center gap-2 rounded-xl bg-glass px-4 py-2.5 ring-1 ring-border focus-within:ring-primary/60">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <input
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              placeholder="Cidade (fallback)"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl bg-glass px-4 py-2.5 ring-1 ring-border focus-within:ring-primary/60">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoria (padaria, barbearia...)"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <div className="flex items-center gap-3 rounded-xl bg-glass px-4 py-2.5 ring-1 ring-border">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-32 accent-[color:var(--primary)]"
            />
            <span className="min-w-[3ch] text-sm font-bold tabular-nums text-foreground">
              {radiusKm}km
            </span>
          </div>
        </div>

        {/* FILTER CHIPS */}
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground neon-violet"
                    : "bg-glass text-muted-foreground ring-1 ring-border hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-3 text-xs">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold tabular-nums">{leads.length}</span>
              <span className="text-muted-foreground">leads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive ring-2 ring-destructive/30" />
              <span className="font-bold text-destructive">{hotCount}</span>
              <span className="text-muted-foreground">críticos</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAP + LIST */}
      <main className="mx-auto max-w-7xl px-6 pb-12">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass-panel h-[560px] overflow-hidden rounded-2xl p-1">
            <ClientOnly
              fallback={
                <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">
                  Carregando mapa...
                </div>
              }
            >
              <Suspense
                fallback={
                  <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">
                    Carregando mapa...
                  </div>
                }
              >
                <MapView
                  center={center}
                  radiusKm={radiusKm}
                  leads={leads}
                  selectedName={selected}
                  onSelect={setSelected}
                />
              </Suspense>
            </ClientOnly>
          </div>

          <div className="h-[560px] space-y-3 overflow-y-auto pr-1">
            {leads.length === 0 ? (
              <div className="glass-panel grid h-full place-items-center rounded-2xl p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum lead nesse raio. Amplie a busca ou mova o centro.
                </p>
              </div>
            ) : (
              leads.map((lead) => {
                const d =
                  lead.latitude != null && lead.longitude != null
                    ? haversineKm(center, { lat: lead.latitude, lng: lead.longitude })
                    : undefined;
                return (
                  <LeadCard
                    key={lead.name}
                    lead={lead}
                    distanceKm={d}
                    selected={selected === lead.name}
                    onSelect={() => setSelected(lead.name)}
                  />
                );
              })
            )}
          </div>
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-24 text-center text-xs text-muted-foreground">
        Busca Mágica · Protocolo CACA v2.0.0 · Geolocalização + auditoria via webhook
      </footer>

      <VersionLog />
    </div>
  );
}

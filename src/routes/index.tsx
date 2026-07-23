import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import {
  AlertCircle,
  BookmarkCheck,
  Crosshair,
  Download,
  Filter,
  GitBranch,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Star,
  Wand2,
} from "lucide-react";
import { searchPlaces, type PlaceResult } from "@/lib/places.functions";
import { scoreLead, type ScoredLead } from "@/lib/scoring";
import { LeadResultCard } from "@/components/lead-result-card";
import { addHistory, cacheGet, cacheSet, exportToCsv } from "@/lib/storage";
import { haversineKm } from "@/lib/geo";

const MapView = lazy(() => import("@/components/google-map-view"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Busca Mágica — Prospecção de comércios locais" },
      {
        name: "description",
        content:
          "Encontre comércios com presença digital fraca via Google Places. Auditoria de site (WHOIS + sitemap), score de oportunidade e exportação em CSV.",
      },
      { property: "og:title", content: "Busca Mágica — Prospecção geolocalizada" },
      {
        property: "og:description",
        content: "Busca por Google Places, auditoria digital sob demanda e priorização de leads quentes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type SortKey = "score" | "distance" | "rating" | "name";
type SiteFilter = "any" | "no_site" | "with_site";

function Home() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("São Paulo");
  const [radiusKm, setRadiusKm] = useState(5);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: -23.5613, lng: -46.6558 });
  const [usingGps, setUsingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const [siteFilter, setSiteFilter] = useState<SiteFilter>("any");
  const [minRating, setMinRating] = useState(0);
  const [minReviews, setMinReviews] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("score");

  const [rawResults, setRawResults] = useState<ScoredLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const useGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Navegador sem suporte a geolocalização.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUsingGps(true);
        setGpsError(null);
        setLocating(false);
      },
      (err) => {
        setGpsError(err.message || "Permissão negada.");
        setUsingGps(false);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const runSearch = async () => {
    if (!query.trim()) {
      setSearchError("Informe uma categoria (ex: padaria, barbearia).");
      return;
    }
    setLoading(true);
    setSearchError(null);
    const cacheKey = JSON.stringify({
      q: query.trim().toLowerCase(),
      r: usingGps ? "gps" : region.trim().toLowerCase(),
      lat: usingGps ? center.lat.toFixed(3) : null,
      lng: usingGps ? center.lng.toFixed(3) : null,
      rad: radiusKm,
    });
    try {
      let places = cacheGet<PlaceResult[]>(cacheKey);
      if (!places) {
        const resp = await searchPlaces({
          data: {
            query: query.trim(),
            regionText: usingGps ? undefined : region.trim(),
            lat: usingGps ? center.lat : undefined,
            lng: usingGps ? center.lng : undefined,
            radiusKm,
          },
        });
        if (resp.error) setSearchError(resp.error);
        places = resp.results;
        if (places.length) cacheSet(cacheKey, places);
      }
      const scored = places.map((p) => scoreLead(p));
      setRawResults(scored);
      // se não estiver usando GPS, centraliza no primeiro resultado com coord
      if (!usingGps) {
        const first = places.find((p) => p.lat != null && p.lng != null);
        if (first?.lat && first?.lng) setCenter({ lat: first.lat, lng: first.lng });
      }
      addHistory({
        query: query.trim(),
        region: usingGps ? "GPS" : region.trim(),
        radiusKm,
        used_gps: usingGps,
        count: places.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha na busca.";
      setSearchError(msg);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...rawResults];
    if (siteFilter === "no_site") list = list.filter((l) => !l.website);
    if (siteFilter === "with_site") list = list.filter((l) => !!l.website);
    if (minRating > 0) list = list.filter((l) => (l.rating ?? 0) >= minRating);
    if (minReviews > 0) list = list.filter((l) => (l.user_ratings_total ?? 0) >= minReviews);
    list = list.filter((l) => {
      if (l.lat == null || l.lng == null) return true;
      return haversineKm(center, { lat: l.lat, lng: l.lng }) <= radiusKm;
    });
    list.sort((a, b) => {
      if (sortBy === "score") return b.opportunity_score - a.opportunity_score;
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      // distance
      if (a.lat == null || b.lat == null) return 0;
      return (
        haversineKm(center, { lat: a.lat, lng: a.lng! }) -
        haversineKm(center, { lat: b.lat, lng: b.lng! })
      );
    });
    return list;
  }, [rawResults, siteFilter, minRating, minReviews, sortBy, center, radiusKm]);

  const hotCount = filtered.filter((l) => l.status === "hot").length;

  const updateOne = (updated: ScoredLead) => {
    setRawResults((prev) => prev.map((l) => (l.place_id === updated.place_id ? updated : l)));
  };

  const doExport = () => {
    exportToCsv(
      filtered.map((l) => ({
        nome: l.name,
        endereco: l.address,
        telefone: l.phone ?? "",
        whatsapp: l.audit?.whatsapp_link ?? "",
        site: l.website ?? "",
        instagram: l.audit?.instagram ?? "",
        facebook: l.audit?.facebook ?? "",
        avaliacoes: l.user_ratings_total ?? 0,
        nota: l.rating ?? "",
        score_oportunidade: l.opportunity_score,
        status: l.status,
        google_maps: l.google_maps_uri ?? "",
      })),
      `busca-magica-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  return (
    <div className="min-h-screen">
      {/* NAV */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/50 neon-primary">
            <Wand2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold tracking-tight text-foreground">Busca</span>
            <span className="text-lg font-extrabold tracking-tight text-primary">Mágica</span>
            <span className="ml-1 text-[10px] font-semibold text-muted-foreground">v3.0</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/leads"
            className="flex items-center gap-1.5 rounded-full bg-glass px-3 py-1.5 text-xs font-semibold text-foreground ring-1 ring-border hover:bg-white/5"
          >
            <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> Meus leads
          </Link>
          <Link
            to="/novidades"
            className="flex items-center gap-1.5 rounded-full bg-glass px-3 py-1.5 text-xs font-semibold text-foreground ring-1 ring-border hover:bg-white/5"
          >
            <GitBranch className="h-3.5 w-3.5 text-primary" /> Novidades
          </Link>
        </div>
      </nav>

      <header className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> Google Places + auditoria digital
          </div>
          <h1 className="mt-3 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl">
            Descubra comércios que <span className="text-primary">precisam de você</span>.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Busque por segmento e região, ou use seu GPS. Cruzamos com uma auditoria de site
            (WHOIS + sitemap) para achar quem está com presença digital fraca.
          </p>
        </div>

        {gpsError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-xs text-warn">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{gpsError} Continue buscando por texto — nada trava.</span>
          </div>
        )}

        <div className="glass-panel mt-5 grid gap-3 rounded-2xl p-3 md:grid-cols-[1.2fr_1.4fr_auto]">
          <label className="flex items-center gap-2 rounded-xl bg-glass px-4 py-2.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary/70">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Categoria (padaria, pet shop, advogado...)"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label className={`flex items-center gap-2 rounded-xl bg-glass px-4 py-2.5 ring-1 focus-within:ring-2 focus-within:ring-primary/70 ${usingGps ? "opacity-50 ring-border" : "ring-border"}`}>
            <MapPin className="h-4 w-4 text-primary" />
            <input
              disabled={usingGps}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Cidade, bairro ou endereço"
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
          </label>
          <button
            onClick={runSearch}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 hover:neon-primary disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={useGps}
            disabled={locating}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all disabled:opacity-60 ${
              usingGps
                ? "border-primary bg-primary/15 text-primary"
                : "border-primary/60 text-primary hover:bg-primary/10"
            }`}
          >
            <Crosshair className={`h-3.5 w-3.5 ${locating ? "animate-spin" : ""}`} />
            {locating ? "Localizando..." : usingGps ? "GPS ativo" : "Usar minha localização"}
          </button>
          {usingGps && (
            <button
              onClick={() => setUsingGps(false)}
              className="rounded-full bg-glass px-3 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border hover:text-foreground"
            >
              Voltar para texto
            </button>
          )}

          <label className="flex items-center gap-2 rounded-full bg-glass px-3 py-1 text-xs text-muted-foreground ring-1 ring-border">
            Raio
            <input
              type="range"
              min={1}
              max={20}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-24 accent-[color:var(--primary)]"
            />
            <span className="font-bold text-primary tabular-nums">{radiusKm}km</span>
          </label>

          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value as SiteFilter)}
            className="rounded-full bg-glass px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-border"
          >
            <option value="any">Site: qualquer</option>
            <option value="no_site">Sem site</option>
            <option value="with_site">Com site</option>
          </select>

          <label className="flex items-center gap-1.5 rounded-full bg-glass px-3 py-1 text-xs text-muted-foreground ring-1 ring-border">
            <Star className="h-3 w-3 text-warn" />
            ≥
            <input
              type="number"
              min={0}
              max={5}
              step={0.5}
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-10 bg-transparent text-xs font-bold text-foreground outline-none"
            />
          </label>

          <label className="flex items-center gap-1.5 rounded-full bg-glass px-3 py-1 text-xs text-muted-foreground ring-1 ring-border">
            Avaliações ≥
            <input
              type="number"
              min={0}
              step={5}
              value={minReviews}
              onChange={(e) => setMinReviews(Number(e.target.value))}
              className="w-12 bg-transparent text-xs font-bold text-foreground outline-none"
            />
          </label>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-full bg-glass px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-border"
          >
            <option value="score">Ordenar: Oportunidade</option>
            <option value="distance">Ordenar: Distância</option>
            <option value="rating">Ordenar: Avaliação</option>
            <option value="name">Ordenar: Nome</option>
          </select>

          <div className="ml-auto flex items-center gap-3 text-xs">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold tabular-nums text-foreground">{filtered.length}</span>
              <span className="text-muted-foreground">leads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/30" />
              <span className="font-bold text-primary">{hotCount}</span>
              <span className="text-muted-foreground">quentes</span>
            </div>
            <button
              onClick={doExport}
              disabled={filtered.length === 0}
              className="flex items-center gap-1 rounded-full bg-glass px-3 py-1 font-semibold text-foreground ring-1 ring-border hover:bg-white/5 disabled:opacity-40"
            >
              <Download className="h-3 w-3" /> CSV
            </button>
          </div>
        </div>

        {searchError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_1.1fr]">
        <section className="order-2 space-y-3 lg:order-1">
          {loading && (
            <div className="glass-panel rounded-2xl p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
              <p className="mt-2">Consultando Google Places...</p>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="glass-panel rounded-2xl p-6 text-center text-sm text-muted-foreground">
              {rawResults.length === 0
                ? "Faça uma busca acima para começar."
                : "Nenhum resultado com esses filtros. Amplie o raio ou remova filtros."}
            </div>
          )}
          {filtered.map((lead) => (
            <LeadResultCard
              key={lead.place_id}
              lead={lead}
              selected={selected === lead.place_id}
              onSelect={() => setSelected(lead.place_id)}
              onUpdate={updateOne}
            />
          ))}
          <p className="pt-2 text-[10px] leading-relaxed text-muted-foreground">
            * "Atividade" é uma estimativa baseada na última modificação do <code>sitemap.xml</code>.
            Dados de site/social são obtidos por leitura pública da página. Nem todo domínio expõe
            WHOIS/RDAP público — nesse caso exibimos "—".
          </p>
        </section>

        <section className="glass-panel order-1 h-[70vh] overflow-hidden rounded-2xl lg:sticky lg:top-4 lg:order-2 lg:h-[calc(100vh-8rem)]">
          <ClientOnly fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">Carregando mapa...</div>}>
            <Suspense fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">Carregando mapa...</div>}>
              <MapView
                center={center}
                radiusKm={radiusKm}
                leads={filtered}
                selectedId={selected}
                onSelect={setSelected}
              />
            </Suspense>
          </ClientOnly>
        </section>
      </main>
    </div>
  );
}

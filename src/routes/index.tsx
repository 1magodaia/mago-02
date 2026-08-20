import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookmarkCheck,
  ChevronDown,
  Crosshair,
  Download,
  Filter,
  Flame,
  GitBranch,
  Info,
  List,
  Loader2,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPin,
  Search,
  Shield,
  MessageCircle,
  X,
  Star,
  User as UserIcon,
} from "lucide-react";

import { searchPlaces, type PlaceResult } from "@/lib/places.functions";
import { scoreLead, type ScoredLead } from "@/lib/scoring";
import { getAppSettings } from "@/lib/settings.functions";
import { reverseGeocode } from "@/lib/geocode.functions";
import { autocompleteRegion, resolvePlace } from "@/lib/places-suggest.functions";
import { SmartAutocomplete, type SuggestionItem } from "@/components/smart-autocomplete";
import { CATEGORY_SUGGESTIONS } from "@/lib/autocomplete-categories";
import { useServerFn } from "@tanstack/react-start";
import { toTerms } from "@/lib/highlight";
import { addHistory, cacheGet, cacheSet, exportToCsv } from "@/lib/storage";
import { haversineKm } from "@/lib/geo";
import { LogoWordmark } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { FREE_LIFETIME_SEARCH_LIMIT } from "@/lib/profile.functions";
import { TutorialModal, resetTutorial } from "@/components/tutorial-modal";
import { SPORT_BY_ID } from "@/lib/sports-categories";
import type { SportCategory } from "@/lib/sports-categories";
import { LeadResultCard } from "@/components/lead-result-card";

const MapView = lazy(() => import("@/components/google-map-view"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Busca Mágica" },
      { name: "description", content: "Dashboard de prospecção B2B inteligente." }
    ]
  }),
  component: Home,
});

type SortKey = "score" | "distance" | "rating" | "name";
type SiteFilter = "any" | "no_site" | "with_site";

function Home() {
  const nav = useNavigate();
  const { user, profile, isPro, isMaster, isAdmin, signOut, loading: authLoading, refreshProfile } = useAuth();

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string>(() => (typeof window !== "undefined" ? localStorage.getItem("bm.lastRegion") || "São Paulo" : "São Paulo"));
  const [radiusKm, setRadiusKm] = useState(5);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: -23.5613, lng: -46.6558 });
  const [usingGps, setUsingGps] = useState(false);
  const [pinned, setPinned] = useState(false);

  const [siteFilter, setSiteFilter] = useState<SiteFilter>("any");
  const [minRating, setMinRating] = useState(0);
  const [minReviews, setMinReviews] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [rawResults, setRawResults] = useState<ScoredLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const searchPlacesFn = useServerFn(searchPlaces);
  const reverseGeocodeFn = useServerFn(reverseGeocode);
  const autocompleteRegionFn = useServerFn(autocompleteRegion);
  const resolvePlaceFn = useServerFn(resolvePlace);

  useEffect(() => {
    if (typeof window !== "undefined" && region.trim()) {
      localStorage.setItem("bm.lastRegion", region);
    }
  }, [region]);

  const regionSource = useMemo(() => async (input: string, signal: AbortSignal): Promise<SuggestionItem[]> => {
    const r = await autocompleteRegionFn({ data: { input, bias: center } });
    if (signal.aborted) return [];
    return (r.suggestions ?? []).map((s) => ({ id: `p:${s.placeId}`, label: s.full, secondary: s.secondary, payload: { placeId: s.placeId } }));
  }, [autocompleteRegionFn, center]);

  const onSelectRegion = (item: SuggestionItem) => {
    const payload = item.payload as { placeId?: string };
    if (!payload?.placeId) return;
    resolvePlaceFn({ data: { placeId: payload.placeId } }).then((r) => {
      if (r.lat != null && r.lng != null) {
        setCenter({ lat: r.lat, lng: r.lng });
        setUsingGps(true);
        setPinned(true);
      }
      if (r.address) setRegion(r.address);
    });
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearchError(null);
    try {
      const searchRegion = region?.trim() ? region : undefined;
      const searchParams = { 
        query, 
        regionText: usingGps ? undefined : searchRegion, 
        lat: center.lat, 
        lng: center.lng, 
        radiusKm 
      };
      console.log("[runSearch] Triggering search with params:", searchParams);
      const resp = await searchPlacesFn({ data: searchParams });
      console.log("[runSearch] API response received:", resp);
      
      if (resp.error) {
        setSearchError(resp.error);
      }
      
      const scored = (resp.results || []).map((p) => scoreLead(p));
      setRawResults(scored);
      refreshProfile();
    } catch (err) {
      console.error("[runSearch] search failed:", err);
      setSearchError("Erro ao buscar leads. Verifique o console ou tente novamente.");
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
    list = list.filter((l) => (l.lat != null && l.lng != null ? haversineKm(center, { lat: l.lat, lng: l.lng }) <= radiusKm : true));
    list.sort((a, b) => {
      if (sortBy === "score") return b.opportunity_score - a.opportunity_score;
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.lat != null && b.lat != null ? haversineKm(center, { lat: a.lat, lng: a.lng! }) - haversineKm(center, { lat: b.lat, lng: b.lng! }) : 0;
    });
    return list;
  }, [rawResults, siteFilter, minRating, minReviews, sortBy, center, radiusKm]);

  const hotCount = filtered.filter((l) => l.status === "hot").length;

  if (authLoading || !user) return <div className="flex h-screen items-center justify-center bg-[#0B0F17]"><Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" /></div>;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0B0F17] text-foreground">
      {/* Header fixo compacto (h-14) */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1E293B] px-4 bg-[#0B0F17]/80 backdrop-blur-md z-50">
        <Link to="/" className="transition-transform active:scale-95">
          <LogoWordmark className="scale-75 origin-left" />
        </Link>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link to="/master" className="flex h-8 items-center gap-1.5 rounded-full bg-[#8B5CF6]/10 px-3 text-[11px] font-bold text-[#8B5CF6] ring-1 ring-[#8B5CF6]/30 hover:bg-[#8B5CF6]/20 transition-all">
              <Shield className="h-3.5 w-3.5" /> {isMaster ? "MASTER" : "ADMIN"}
            </Link>
          )}
          <div className="h-8 w-[1px] bg-[#1E293B]" />
          <button onClick={() => signOut()} className="flex h-8 items-center gap-2 rounded-lg px-2 text-[11px] font-bold text-red-400/80 hover:bg-red-400/10 transition-colors">
            <LogOut className="h-3.5 w-3.5" /> SAIR
          </button>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Coluna Esquerda: w-[420px] */}
        <aside className="flex w-[420px] shrink-0 flex-col border-r border-[#1E293B] bg-[#0B0F17]">
          {/* Barra de Busca Consolidada */}
          <div className="flex flex-col gap-2 p-4 border-b border-[#1E293B] bg-[#0B0F17]/50">
            <SmartAutocomplete
              value={query}
              onChange={setQuery}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="O que você busca?"
              staticList={CATEGORY_SUGGESTIONS}
              wrapperClassName="flex items-center gap-2 rounded-xl bg-[#1E293B]/50 px-3 py-2 ring-1 ring-[#1E293B] focus-within:ring-[#8B5CF6]/50 transition-all"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              leading={<Search className="h-4 w-4 text-[#8B5CF6]/70" />}
            />
            <div className="flex gap-2">
              <SmartAutocomplete
                value={region}
                onChange={setRegion}
                onSelect={onSelectRegion}
                placeholder="Localização"
                asyncSource={regionSource}
                disabled={usingGps}
                wrapperClassName={`flex flex-1 items-center gap-2 rounded-xl bg-[#1E293B]/50 px-3 py-2 ring-1 ring-[#1E293B] ${usingGps ? "opacity-50" : "focus-within:ring-[#8B5CF6]/50"} transition-all`}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                leading={<MapPin className="h-4 w-4 text-[#8B5CF6]/70" />}
              />
              <button
                onClick={runSearch}
                disabled={loading}
                className="flex h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 font-bold text-white shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "BUSCAR"}
              </button>
            </div>
            
            <div className="flex items-center justify-between px-1">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[10px] font-bold text-muted-foreground hover:text-[#8B5CF6] transition-colors flex items-center gap-1"
              >
                <Filter className="h-3 w-3" /> {showAdvanced ? "OCULTAR FILTROS" : "FILTROS AVANÇADOS"}
              </button>
              {filtered.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-foreground">{filtered.length} LEADS</span>
                  <div className="flex items-center gap-1 rounded-full bg-[#8B5CF6]/10 px-2 py-0.5 ring-1 ring-[#8B5CF6]/30">
                    <Flame className="h-3 w-3 text-[#8B5CF6]" />
                    <span className="text-[9px] font-black text-[#8B5CF6]">{hotCount} QUENTES</span>
                  </div>
                </div>
              )}
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                <select 
                  value={siteFilter} 
                  onChange={e => setSiteFilter(e.target.value as SiteFilter)}
                  className="rounded-lg bg-[#1E293B] border-none p-2 text-[11px] text-white focus:ring-1 focus:ring-[#8B5CF6]"
                >
                  <option value="any">Qualquer Site</option>
                  <option value="no_site">Sem Site</option>
                  <option value="with_site">Com Site</option>
                </select>
                <div className="flex items-center gap-2 rounded-lg bg-[#1E293B] px-2 py-1 text-[10px] text-muted-foreground">
                  Raio: <span className="text-white font-bold">{radiusKm}km</span>
                  <input type="range" min={1} max={20} value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))} className="flex-1 accent-[#8B5CF6]" />
                </div>
              </div>
            )}
          </div>

          {/* Lista de Leads com scroll independente */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1E293B] scrollbar-track-transparent">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl bg-[#1E293B]/30 p-5 ring-1 ring-[#1E293B]">
                    <div className="h-4 w-24 rounded-full bg-[#1E293B] mb-3" />
                    <div className="h-6 w-48 rounded bg-[#1E293B] mb-2" />
                    <div className="h-3 w-64 rounded bg-[#1E293B] mb-4" />
                    <div className="flex gap-2">
                      <div className="h-8 flex-1 rounded-xl bg-[#1E293B]" />
                      <div className="h-8 flex-1 rounded-xl bg-[#1E293B]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchError ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-red-400">
                <AlertCircle className="h-10 w-10 mb-4 opacity-50" />
                <h3 className="text-sm font-bold mb-1">Ops! Ocorreu um erro</h3>
                <p className="text-[11px] leading-relaxed opacity-70">
                  {searchError}
                </p>
                <button 
                  onClick={runSearch}
                  className="mt-4 px-4 py-2 rounded-lg bg-red-400/10 text-[11px] font-bold hover:bg-red-400/20 transition-colors"
                >
                  TENTAR NOVAMENTE
                </button>
              </div>
            ) : filtered.length > 0 ? (
              <div className="p-4 space-y-3">
                {filtered.map((lead) => (
                  <LeadResultCard
                    key={lead.place_id}
                    lead={lead}
                    selected={selected === lead.place_id}
                    onSelect={() => setSelected(lead.place_id)}
                  />
                ))}
              </div>
            ) : rawResults.length > 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                <Filter className="h-10 w-10 mb-4 opacity-20" />
                <h3 className="text-sm font-bold text-foreground mb-1">Nenhum resultado</h3>
                <p className="text-[11px] leading-relaxed">
                  Tente ajustar seus filtros para encontrar o que procura.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                <Search className="h-10 w-10 mb-4 opacity-20" />
                <h3 className="text-sm font-bold text-foreground mb-1">Pronto para prospectar?</h3>
                <p className="text-[11px] leading-relaxed">
                  Digite o que você busca e a localização acima para encontrar leads qualificados.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Coluna Direita: Mapa Flex-1 */}
        <main className="flex-1 relative bg-[#0B0F17]">
          <ClientOnly fallback={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Carregando mapa...</div>}>
            <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Inicializando vista...</div>}>
              <MapView
                center={center}
                radiusKm={radiusKm}
                leads={filtered}
                selectedId={selected}
                onSelect={setSelected}
                onMapClick={(coords) => {
                  setCenter(coords);
                  setUsingGps(true);
                  setPinned(true);
                  reverseGeocodeFn({ data: coords }).then(r => r.address && setRegion(r.address));
                }}
              />
            </Suspense>
          </ClientOnly>

          {/* Overlay de Pin Instrução */}
          {rawResults.length === 0 && !loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#0B0F17]/90 backdrop-blur-md border border-[#1E293B] rounded-full px-4 py-2 text-[10px] font-bold text-foreground shadow-2xl flex items-center gap-2">
              <MapPin className="h-3 w-3 text-[#8B5CF6]" />
              CLIQUE NO MAPA PARA DEFINIR O CENTRO DA BUSCA
            </div>
          )}

          {/* FAB Export - Pro feature */}
          {filtered.length > 0 && (
            <button
              onClick={() => exportToCsv(filtered.map(l => ({ Nome: l.name, Site: l.website, Fone: l.phone })), 'leads.csv')}
              disabled={!isPro}
              className="absolute bottom-6 right-6 z-10 flex h-12 items-center gap-2 rounded-xl bg-[#8B5CF6] px-6 text-xs font-bold text-white shadow-2xl hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
            >
              <Download className="h-4 w-4" /> EXPORTAR CSV {!isPro && "(PRO)"}
            </button>
          )}
        </main>
      </div>
    </div>
  );
}

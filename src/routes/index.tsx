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
  component: Home,
});

type SortKey = "score" | "distance" | "rating" | "name";
type SiteFilter = "any" | "no_site" | "with_site";

function Home() {
  const nav = useNavigate();
  const { user, profile, isPro, isMaster, isAdmin, signOut, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string>(() => (typeof window !== "undefined" ? localStorage.getItem("bm.lastRegion") || "São Paulo" : "São Paulo"));
  const [radiusKm, setRadiusKm] = useState(5);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: -23.5613, lng: -46.6558 });
  const [usingGps, setUsingGps] = useState(false);
  const [siteFilter, setSiteFilter] = useState<SiteFilter>("any");
  const [minRating, setMinRating] = useState(0);
  const [minReviews, setMinReviews] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rawResults, setRawResults] = useState<ScoredLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);

  const reverseGeocodeFn = useServerFn(reverseGeocode);
  const autocompleteRegionFn = useServerFn(autocompleteRegion);
  const resolvePlaceFn = useServerFn(resolvePlace);
  const searchPlacesFn = useServerFn(searchPlaces);

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

  const runSearch = async () => {
    setLoading(true);
    try {
      const resp = await searchPlacesFn({ data: { query, lat: usingGps ? center.lat : undefined, lng: usingGps ? center.lng : undefined, radiusKm } });
      setRawResults(resp.results.map((p) => scoreLead(p)));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0B0F17]">
      {/* Header Fixo */}
      <header className="flex h-14 items-center justify-between border-b border-[#1E293B] px-4">
        <LogoWordmark className="scale-75 origin-left" />
        <div className="flex items-center gap-2">
          {isAdmin && <Link to="/master" className="text-xs font-bold text-[#8B5CF6]">Master</Link>}
          <button onClick={() => signOut()} className="text-xs text-red-400">Sair</button>
        </div>
      </header>

      {/* Conteúdo Principal (Split View) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Painel Esquerdo */}
        <div className="flex w-[420px] flex-col border-r border-[#1E293B]">
          <div className="p-4 space-y-2 border-b border-[#1E293B]">
            <input 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              placeholder="Pesquisar..." 
              className="w-full bg-[#1E293B] p-2 rounded text-sm text-white" 
            />
            <button onClick={runSearch} className="w-full bg-[#8B5CF6] text-white p-2 rounded text-sm font-bold">Buscar</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {filtered.map(lead => <LeadResultCard key={lead.place_id} lead={lead} selected={selected === lead.place_id} onSelect={() => setSelected(lead.place_id)} />)}
          </div>
        </div>

        {/* Mapa Direita */}
        <div className="flex-1">
          <ClientOnly fallback={<div>Mapa carregando...</div>}>
            <Suspense fallback={<div>...</div>}>
              <MapView center={center} radiusKm={radiusKm} leads={filtered} selectedId={selected} onSelect={setSelected} onMapClick={(c) => { setCenter(c); setPinned(true); }} />
            </Suspense>
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}

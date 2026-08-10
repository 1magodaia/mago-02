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
import { LeadResultCard } from "@/components/lead-result-card";
import { getAppSettings } from "@/lib/settings.functions";
import { reverseGeocode } from "@/lib/geocode.functions";
import { autocompleteRegion, resolvePlace } from "@/lib/places-suggest.functions";
import { SmartAutocomplete, type SuggestionItem } from "@/components/smart-autocomplete";
import { CATEGORY_SUGGESTIONS } from "@/lib/autocomplete-categories";


import { useServerFn } from "@tanstack/react-start";
import { toTerms } from "@/lib/highlight";
import { addHistory, cacheGet, cacheSet, exportToCsv } from "@/lib/storage";
import { haversineKm } from "@/lib/geo";
import { LogoIcon, LogoWordmark } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { FREE_LIFETIME_SEARCH_LIMIT } from "@/lib/profile.functions";
import { TutorialModal, resetTutorial } from "@/components/tutorial-modal";
import { SPORT_BY_ID } from "@/lib/sports-categories";
import type { SportCategory } from "@/lib/sports-categories";
import heroDefault from "@/assets/hero-banner.png.asset.json";
import { HeroBanner } from "@/components/hero-banner";

const HERO_CACHE_KEY = "bm.heroSettings.v1";
type HeroCache = {
  url: string;
  hd: number;
  hm: number;
  fit: "cover" | "contain";
};
function readHeroCache(): HeroCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(HERO_CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<HeroCache>;
    if (typeof p.url !== "string") return null;
    return {
      url: p.url,
      hd: typeof p.hd === "number" ? p.hd : 320,
      hm: typeof p.hm === "number" ? p.hm : 200,
      fit: p.fit === "contain" ? "contain" : "cover",
    };
  } catch {
    return null;
  }
}
function writeHeroCache(c: HeroCache) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(HERO_CACHE_KEY, JSON.stringify(c)); } catch { /* quota */ }
}




const MapView = lazy(() => import("@/components/google-map-view"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Busca Mágica — Encontre leads com inteligência e elegância" },
      {
        name: "description",
        content:
          "Descubra comércios próximos com pouca visibilidade online. Auditoria automática de site, Google Places, score de oportunidade e exportação CSV para prospecção.",
      },
      { property: "og:title", content: "Busca Mágica — Encontre leads com inteligência e elegância" },
      {
        property: "og:description",
        content: "Descubra comércios próximos com pouca visibilidade online. Auditoria automática de site, Google Places, score de oportunidade e exportação CSV para prospecção.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "keywords", content: "prospecção, b2b, leads, google places, auditoria digital, seo local" },
    ],
    links: [
      { rel: "canonical", href: "https://buscamagica.lovable.app/" }
    ]
  }),
  component: Home,
});

type SortKey = "score" | "distance" | "rating" | "name";
type SiteFilter = "any" | "no_site" | "with_site";





function FreeQuotaBlock({ supportWa, onClose }: { supportWa: string | null; onClose: () => void }) {
  const digits = (supportWa ?? "").replace(/\D/g, "");
  const msg = encodeURIComponent(
    "Olá! Já usei minha busca gratuita no Busca Mágica e quero ativar minha conta para liberar acesso completo.",
  );
  const waHref = digits ? `https://wa.me/${digits}?text=${msg}` : null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="quota-block-title"
      aria-describedby="quota-block-desc"
      className="fixed inset-0 z-[9999] grid place-items-center bg-black/90 p-4 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="glass-panel relative w-full max-w-md rounded-2xl border border-primary/40 p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/15 ring-1 ring-primary/40">
          <Search className="h-7 w-7 text-primary" aria-hidden />
        </div>
        <h2 id="quota-block-title" className="text-lg font-extrabold text-foreground">
          Você já usou sua busca gratuita
        </h2>
        <p id="quota-block-desc" className="mt-2 text-sm text-muted-foreground">
          Ative sua conta pelo WhatsApp para liberar acesso completo e continuar prospectando comércios.
        </p>
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-bold text-white transition-all hover:brightness-110"
          >
            <MessageCircle className="h-4 w-4" />
            Ativar minha conta no WhatsApp
          </a>
        ) : (
          <p className="mt-5 rounded-xl bg-glass px-4 py-3 text-xs text-muted-foreground ring-1 ring-border">
            Contato de suporte ainda não configurado. Fale com o administrador.
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}


function Home() {
  const nav = useNavigate();
  const { user, profile, isPro, isMaster, isAdmin, signOut, loading: authLoading, refreshProfile } = useAuth();

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string>(() => {
    if (typeof window === "undefined") return "São Paulo";
    try {
      return localStorage.getItem("bm.lastRegion") || "São Paulo";
    } catch {
      return "São Paulo";
    }
  });

  // Persist last searched region so it pré-preenche na próxima visita.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = region.trim();
    if (!v) return;
    try {
      localStorage.setItem("bm.lastRegion", v);
    } catch {}
  }, [region]);
  const [radiusKm, setRadiusKm] = useState(5);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: -23.5613, lng: -46.6558 });
  const [usingGps, setUsingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const [siteFilter, setSiteFilter] = useState<SiteFilter>("any");
  const [minRating, setMinRating] = useState(0);
  const [minReviews, setMinReviews] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");

  const [rawResults, setRawResults] = useState<ScoredLead[]>([]);
  const [sportsMap, setSportsMap] = useState<Record<string, string>>({}); // place_id -> sport id
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [citationsEnabled, setCitationsEnabled] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [supportWa, setSupportWa] = useState<string | null>(null);
  const [supportUpdatedAt, setSupportUpdatedAt] = useState<string | null>(null);
  const _initHero = typeof window !== "undefined" ? readHeroCache() : null;
  const [heroImageUrl, setHeroImageUrl] = useState<string>(_initHero?.url ?? heroDefault.url);
  const [heroHeightDesktop, setHeroHeightDesktop] = useState<number>(_initHero?.hd ?? 320);
  const [heroHeightMobile, setHeroHeightMobile] = useState<number>(_initHero?.hm ?? 200);
  const [heroFit, setHeroFit] = useState<"cover" | "contain">(_initHero?.fit ?? "cover");
  const readSettings = useServerFn(getAppSettings);
  const reverseGeocodeFn = useServerFn(reverseGeocode);
  const autocompleteRegionFn = useServerFn(autocompleteRegion);
  const resolvePlaceFn = useServerFn(resolvePlace);
  const [pinned, setPinned] = useState(false);

  const onMapPin = (coords: { lat: number; lng: number }) => {
    setCenter(coords);
    setUsingGps(true); // faz a busca usar lat/lng em vez de texto
    setPinned(true);
    setGpsError(null);
    reverseGeocodeFn({ data: coords })
      .then((r) => { if (r.address) setRegion(r.address); })
      .catch(() => { /* silencioso: coordenadas já bastam */ });
  };

  const regionSource = useMemo(
    () =>
      async (input: string, signal: AbortSignal): Promise<SuggestionItem[]> => {
        const r = await autocompleteRegionFn({
          data: { input, bias: center ? { lat: center.lat, lng: center.lng } : undefined },
        });
        if (signal.aborted) return [];
        return (r.suggestions ?? []).map((s) => ({
          id: `p:${s.placeId}`,
          label: s.full,
          secondary: s.secondary,
          payload: { placeId: s.placeId },
        }));
      },
    [autocompleteRegionFn, center],
  );

  const onSelectRegion = (item: SuggestionItem) => {
    const payload = item.payload as { placeId?: string } | undefined;
    if (!payload?.placeId) return;
    resolvePlaceFn({ data: { placeId: payload.placeId } })
      .then((r) => {
        if (r.lat != null && r.lng != null) {
          setCenter({ lat: r.lat, lng: r.lng });
          setUsingGps(true);
          setPinned(true);
          setGpsError(null);
        }
        if (r.address) setRegion(r.address);
      })
      .catch(() => { /* silencioso */ });
  };

  const citationsAvailable = (isPro || isAdmin || isMaster) && (citationsEnabled || isAdmin || isMaster);

  // Regra: a tela inicial é a de login. Usuários não autenticados são
  // redirecionados para /auth; usuários logados seguem usando a home/busca.
  useEffect(() => {
    if (!authLoading && !user) {
      nav({ to: "/auth", replace: true });
    }
  }, [authLoading, user, nav]);


  useEffect(() => {
    let alive = true;
    const load = () => {
      readSettings()
        .then((s) => {
          if (!alive) return;
          setCitationsEnabled(!!s.citations_enabled);
          const nextUrl = s.hero_image_url ?? heroDefault.url;
          const nextHd = s.hero_height_desktop ?? 320;
          const nextHm = s.hero_height_mobile ?? 200;
          const nextFit: "cover" | "contain" = s.hero_fit ?? "cover";
          setHeroImageUrl((prev) => (prev === nextUrl ? prev : nextUrl));
          setHeroHeightDesktop((prev) => (prev === nextHd ? prev : nextHd));
          setHeroHeightMobile((prev) => (prev === nextHm ? prev : nextHm));
          setHeroFit((prev) => (prev === nextFit ? prev : nextFit));
          writeHeroCache({ url: nextUrl, hd: nextHd, hm: nextHm, fit: nextFit });

          setSupportWa(s.support_whatsapp);
          setSupportUpdatedAt(s.updated_at);
        })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);






  // Auto-solicita GPS ao montar (opt-in): reaproveita coordenadas em cache
  // e só dispara o prompt do browser se o usuário ainda não negou explicitamente.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pref = localStorage.getItem("bm.geoPref"); // "granted" | "denied" | null
    try {
      const cachedRaw = localStorage.getItem("bm.geoCoords");
      if (cachedRaw) {
        const c = JSON.parse(cachedRaw) as { lat?: number; lng?: number };
        if (typeof c.lat === "number" && typeof c.lng === "number") {
          setCenter({ lat: c.lat, lng: c.lng });
          if (pref === "granted") setUsingGps(true);
        }
      }
    } catch { /* ignore */ }
    if (pref === "denied" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(coords);
        setUsingGps(true);
        setGpsError(null);
        try {
          localStorage.setItem("bm.geoPref", "granted");
          localStorage.setItem("bm.geoCoords", JSON.stringify({ ...coords, ts: Date.now() }));
        } catch { /* quota */ }
      },
      (err) => {
        if (err.code === 1 /* PERMISSION_DENIED */) {
          try { localStorage.setItem("bm.geoPref", "denied"); } catch { /* ignore */ }
        }
        setGpsError(err.message || null);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const requireAuth = (): boolean => {
    if (!user) {
      nav({ to: "/auth", search: { redirect: "/" } });
      return false;
    }
    return true;
  };

  const useGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Navegador sem suporte a geolocalização.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(coords);
        setUsingGps(true);
        setPinned(false);
        setGpsError(null);
        setLocating(false);
        try {
          localStorage.setItem("bm.geoPref", "granted");
          localStorage.setItem("bm.geoCoords", JSON.stringify({ ...coords, ts: Date.now() }));
        } catch { /* ignore */ }
        // Preenche o endereço automaticamente via reverse geocoding
        reverseGeocodeFn({ data: coords })
          .then((r) => { if (r.address) setRegion(r.address); })
          .catch(() => { /* silencioso: coordenadas já bastam */ });
      },
      (err) => {
        setGpsError(err.message || "Permissão negada.");
        setUsingGps(false);
        setLocating(false);
        if (err.code === 1) {
          try { localStorage.setItem("bm.geoPref", "denied"); } catch { /* ignore */ }
        }
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );

  };


  const runSportsSearch = async () => {
    if (!requireAuth()) return;
    if (selectedSports.length === 0) return;
    setLoading(true);
    setSearchError(null);
    try {
      const cats = selectedSports.map((id) => SPORT_BY_ID[id]).filter(Boolean) as SportCategory[];
      const queries: Array<{ sportId: string; q: string }> = [];
      for (const c of cats) {
        for (const kw of c.keywords) queries.push({ sportId: c.id, q: kw });
      }
      const responses = await Promise.all(
        queries.map((qi) =>
          searchPlaces({
            data: {
              query: qi.q,
              regionText: usingGps ? undefined : region.trim() || undefined,
              lat: usingGps ? center.lat : undefined,
              lng: usingGps ? center.lng : undefined,
              radiusKm,
            },
          }).then((r) => ({ qi, r })).catch(() => null),
        ),
      );
      const seen = new Set<string>();
      const merged: PlaceResult[] = [];
      const sMap: Record<string, string> = {};
      let lastRemaining: number | null = null;
      let firstError: string | null = null;
      let quotaHit = false;
      for (const item of responses) {
        if (!item) continue;
        const { qi, r } = item;
        if (r.error && !firstError) firstError = r.error;
        if ((r as { quotaExhausted?: boolean }).quotaExhausted) quotaHit = true;
        if (typeof r.remaining === "number") lastRemaining = r.remaining;
        for (const p of r.results) {
          if (seen.has(p.place_id)) continue;
          seen.add(p.place_id);
          sMap[p.place_id] = qi.sportId;
          merged.push(p);
        }
      }
      if (firstError && merged.length === 0) setSearchError(firstError);
      if (quotaHit) setQuotaBlocked(true);
      if (lastRemaining != null) setRemaining(lastRemaining);
      setSportsMap(sMap);
      setRawResults(merged.map((p) => scoreLead(p)));
      refreshProfile();
      addHistory({
        query: `Esportes: ${cats.map((c) => c.emoji).join(" ")}`,
        region: usingGps ? "GPS" : region.trim(),
        radiusKm,
        used_gps: usingGps,
        count: merged.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha na busca.";
      setSearchError(msg);
    } finally {
      setLoading(false);
    }
  };

  const runSearchWith = async (q: string, r: string) => {
    if (!requireAuth()) return;
    if (!q.trim()) {
      setSearchError("Informe uma categoria (ex: padaria, barbearia).");
      return;
    }
    setLoading(true);
    setSearchError(null);
    setSportsMap({});
    const cacheKey = JSON.stringify({
      q: q.trim().toLowerCase(),
      r: usingGps ? "gps" : r.trim().toLowerCase(),
      lat: usingGps ? center.lat.toFixed(3) : null,
      lng: usingGps ? center.lng.toFixed(3) : null,
      rad: radiusKm,
    });
    try {
      let places = cacheGet<PlaceResult[]>(cacheKey);
      let servedFromCache = !!places;
      if (!places) {
        const resp = await searchPlaces({
          data: {
            query: q.trim(),
            regionText: usingGps ? undefined : r.trim(),
            lat: usingGps ? center.lat : undefined,
            lng: usingGps ? center.lng : undefined,
            radiusKm,
          },
        });
        if (resp.error) setSearchError(resp.error);
        if ((resp as { quotaExhausted?: boolean }).quotaExhausted) setQuotaBlocked(true);
        if (typeof resp.remaining === "number") setRemaining(resp.remaining);
        places = resp.results;
        if (places.length) cacheSet(cacheKey, places);
        if (!servedFromCache) refreshProfile();
      }
      const scored = places.map((p) => scoreLead(p));
      setRawResults(scored);
      if (!usingGps) {
        const first = places.find((p) => p.lat != null && p.lng != null);
        if (first?.lat && first?.lng) setCenter({ lat: first.lat, lng: first.lng });
      }
      addHistory({
        query: q.trim(),
        region: usingGps ? "GPS" : r.trim(),
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

  const runSearch = () => {
    if (selectedSports.length > 0) return runSportsSearch();
    return runSearchWith(query, region);
  };



  const highlightTerms = useMemo(() => toTerms(query), [query]);

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
    if (!isPro) {
      setSearchError("Exportação CSV está disponível apenas no plano Pro. Fale com o administrador para liberar seu acesso.");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const formatCategory = (types: string[] | undefined): string => {
      const t = types?.[0];
      if (!t) return "";
      return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };
    const whatsappFromPhone = (phone: string | null | undefined): string => {
      if (!phone) return "";
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) return "";
      const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
      return `https://wa.me/${withCountry}`;
    };
    const daysAgoLabel = (iso: string | null | undefined): string => {
      if (!iso) return "Sem avaliações recentes";
      const d = Date.parse(iso);
      if (!Number.isFinite(d)) return "Sem avaliações recentes";
      const days = Math.floor((Date.now() - d) / 86400000);
      return `${days} dias atrás`;
    };
    const digitalStatus = (l: ScoredLead): "Completa" | "Parcial" | "Mínima" => {
      const count = [!!l.website, !!l.audit?.instagram, !!l.audit?.facebook].filter(Boolean).length;
      if (count >= 3) return "Completa";
      if (count >= 1) return "Parcial";
      return "Mínima";
    };
    // Score 1-10 alinhado com a lógica de 3 cores (verde=oportunidade quente).
    const opportunityScore10 = (l: ScoredLead): number => {
      const hasSite = !!l.website;
      const hasIg = !!l.audit?.instagram;
      const hasFb = !!l.audit?.facebook;
      const social = (hasIg ? 1 : 0) + (hasFb ? 1 : 0);
      let base: number;
      if (!hasSite && social === 0) base = 9; // 🟢 8-10
      else if (!hasSite || social < 2) base = 6; // 🟡 5-7
      else base = 3; // 🟠 1-4
      const days = l.latest_review_at ? Math.floor((Date.now() - Date.parse(l.latest_review_at)) / 86400000) : null;
      if (days != null && days > 180) base = Math.min(10, base + 1);
      return Math.max(1, Math.min(10, base));
    };

    const rows = filtered.map((l) => ({
      "Nome": l.name,
      "Endereço Completo": l.address,
      "Telefone": l.phone ?? "",
      "WhatsApp": l.audit?.whatsapp_link ?? whatsappFromPhone(l.phone),
      "WhatsApp Fonte": l.audit?.whatsapp_source === "site"
        ? "verificado no site"
        : (l.audit?.whatsapp_source === "phone" || (!l.audit && l.phone)) ? "presumido do telefone" : "",
      "E-mail": l.audit?.email ?? "",
      "E-mail Fonte": l.audit?.email ? "extraído do site" : (l.audit ? "não localizado" : "site não auditado"),
      "Website": l.website ?? "",

      "Google Maps Link": l.google_maps_uri ?? (l.lat != null && l.lng != null ? `https://maps.google.com/?q=${l.lat},${l.lng}` : ""),
      "Instagram": l.audit?.instagram ?? "",
      "Facebook": l.audit?.facebook ?? "",
      "Nota (Rating)": l.rating ?? "",
      "Número de Avaliações": l.user_ratings_total ?? 0,
      "Última Avaliação (dias atrás)": daysAgoLabel(l.latest_review_at),
      "Categoria": sportsMap[l.place_id]
        ? `${SPORT_BY_ID[sportsMap[l.place_id]].emoji} ${SPORT_BY_ID[sportsMap[l.place_id]].label}`
        : formatCategory(l.types),
      "Status Presença Digital": digitalStatus(l),
      "Score Oportunidade": opportunityScore10(l),
      "Data Coleta": today,
    }));
    exportToCsv(rows, `busca-magica-leads-${today}.csv`);
  };


  const searchUsage = profile
    ? isPro
      ? "Pro · buscas ilimitadas"
      : `${Math.min(profile.search_count_month, FREE_LIFETIME_SEARCH_LIMIT)}/${FREE_LIFETIME_SEARCH_LIMIT} busca grátis usada`
    : null;

  // Enquanto a sessão carrega ou o redirect para /auth ocorre, não renderize
  // a home para evitar flash da tela de busca a usuários deslogados.
  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Carregando" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      {/* NAV — sticky com safe-area; alvos de toque ≥44px no mobile */}
      <nav
        className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <Link to="/" aria-label="Busca Mágica — início" className="shrink-0 transition-transform hover:scale-105 active:scale-95">
            <LogoWordmark />
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {user && (
              <Link
                to="/leads"
                className="hidden h-9 items-center gap-1.5 rounded-full bg-glass px-3 text-xs font-semibold text-foreground ring-1 ring-border hover:bg-white/5 sm:inline-flex"
              >
                <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> Meus leads
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/novidades"
                className="hidden h-9 items-center gap-1.5 rounded-full bg-glass px-3 text-xs font-semibold text-foreground ring-1 ring-border hover:bg-white/5 sm:inline-flex"
              >
                <GitBranch className="h-3.5 w-3.5 text-primary" /> Novidades
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/master"
                aria-label={isMaster ? "Abrir painel Master" : "Abrir painel Admin"}
                className="inline-flex h-11 min-w-[110px] items-center justify-center gap-2 rounded-full bg-primary/15 px-5 text-sm font-bold text-primary ring-1 ring-primary/40 hover:bg-primary/25 active:scale-95 sm:min-w-0 sm:h-9 sm:px-3 sm:text-xs"
              >
                <Shield className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
                <span>{isMaster ? "Master" : "Admin"}</span>
              </Link>
            )}
            {authLoading ? (
              <span className="grid h-11 w-11 place-items-center sm:h-9 sm:w-9">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </span>
            ) : user ? (
              <div className="group relative">
                <button
                  className="inline-flex h-11 min-w-[110px] items-center justify-center gap-2 rounded-full bg-glass px-4 text-sm font-bold text-foreground ring-1 ring-border hover:bg-white/5 active:scale-95 sm:min-w-0 sm:h-9 sm:px-3 sm:text-xs"
                  aria-label="Menu da conta"
                >
                  <UserIcon className="h-5 w-5 text-primary sm:h-3.5 sm:w-3.5" />
                  <span className="max-w-[120px] truncate sm:inline">{profile?.full_name || user.email}</span>
                </button>
                <div className="invisible absolute right-0 top-full z-20 mt-1 w-56 rounded-xl bg-popover p-2 opacity-0 shadow-2xl ring-1 ring-border transition group-hover:visible group-hover:opacity-100 focus-within:visible focus-within:opacity-100">
                  <div className="px-3 py-2 text-[11px] text-muted-foreground">{user.email}</div>
                  {searchUsage && (
                    <div className="px-3 pb-2 text-[11px] text-primary">{searchUsage}</div>
                  )}
                  <Link to="/leads" className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5">Meus leads</Link>
                  {isAdmin && <Link to="/novidades" className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5">Novidades</Link>}
                  <button
                    onClick={() => { resetTutorial(); setTutorialOpen(true); }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                  >
                    Ver tutorial novamente
                  </button>
                  <button
                    onClick={() => signOut().then(() => nav({ to: "/" }))}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sair
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/auth"
                className="inline-flex h-11 min-w-[110px] items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:brightness-110 active:scale-95 sm:min-w-0 sm:h-9 sm:px-3 sm:text-xs"
              >
                <LogIn className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Entrar
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* FAB Master — acesso rápido no mobile para admins */}
      {isAdmin && (
        <Link
          to="/master"
          aria-label="Acesso rápido ao painel Master"
          className="fixed right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-elevated ring-2 ring-primary/40 transition hover:brightness-110 active:scale-95 sm:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
        >
          <Shield className="h-5 w-5" /> Master
        </Link>
      )}


      <header className="relative z-40 mx-auto max-w-7xl px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
        <HeroBanner
          url={heroImageUrl}
          fit={heroFit}
          heightMobile={heroHeightMobile}
          heightDesktop={heroHeightDesktop}
        />


        {gpsError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-xs text-warn" role="status">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{gpsError} Continue buscando por texto — nada trava.</span>
          </div>
        )}







        {/* BLOCO PRINCIPAL DE BUSCA */}
        <div className="glass-panel relative z-50 mt-6 grid gap-4 rounded-3xl p-6 shadow-elevated md:grid-cols-[1.2fr_1.4fr_auto] transition-all duration-500 hover:shadow-glow-primary">
          <SmartAutocomplete
            value={query}
            onChange={setQuery}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Categoria (padaria, pet shop, advogado...)"
            aria-label="Categoria de comércio"
            staticList={CATEGORY_SUGGESTIONS}
            minChars={1}
            leading={<Filter className="h-4 w-4 text-muted-foreground" aria-hidden />}
          />
          <SmartAutocomplete
            value={region}
            onChange={setRegion}
            onSelect={onSelectRegion}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Cidade, bairro ou endereço"
            aria-label="Região"
            asyncSource={regionSource}
            disabled={usingGps}
            wrapperClassName={`flex items-center gap-2 rounded-xl bg-glass px-4 py-3 ring-1 focus-within:ring-2 focus-within:ring-primary/70 ${usingGps ? "opacity-50 ring-border" : "ring-border"}`}
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            leading={<MapPin className="h-4 w-4 text-primary" aria-hidden />}
          />



          <button
            onClick={runSearch}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 hover:neon-primary disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </div>

        {/* AÇÕES RÁPIDAS */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={useGps}
            disabled={locating}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-60 ${
              usingGps && !pinned
                ? "border-primary bg-primary/15 text-primary"
                : "border-primary/60 text-primary hover:bg-primary/10"
            }`}
          >
            <Crosshair className={`h-3.5 w-3.5 ${locating ? "animate-spin" : ""}`} />
            {locating ? "Localizando..." : usingGps && !pinned ? "GPS ativo" : "Usar minha localização"}
          </button>
          {usingGps && pinned && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/60 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary">
              <MapPin className="h-3.5 w-3.5" />
              Ponto fixado no mapa
            </span>
          )}
          {usingGps && (
            <button
              onClick={() => { setUsingGps(false); setPinned(false); }}
              className="rounded-full bg-glass px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-border hover:text-foreground"
            >
              Voltar para texto
            </button>
          )}
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            Dica: clique em qualquer ponto do mapa para definir o centro da busca.
          </span>

          <button
            onClick={() => setShowAdvanced((s) => !s)}
            aria-expanded={showAdvanced}
            aria-controls="filtros-avancados"
            className="ml-auto flex items-center gap-1.5 rounded-full bg-glass px-3 py-1.5 text-xs font-semibold text-foreground ring-1 ring-border hover:bg-white/5"
          >
            <Filter className="h-3.5 w-3.5" /> Filtros avançados
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* FILTROS AVANÇADOS COLAPSÁVEIS */}
        {showAdvanced && (
          <div
            id="filtros-avancados"
            className="glass-panel mt-3 flex flex-wrap items-center gap-2 rounded-2xl p-3"
          >
            <label className="flex items-center gap-2 rounded-full bg-glass px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border">
              Raio
              <input
                type="range"
                min={1}
                max={20}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-24 accent-[color:var(--primary)]"
                aria-label="Raio de busca em quilômetros"
              />
              <span className="font-bold text-primary tabular-nums">{radiusKm}km</span>
            </label>

            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value as SiteFilter)}
              aria-label="Filtro de site"
              className="rounded-full bg-glass px-3 py-1.5 text-xs font-semibold text-foreground ring-1 ring-border [color-scheme:dark]"
            >
              <option className="bg-background text-foreground" value="any">Site: qualquer</option>
              <option className="bg-background text-foreground" value="no_site">Sem site</option>
              <option className="bg-background text-foreground" value="with_site">Com site</option>
            </select>

            <label className="flex items-center gap-1.5 rounded-full bg-glass px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border">
              <Star className="h-3 w-3 text-warn" aria-hidden />
              ≥
              <input
                type="number"
                min={0}
                max={5}
                step={0.5}
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                aria-label="Nota mínima"
                className="w-10 bg-transparent text-xs font-bold text-foreground outline-none"
              />
            </label>

            <label className="flex items-center gap-1.5 rounded-full bg-glass px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border">
              Avaliações ≥
              <input
                type="number"
                min={0}
                step={5}
                value={minReviews}
                onChange={(e) => setMinReviews(Number(e.target.value))}
                aria-label="Número mínimo de avaliações"
                className="w-12 bg-transparent text-xs font-bold text-foreground outline-none"
              />
            </label>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Ordenação"
              className="rounded-full bg-glass px-3 py-1.5 text-xs font-semibold text-foreground ring-1 ring-border [color-scheme:dark]"
            >
              <option className="bg-background text-foreground" value="score">Ordenar: Oportunidade</option>
              <option className="bg-background text-foreground" value="distance">Ordenar: Distância</option>
              <option className="bg-background text-foreground" value="rating">Ordenar: Avaliação</option>
              <option className="bg-background text-foreground" value="name">Ordenar: Nome</option>
            </select>
          </div>
        )}

        {/* BARRA DE RESUMO + EXPORT CSV EM DESTAQUE */}
        {(rawResults.length > 0 || loading) && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold tabular-nums text-foreground">{filtered.length}</span>
              <span className="text-muted-foreground">leads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/30" />
              <span className="font-bold text-primary">{hotCount}</span>
              <span className="text-muted-foreground">quentes</span>
            </div>
            {remaining != null && !isPro && (
              <span className="text-muted-foreground">· {remaining} busca(s) restantes no mês</span>
            )}
            <button
              onClick={doExport}
              disabled={filtered.length === 0}
              title={!isPro ? "Exportação CSV é do plano Pro" : "Baixar todos os leads filtrados em CSV"}
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground shadow-elevated hover:brightness-110 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> Baixar lista (CSV)
              {!isPro && <span className="ml-1 rounded-full bg-warn/25 px-1.5 py-0.5 text-[9px] text-warn">Pro</span>}
            </button>
          </div>
        )}

        {searchError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </header>

      {/* TABS MOBILE — só aparecem quando há resultado, para não competir com o mapa vazio */}
      {rawResults.length > 0 && (
        <div className="mx-auto mb-3 flex max-w-7xl gap-1 px-4 sm:px-6 lg:hidden" role="tablist">
          <button
            role="tab"
            aria-selected={mobileTab === "list"}
            onClick={() => setMobileTab("list")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${mobileTab === "list" ? "bg-primary text-primary-foreground" : "bg-glass text-foreground ring-1 ring-border"}`}
          >
            <List className="h-3.5 w-3.5" /> Lista ({filtered.length})
          </button>
          <button
            role="tab"
            aria-selected={mobileTab === "map"}
            onClick={() => setMobileTab("map")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${mobileTab === "map" ? "bg-primary text-primary-foreground" : "bg-glass text-foreground ring-1 ring-border"}`}
          >
            <MapIcon className="h-3.5 w-3.5" /> Mapa
          </button>
        </div>
      )}

      <main
        className={`mx-auto grid max-w-7xl gap-4 px-4 pb-16 sm:px-6 ${
          rawResults.length > 0 ? "lg:grid-cols-[minmax(0,1fr)_1.1fr]" : "lg:grid-cols-1"
        }`}
      >
        {/* Lista de resultados — só renderiza quando há dados. Nunca mais um bloco solto de texto. */}
        {rawResults.length > 0 && (
          <section
            className={`space-y-3 ${mobileTab === "list" ? "block" : "hidden"} lg:block lg:h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2`}
            aria-label="Resultados"
          >
            {loading && (
              <div className="glass-panel rounded-2xl p-6 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                <p className="mt-2">Consultando Google Places...</p>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="glass-panel rounded-2xl p-6 text-center text-sm text-muted-foreground">
                Nenhum resultado com esses filtros. Amplie o raio ou remova filtros.
              </div>
            )}
            {filtered.map((lead) => {
              const sport = sportsMap[lead.place_id] ? SPORT_BY_ID[sportsMap[lead.place_id]] : null;
              return (
                <div key={lead.place_id} className="space-y-1">
                  {sport && (
                    <div className="flex">
                      <span className="inline-flex items-center gap-1 rounded-t-lg bg-warn/90 px-2.5 py-1 text-[11px] font-bold text-primary">
                        <span>{sport.emoji}</span>
                        <span>{sport.label}</span>
                      </span>
                    </div>
                  )}
                  <LeadResultCard
                    lead={lead}
                    selected={selected === lead.place_id}
                    onSelect={() => setSelected(lead.place_id)}
                    onUpdate={updateOne}
                    citationsAvailable={citationsAvailable}
                    highlight={highlightTerms}
                  />

                </div>
              );
            })}
            {filtered.length > 0 && (
              <p className="flex items-center gap-1.5 pt-2 text-[10px] text-muted-foreground">
                <Info className="h-3 w-3" aria-hidden />
                <span title="Dados de site/social são obtidos por leitura pública. Nem todo domínio expõe WHOIS/RDAP público — nesse caso exibimos '—'. 'Atividade' é uma estimativa baseada na última modificação do sitemap.xml.">
                  Sobre a auditoria (passe o mouse)
                </span>
              </p>
            )}
          </section>
        )}

        {/* Mapa — SEMPRE visível. Ocupa 100% da largura quando não há resultados. */}
        <section
          className={`glass-panel relative overflow-hidden rounded-2xl ${
            rawResults.length > 0
              ? `${mobileTab === "map" ? "block h-[55svh] max-h-[calc(100dvh-12rem)]" : "hidden"} lg:sticky lg:top-4 lg:block lg:h-[calc(100vh-8rem)]`
              : "block h-[65svh] max-h-[calc(100dvh-10rem)] lg:h-[calc(100vh-14rem)]"
          }`}
          style={{ marginBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          aria-label="Mapa"
        >
          <ClientOnly fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">Carregando mapa...</div>}>
            <Suspense fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">Carregando mapa...</div>}>
              <MapView
                center={center}
                radiusKm={radiusKm}
                leads={filtered}
                selectedId={selected}
                onSelect={setSelected}
                onMapClick={onMapPin}
              />
            </Suspense>
          </ClientOnly>

          {/* Overlay: instrução de pin quando o mapa está vazio */}
          {rawResults.length === 0 && !loading && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-background/85 px-4 py-2 text-[11px] font-semibold text-foreground shadow-elevated ring-1 ring-border backdrop-blur-md sm:text-xs">
              <MapPin className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
              Toque no mapa para escolher o centro, ou digite acima e clique em <span className="text-primary">Buscar</span>.
            </div>
          )}

          {/* Botão flutuante "Buscar aqui" — aparece quando um pin foi fixado manualmente */}
          {pinned && (
            <button
              onClick={runSearch}
              disabled={loading}
              className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-elevated ring-2 ring-primary/40 transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar aqui
            </button>
          )}
        </section>
      </main>
      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      {quotaBlocked && !isPro && !isAdmin && !isMaster && (
        <FreeQuotaBlock supportWa={supportWa} onClose={() => setQuotaBlocked(false)} />
      )}
    </div>
  );
}

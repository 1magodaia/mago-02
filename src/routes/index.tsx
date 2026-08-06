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
  ShieldCheck,
  Ban,
  Mail,
  MessageCircle,
  X,
  Star,
  User as UserIcon,
  Zap,
  Sparkles,
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
import { addHistory, cacheGet, cacheSet, exportToCsv, isContacted, isFavorite } from "@/lib/storage";
import { haversineKm } from "@/lib/geo";
import { LogoIcon, LogoWordmark } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { FREE_LIFETIME_SEARCH_LIMIT, type Profile } from "@/lib/profile.functions";
import { TutorialModal, resetTutorial } from "@/components/tutorial-modal";
import { SPORT_BY_ID } from "@/lib/sports-categories";
import type { SportCategory } from "@/lib/sports-categories";
import heroDefault from "@/assets/hero-banner.png.asset.json";
import { HeroBanner } from "@/components/hero-banner";
import { MembershipBadge } from "@/components/membership-badge";

import { OnboardingTour } from "@/components/onboarding-tour";

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
      { title: "Busca Magica — Prospecção de comércios locais" },
      {
        name: "description",
        content:
          "Encontre comércios com presença digital fraca via Google Places. Auditoria de site (WHOIS + sitemap), score de oportunidade e exportação em CSV.",
      },
      { property: "og:title", content: "Busca Magica — Prospecção de comércios locais" },
      {
        property: "og:description",
        content: "Encontre comércios com presença digital fraca via Google Places. Auditoria de site (WHOIS + sitemap), score de oportunidade e exportação em CSV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type SortKey = "score" | "distance" | "rating" | "name";
type SiteFilter = "any" | "no_site" | "with_site";





function FreeQuotaBlock({ supportWa, unlockLink, onClose }: { supportWa: string | null; unlockLink: string | null; onClose: () => void }) {
  const digits = (supportWa ?? "").replace(/\D/g, "");
  const msg = encodeURIComponent(
    "Olá! Já usei minha busca gratuita no Busca Magica e quero ativar minha conta para liberar acesso completo.",
  );
  const waHref = digits ? `https://wa.me/${digits}?text=${msg}` : null;
  const actionHref = unlockLink || waHref;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] grid place-items-center bg-black/60 p-4 backdrop-blur-2xl"
      onClick={onClose}
    >
      <div
        className="glass-panel relative w-full max-w-md rounded-3xl border border-primary/30 p-8 text-center shadow-elevated slide-up-fade"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/15 ring-1 ring-primary/40">
          <Ban className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-black text-foreground">
          Seu acesso limitado expirou
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {unlockLink 
            ? "O modo Free permite testar o app. Para prospecção profissional ilimitada, ative o Pro."
            : "Ative sua conta pelo WhatsApp para liberar acesso completo e prospectar leads sem limites."}
        </p>

        {/* Plan Comparison */}
        <div className="mt-6 rounded-2xl bg-white/5 p-4 text-left ring-1 ring-border text-[11px]">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
            <span className="font-bold text-muted-foreground uppercase">Benefícios</span>
            <div className="flex gap-4 font-black">
              <span className="text-muted-foreground">Free</span>
              <span className="text-primary">Pro</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Buscas mensais</span>
              <div className="flex gap-8"><span>1</span> <span className="font-bold">∞</span></div>
            </div>
            <div className="flex justify-between">
              <span>Exportação CSV</span>
              <div className="flex gap-8"><span>Não</span> <span className="font-bold">Sim</span></div>
            </div>
            <div className="flex justify-between">
              <span>Auditoria Completa (Scraping)</span>
              <div className="flex gap-8"><span>Não</span> <span className="font-bold">Sim</span></div>
            </div>
            <div className="flex justify-between">
              <span>Histórico de buscas</span>
              <div className="flex gap-8"><span>Não</span> <span className="font-bold">Sim</span></div>
            </div>
          </div>
        </div>

        {actionHref ? (
          <a
            href={actionHref}


            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-black text-primary-foreground shadow-glow-primary transition-all hover:scale-[1.02] active:scale-95"
          >
            {unlockLink ? <ShieldCheck className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
            {unlockLink ? "DESBLOQUEAR ACESSO PRO" : "ATUALIZAR VIA WHATSAPP"}
          </a>
        ) : (
          <p className="mt-6 rounded-xl bg-glass px-4 py-3 text-xs text-muted-foreground ring-1 ring-border">
            Link de ativação indisponível. Fale com o administrador.
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

function ProWelcomeModal({ onClose }: { onClose: () => void }) {
  const digits = "5531980219724";
  const msg = encodeURIComponent("Olá! Sou usuário Pro do Busca Magica e estou enviando meu e-mail e comprovante para ativação.");
  const waHref = `https://wa.me/${digits}?text=${msg}`;

  return (
    <div className="fixed inset-0 z-[9998] grid place-items-center bg-black/60 p-4 backdrop-blur-2xl" onClick={onClose}>
      <div className="glass-panel relative w-full max-w-lg rounded-3xl border border-primary/40 p-10 text-center shadow-elevated slide-up-fade" onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-primary/20 ring-1 ring-primary/60">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-black text-foreground tracking-tight">Você agora é PRO!</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Para liberar seu acesso total, envie seu <span className="text-foreground font-bold underline">e-mail de cadastro</span> e o <span className="text-foreground font-bold underline">comprovante de compra</span> agora mesmo.
        </p>
        
        <div className="mt-8 space-y-4">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#25D366] px-8 py-4 text-lg font-black text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#25D366]/20"
          >
            <MessageCircle className="h-6 w-6" />
            Enviar via WhatsApp (31) 98021-9724
          </a>
          <div className="flex items-center gap-3 rounded-xl bg-glass p-4 text-left ring-1 ring-border">
            <Mail className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Ou envie para</p>
              <p className="text-sm font-medium text-foreground">contato@buscamagica.app</p>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="mt-8 text-sm text-muted-foreground hover:text-primary transition-colors">
          Entendi, vou enviar agora
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
  const [unlockLink, setUnlockLink] = useState<string | null>(null);
  const [showProWelcome, setShowProWelcome] = useState(false);
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
          setUnlockLink(s.unlock_link);
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
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0B1F]">
        {/* Immersive Loading Background */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[#0A0B1F] animate-noise mix-blend-overlay opacity-40" />
          <div className="absolute top-[-10%] left-[-5%] h-[60%] w-[60%] rounded-full bg-primary/20 blur-[120px] animate-float-slow" />
          <div className="absolute bottom-[-15%] right-[-5%] h-[60%] w-[60%] rounded-full bg-warn/10 blur-[120px] animate-float-slow" style={{ animationDelay: '-5s' }} />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in duration-1000">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse" />
            <LogoIcon className="h-24 w-24 relative z-10 animate-float-magical" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="h-1 w-48 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
              <div className="h-full w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-primary to-transparent" />
            </div>
            <span className="text-[12px] font-black uppercase tracking-[0.3em] text-primary glow-text animate-pulse">
              Sincronizando Magia...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <ProTeaser />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <OnboardingTour />


      {/* NAV — sticky com safe-area; alvos de toque ≥44px no mobile */}
      <nav
        className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0B1F]/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#0A0B1F]/60"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <Link to="/" aria-label="Busca Magica — início" className="shrink-0">
            <LogoIcon className="h-10 w-10 sm:hidden" />
            <span className="hidden sm:block"><LogoWordmark /></span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-4">
            {user && (
              <MembershipBadge 
                showBenefits={() => setQuotaBlocked(true)} 
                className="hidden md:flex" 
              />
            )}
            {user && (
              <Link
                to="/leads"
                className="hidden h-9 items-center gap-1.5 rounded-full bg-white/[0.03] px-3 text-xs font-bold text-foreground ring-1 ring-white/10 hover:bg-white/5 sm:inline-flex"
              >
                <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> Meus leads
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/master"
                aria-label={isMaster ? "Abrir painel Master" : "Abrir painel Admin"}
                className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-primary/15 px-4 text-sm font-semibold text-primary ring-1 ring-primary/40 hover:bg-primary/25 active:scale-95 sm:h-9 sm:px-3 sm:text-xs"
              >
                <Shield className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
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
                  className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-white/[0.03] px-4 text-sm font-bold text-foreground ring-1 ring-white/10 hover:bg-white/5 active:scale-95 sm:h-9 sm:px-3 sm:text-xs"
                  aria-label="Menu da conta"
                >
                  <UserIcon className="h-4 w-4 text-primary sm:h-3.5 sm:w-3.5" />
                  <span className="hidden max-w-[120px] truncate sm:inline">{profile?.full_name || user.email}</span>
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
              <div className="flex items-center gap-2">
                {!isPro && !isMaster && !isAdmin && (
                  <div id="pro-upgrade-link">
                    <FreeQuotaBadge used={profile?.search_count_month ?? 0} />
                  </div>
                )}

                <Link
                  to="/auth"
                  className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-black uppercase tracking-widest text-primary-foreground hover:brightness-110 shadow-glow-primary transition-all hover:scale-105 active:scale-95 sm:h-9 sm:px-3 sm:text-xs"
                >
                  <LogIn className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Entrar
                </Link>
              </div>
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







        {/* BLOCO PRINCIPAL DE BUSCA - Redesenhado Premium */}
        <div id="search-input" className="glass-card relative z-50 mt-8 grid gap-4 p-6 ring-1 ring-primary/20 md:grid-cols-[1.2fr_1.4fr_auto]">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-primary glow-text ml-1">Categoria</label>
            <div className="relative group">
              <SmartAutocomplete
                value={query}
                onChange={setQuery}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Ex: Padaria, Pet Shop..."
                aria-label="Categoria de comércio"
                staticList={CATEGORY_SUGGESTIONS}
                minChars={1}
                wrapperClassName="flex h-14 items-center gap-3 rounded-2xl bg-white/[0.02] px-4 ring-1 ring-white/10 transition-all focus-within:ring-primary/40 focus-within:bg-white/[0.05]"
                className="w-full bg-transparent text-base font-bold text-foreground outline-none placeholder:text-muted-foreground/50"
                leading={<Filter className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden />}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-primary glow-text ml-1">Região</label>
            <div className="relative group">
              <SmartAutocomplete
                value={region}
                onChange={setRegion}
                onSelect={onSelectRegion}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Cidade ou Bairro..."
                aria-label="Região"
                asyncSource={regionSource}
                disabled={usingGps}
                wrapperClassName={`flex h-14 items-center gap-3 rounded-2xl bg-white/[0.02] px-4 ring-1 transition-all focus-within:ring-primary/40 focus-within:bg-white/[0.05] ${usingGps ? "opacity-50 ring-border" : "ring-white/10"}`}
                className="w-full bg-transparent text-base font-bold text-foreground outline-none placeholder:text-muted-foreground/50"
                leading={<MapPin className="h-5 w-5 text-primary" aria-hidden />}
              />
              <button
                onClick={useGps}
                disabled={locating}
                title="Usar minha localização"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-primary/10 p-2 text-primary transition-all hover:bg-primary/20 disabled:opacity-50"
              >
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={runSearch}
              disabled={loading}
              className="h-14 min-w-[160px] w-full rounded-2xl bg-primary px-8 text-base font-black uppercase tracking-[0.2em] text-primary-foreground shadow-glow-primary transition-all hover:scale-[1.02] hover:brightness-110 active:scale-95 disabled:opacity-60 group relative overflow-hidden"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
              {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-5 w-5 fill-current" />
                  <span>BUSCAR</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Search History Quick Access */}
        <SearchHistory 
          items={typeof window !== "undefined" ? JSON.parse(localStorage.getItem('bm.history') || '[]').slice(0, 5) : []} 
          onSelect={(q) => setQuery(q)}
        />


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
        <div className="mx-auto mb-4 flex max-w-7xl gap-2 px-4 sm:px-6 lg:hidden" role="tablist">
          <button
            role="tab"
            aria-selected={mobileTab === "list"}
            onClick={() => setMobileTab("list")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl h-14 text-sm font-black uppercase tracking-widest transition-all ${mobileTab === "list" ? "bg-primary text-primary-foreground shadow-glow-primary scale-[1.02]" : "bg-white/5 text-muted-foreground ring-1 ring-white/10"}`}
          >
            <List className="h-5 w-5" /> Lista ({filtered.length})
          </button>
          <button
            role="tab"
            aria-selected={mobileTab === "map"}
            onClick={() => setMobileTab("map")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl h-14 text-sm font-black uppercase tracking-widest transition-all ${mobileTab === "map" ? "bg-primary text-primary-foreground shadow-glow-primary scale-[1.02]" : "bg-white/5 text-muted-foreground ring-1 ring-white/10"}`}
          >
            <MapIcon className="h-5 w-5" /> Mapa
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
            className={`space-y-3 ${mobileTab === "list" ? "block" : "hidden"} lg:block lg:h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2 scrollbar-magical content-auto`}
            aria-label="Resultados"
          >
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => <LeadSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass-card p-10 text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-muted-foreground/50">
                  <Filter className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-foreground mb-1">Nenhum lead encontrado</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tente ampliar o raio de busca ou ajustar os filtros de avaliação e site.
                </p>
              </div>
            ) : null}
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

        {rawResults.length === 0 && !loading && (
          <section className="mx-auto max-w-md py-12 px-4">
            {!query && !isPro && <ProTeaser />}
          </section>
        )}

        {/* Mapa — SEMPRE visível. Ocupa 100% da largura quando não há resultados. */}
        {/* Mapa — Renderizado dinamicamente para performance */}
        <section
          className={`glass-card relative overflow-hidden transition-all duration-500 ${
            rawResults.length > 0
              ? `${mobileTab === "map" ? "block h-[70svh]" : "hidden"} lg:sticky lg:top-4 lg:block lg:h-[calc(100vh-8rem)]`
              : "block h-[65svh] lg:h-[calc(100vh-14rem)]"
          }`}
          style={{ marginBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          aria-label="Mapa"
        >
          <ClientOnly fallback={<div className="grid h-full place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary/30" /></div>}>
            <Suspense fallback={
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0B1F]/60 backdrop-blur-md">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                  <MapIcon className="h-10 w-10 text-primary/40 animate-pulse relative z-10" />
                </div>
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                  <div className="h-full w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                </div>
                <span className="mt-3 text-[10px] font-black uppercase tracking-widest text-primary/60">Carregando Mapa...</span>
              </div>
            }>
              {/* Lazy Loading: Só renderiza o mapa no mobile se a tab de mapa estiver ativa ou se estiver em desktop */}
              {(typeof window !== "undefined" && (window.innerWidth >= 1024 || mobileTab === "map" || rawResults.length === 0)) ? (
                <>
                  <MapOverlay />
                  <MapView
                    center={center}
                    radiusKm={radiusKm}
                    leads={filtered}
                    selectedId={selected}
                    onSelect={setSelected}
                    onMapClick={onMapPin}
                  />
                </>
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-white/[0.02]">
                  <button 
                    onClick={() => setMobileTab("map")}
                    className="flex flex-col items-center gap-3 rounded-2xl bg-primary/10 p-6 ring-1 ring-primary/30 transition-all hover:bg-primary/20"
                  >
                    <MapIcon className="h-8 w-8 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest text-primary">Ativar Visualização do Mapa</span>
                  </button>
                </div>
              )}
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
              className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 items-center gap-3 rounded-full bg-primary px-8 py-4 text-base font-black uppercase tracking-widest text-primary-foreground shadow-glow-primary ring-2 ring-primary/40 transition-all hover:scale-[1.05] hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              Buscar aqui
            </button>
          )}
        </section>
      </main>
      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      {quotaBlocked && !isPro && !isAdmin && !isMaster && (
        <FreeQuotaBlock 
          supportWa={supportWa} 
          unlockLink={unlockLink} 
          onClose={() => setQuotaBlocked(false)} 
        />
      )}
      {showProWelcome && <ProWelcomeModal onClose={() => setShowProWelcome(false)} />}
    </div>
  );
}

function SearchHistory({ items, onSelect }: { items: string[], onSelect: (q: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 px-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Recentes:</span>
      {items.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q)}
          className="rounded-full bg-glass px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border transition hover:bg-primary/10 hover:text-primary hover:ring-primary/40"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

function ProBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 ring-1 ring-primary/40 shadow-neon-primary/20">
      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
      <span className="text-[10px] font-black uppercase tracking-widest text-primary">Conta PRO</span>
    </div>
  );
}

function FreeQuotaBadge({ used }: { used: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-warn/10 px-3 py-1 ring-1 ring-warn/30">
      <AlertCircle className="h-3.5 w-3.5 text-warn" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-warn">
        Busca Free: {used}/{FREE_LIFETIME_SEARCH_LIMIT}
      </span>
    </div>
  );
}

function MapOverlay() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/20 backdrop-blur-[1px] transition-opacity duration-1000 animate-out fade-out fill-mode-forwards">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-black/60 p-6 text-white shadow-2xl ring-1 ring-white/20">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 animate-bounce rounded-full border-2 border-white/40 flex items-center justify-center">
              <span className="text-xs">👆</span>
            </div>
            <span className="text-[10px] font-bold uppercase">Mover</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 animate-pulse rounded-full border-2 border-white/40 flex items-center justify-center">
              <span className="text-xs">🤏</span>
            </div>
            <span className="text-[10px] font-bold uppercase">Zoom</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadSkeleton() {
  return (
    <div className="glass-panel relative flex flex-col gap-3 rounded-2xl p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-5 w-48 rounded bg-white/10" />
          <div className="h-3 w-32 rounded bg-white/10" />
        </div>
        <div className="h-12 w-12 rounded-xl bg-white/10" />
      </div>
      <div className="h-8 w-full rounded-lg bg-white/10" />
      <div className="flex gap-2">
        <div className="h-4 w-16 rounded-full bg-white/10" />
        <div className="h-4 w-16 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

function ProTeaser() {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-primary/40 bg-primary/5 p-8 text-center ring-1 ring-primary/20 backdrop-blur-sm transition-all hover:border-primary/60 hover:bg-primary/10">
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/20 blur-3xl transition-all group-hover:scale-110" />
      
      <div className="relative z-10">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary shadow-glow-primary">
          <Sparkles className="h-8 w-8 animate-pulse" />
        </div>
        
        <h3 className="text-lg font-black uppercase tracking-[0.2em] text-primary">Libere o Poder Mágico</h3>
        
        <div className="mt-6 space-y-3 text-left">
          {[
            "Buscas ilimitadas em todo o Brasil",
            "Extração de e-mails reais de sites",
            "Auditoria avançada de presença digital",
            "Exportação total para Excel/CSV",
            "Histórico completo e filtros salvos"
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        <Link
          to="/auth"
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-xs font-black uppercase tracking-[0.2em] text-primary-foreground shadow-glow-primary transition-all hover:scale-[1.02] active:scale-95"
        >
          <Zap className="h-4 w-4 fill-current" />
          QUERO SER PRO AGORA
        </Link>
      </div>
    </div>
  );
}




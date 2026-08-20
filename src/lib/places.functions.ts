import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FREE_LIFETIME_SEARCH_LIMIT } from "@/lib/profile.functions";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

const searchSchema = z.object({
  query: z.string().min(1).max(200),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radiusKm: z.number().min(1).max(50).default(5),
  regionText: z.string().max(200).optional(),
});

export interface PlaceReview {
  publish_time: string; // ISO
  rating: number | null;
  author: string | null;
}

export interface PlaceResult {
  place_id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  business_status: string | null;
  types: string[];
  google_maps_uri: string | null;
  latest_review_at: string | null; // ISO — data da avaliação mais recente
  reviews: PlaceReview[];
  collected_at: string; // ISO — quando este registro foi coletado do Google
  price_level: number | null; // 0..4 (Google Places), null quando não informado
}

interface GReview {
  publishTime?: string;
  rating?: number;
  authorAttribution?: { displayName?: string };
}

interface GPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  formattedPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  types?: string[];
  googleMapsUri?: string;
  reviews?: GReview[];
  priceLevel?: string; // "PRICE_LEVEL_FREE" | "_INEXPENSIVE" | "_MODERATE" | "_EXPENSIVE" | "_VERY_EXPENSIVE" | "_UNSPECIFIED"
}

function mapPriceLevel(v?: string): number | null {
  switch (v) {
    case "PRICE_LEVEL_FREE": return 0;
    case "PRICE_LEVEL_INEXPENSIVE": return 1;
    case "PRICE_LEVEL_MODERATE": return 2;
    case "PRICE_LEVEL_EXPENSIVE": return 3;
    case "PRICE_LEVEL_VERY_EXPENSIVE": return 4;
    default: return null;
  }
}


async function callGateway(
  path: string,
  body: object | null,
  fieldMask: string,
  method: "POST" | "GET" = "POST",
): Promise<Response> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || !lovableKey) throw new Error("Missing Google Maps connector credentials");
  return fetch(`${GATEWAY}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": fieldMask,
    },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });
}

function pickLatestReview(reviews: GReview[] | undefined): {
  latest: string | null;
  list: PlaceReview[];
} {
  if (!reviews?.length) return { latest: null, list: [] };
  const list: PlaceReview[] = reviews
    .filter((r) => r.publishTime)
    .map((r) => ({
      publish_time: r.publishTime!,
      rating: r.rating ?? null,
      author: r.authorAttribution?.displayName ?? null,
    }))
    .sort((a, b) => Date.parse(b.publish_time) - Date.parse(a.publish_time));
  return { latest: list[0]?.publish_time ?? null, list };
}

function mapPlace(p: GPlace, collectedAt: string): PlaceResult {
  const { latest, list } = pickLatestReview(p.reviews);
  return {
    place_id: p.id,
    name: p.displayName?.text ?? "Sem nome",
    address: p.formattedAddress ?? "",
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    phone: p.formattedPhoneNumber || p.internationalPhoneNumber || p.nationalPhoneNumber || null,
    website: p.websiteUri || null,
    rating: p.rating ?? 0,
    user_ratings_total: p.userRatingCount ?? 0,
    business_status: p.businessStatus ?? null,
    types: p.types ?? [],
    google_maps_uri: p.googleMapsUri ?? null,
    latest_review_at: latest,
    reviews: list,
    collected_at: collectedAt,
    price_level: mapPriceLevel(p.priceLevel),
  };
}

const PLACE_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "internationalPhoneNumber",
  "nationalPhoneNumber",
  "formattedPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "businessStatus",
  "types",
  "googleMapsUri",
  "reviews",
  "priceLevel",
];

const FIELD_MASK = PLACE_FIELDS.map((f) => `places.${f}`).join(",");
const DETAILS_FIELD_MASK = PLACE_FIELDS.join(",");


async function handle403(response: Response): Promise<never> {
  const details: Array<{ reason?: string }> =
    (await response.json().catch(() => ({})))?.error?.details ?? [];
  const reason = details.find((d) => d.reason)?.reason;
  if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") {
    throw new Error(
      "Google Maps: chave server está com restrição de referrer. Em Google Cloud Console, mude para 'None' ou 'IP addresses'.",
    );
  }
  if (reason === "API_KEY_SERVICE_BLOCKED") {
    throw new Error(
      "Google Maps: chave server não permite esta API. Adicione a API à lista permitida no Google Cloud Console.",
    );
  }
  throw new Error("Google Maps: requisição negada (403). Verifique as restrições da chave.");
}

export const searchPlaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => searchSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ results: PlaceResult[]; error?: string; remaining?: number; plan?: string; quotaExhausted?: boolean }> => {
    try {
      // Security check: Master bypasses quota.
      const { data: isMaster } = await context.supabase.rpc("is_master" as any, { _user_id: context.userId });
      
      let quota: any;
      if (isMaster) {
        quota = { allowed: true, remaining: 999999, plan: "master" };
      } else {
        // Quota check via SECURITY DEFINER RPC (atomic increment; blocks 'blocked' users).
        // Free = 1 busca vitalícia (regra v5.7.3). Pro/master seguem inalterados.
        const { data: quotaRows, error: quotaErr } = await context.supabase.rpc("consume_search_quota", {
          _user_id: context.userId,
          _free_limit: FREE_LIFETIME_SEARCH_LIMIT,
        });
        if (quotaErr) {
          console.error("[places] quota error", quotaErr.message);
          return { results: [], error: "Falha ao validar cota de buscas." };
        }
        quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
      }
      if (!quota?.allowed) {
        return {
          results: [],
          error: quota?.plan === "free"
            ? "Você já usou sua busca gratuita. Fale com a gente para liberar acesso completo."
            : "Conta bloqueada. Fale com o suporte.",
          remaining: 0,
          plan: quota?.plan,
          quotaExhausted: quota?.plan === "free",
        };
      }

      const body: Record<string, unknown> = {
        textQuery: data.regionText ? `${data.query} em ${data.regionText}` : data.query,
        pageSize: 20,
        languageCode: "pt-BR",
        regionCode: "BR",
      };
      if (data.lat != null && data.lng != null) {
        body.locationBias = {
          circle: {
            center: { latitude: data.lat, longitude: data.lng },
            radius: Math.min(data.radiusKm * 1000, 50000),
          },
        };
      }
      const res = await callGateway("/places/v1/places:searchText", body, FIELD_MASK);
      if (res.status === 403) await handle403(res);
      if (!res.ok) {
        const text = await res.text();
        console.error(`[places] ${res.status} ${text}`);
        return { results: [], error: `Google Places: ${res.status}` };
      }
      const json = (await res.json()) as { places?: GPlace[] };
      const collectedAt = new Date().toISOString();
      return {
        results: (json.places ?? []).map((p) => mapPlace(p, collectedAt)),
        remaining: quota.remaining,
        plan: quota.plan,
      };

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[places] error", msg);
      return { results: [], error: msg };
    }
  });

// Refresh a single place — does NOT consume monthly search quota.
// Rate-limit is intentional: 1 refresh a cada 60s por (usuário+place).
const refreshCache = new Map<string, number>();
const REFRESH_MIN_INTERVAL_MS = 60_000;

export const refreshPlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ place_id: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data, context }): Promise<{ place: PlaceResult | null; error?: string }> => {
    const key = `${context.userId}:${data.place_id}`;
    const last = refreshCache.get(key) ?? 0;
    if (Date.now() - last < REFRESH_MIN_INTERVAL_MS) {
      return { place: null, error: "Aguarde ~1 min antes de atualizar este lead novamente." };
    }
    try {
      const res = await callGateway(
        `/places/v1/places/${encodeURIComponent(data.place_id)}?languageCode=pt-BR&regionCode=BR`,
        null,
        DETAILS_FIELD_MASK,
        "GET",
      );
      if (res.status === 403) await handle403(res);
      if (!res.ok) {
        const text = await res.text();
        console.error(`[places refresh] ${res.status} ${text}`);
        return { place: null, error: `Google Places: ${res.status}` };
      }
      refreshCache.set(key, Date.now());
      const p = (await res.json()) as GPlace;
      return { place: mapPlace(p, new Date().toISOString()) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[places refresh] error", msg);
      return { place: null, error: msg };
    }
  });


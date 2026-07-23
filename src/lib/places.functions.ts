import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FREE_MONTHLY_SEARCH_LIMIT } from "@/lib/profile.functions";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

const searchSchema = z.object({
  query: z.string().min(1).max(200),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radiusKm: z.number().min(1).max(50).default(5),
  regionText: z.string().max(200).optional(),
});

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
}

interface GPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  types?: string[];
  googleMapsUri?: string;
}

async function callGateway(path: string, body: object, fieldMask: string): Promise<Response> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || !lovableKey) throw new Error("Missing Google Maps connector credentials");
  return fetch(`${GATEWAY}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });
}

function mapPlace(p: GPlace): PlaceResult {
  return {
    place_id: p.id,
    name: p.displayName?.text ?? "Sem nome",
    address: p.formattedAddress ?? "",
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    rating: p.rating ?? null,
    user_ratings_total: p.userRatingCount ?? null,
    business_status: p.businessStatus ?? null,
    types: p.types ?? [],
    google_maps_uri: p.googleMapsUri ?? null,
  };
}

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.internationalPhoneNumber",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
  "places.types",
  "places.googleMapsUri",
].join(",");

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
  .handler(async ({ data, context }): Promise<{ results: PlaceResult[]; error?: string; remaining?: number; plan?: string }> => {
    try {
      // Quota check via SECURITY DEFINER RPC (atomic increment; blocks 'blocked' users)
      const { data: quotaRows, error: quotaErr } = await context.supabase.rpc("consume_search_quota", {
        _user_id: context.userId,
        _free_limit: FREE_MONTHLY_SEARCH_LIMIT,
      });
      if (quotaErr) {
        console.error("[places] quota error", quotaErr.message);
        return { results: [], error: "Falha ao validar cota de buscas." };
      }
      const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
      if (!quota?.allowed) {
        return {
          results: [],
          error: quota?.plan === "free"
            ? `Limite mensal atingido (${FREE_MONTHLY_SEARCH_LIMIT} buscas). Faça upgrade para Pro.`
            : "Conta bloqueada. Fale com o suporte.",
          remaining: 0,
          plan: quota?.plan,
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
      return {
        results: (json.places ?? []).map(mapPlace),
        remaining: quota.remaining,
        plan: quota.plan,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[places] error", msg);
      return { results: [], error: msg };
    }
  });

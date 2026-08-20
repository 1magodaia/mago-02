import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

const inputSchema = z.object({
  input: z.string().trim().min(1).max(200),
  bias: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
  sessionToken: z.string().max(200).optional(),
});

const detailsSchema = z.object({
  placeId: z.string().trim().min(1).max(200),
  sessionToken: z.string().max(200).optional(),
});

export interface AutocompleteSuggestion {
  placeId: string;
  primary: string;
  secondary: string;
  full: string;
}

interface GAutocompleteResp {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
}

/**
 * Autocomplete de endereços/regiões via Places API (New).
 * Não consome a cota de busca — apenas sugestões.
 */
export const autocompleteRegion = createServerFn({ method: "POST" })
  .inputValidator((v) => inputSchema.parse(v))
  .handler(async ({ data }): Promise<{ suggestions: AutocompleteSuggestion[]; error?: string }> => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!apiKey || !lovableKey) return { suggestions: [], error: "missing_keys" };

    const body: Record<string, unknown> = {
      input: data.input,
      languageCode: "pt-BR",
      regionCode: "BR",
      includedRegionCodes: ["br"],
    };
    if (data.sessionToken) body.sessionToken = data.sessionToken;
    if (data.bias) {
      body.locationBias = {
        circle: {
          center: { latitude: data.bias.lat, longitude: data.bias.lng },
          radius: 50000,
        },
      };
    }

    try {
      const res = await fetch(`${GATEWAY}/places/v1/places:autocomplete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`[autocomplete] ${res.status} ${text}`);
        return { suggestions: [], error: `http_${res.status}` };
      }
      const json = (await res.json()) as GAutocompleteResp;
      const suggestions: AutocompleteSuggestion[] = (json.suggestions ?? [])
        .map((s) => s.placePrediction)
        .filter((p): p is NonNullable<typeof p> => !!p && !!p.placeId)
        .map((p) => ({
          placeId: p.placeId!,
          primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
          secondary: p.structuredFormat?.secondaryText?.text ?? "",
          full: p.text?.text ?? p.structuredFormat?.mainText?.text ?? "",
        }))
        .filter((s) => !!s.full);
      return { suggestions };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro";
      console.error("[autocomplete] error", msg);
      return { suggestions: [], error: msg };
    }
  });

interface GPlaceDetailsResp {
  id?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  displayName?: { text?: string };
}

export const resolvePlace = createServerFn({ method: "POST" })
  .inputValidator((v) => detailsSchema.parse(v))
  .handler(
    async ({
      data,
    }): Promise<{
      lat: number | null;
      lng: number | null;
      address: string | null;
      name: string | null;
      error?: string;
    }> => {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      const lovableKey = process.env.LOVABLE_API_KEY;
      if (!apiKey || !lovableKey) return { lat: null, lng: null, address: null, name: null, error: "missing_keys" };

      try {
        const url = `${GATEWAY}/places/v1/places/${encodeURIComponent(data.placeId)}?languageCode=pt-BR&regionCode=BR${data.sessionToken ? `&sessionToken=${encodeURIComponent(data.sessionToken)}` : ""}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": apiKey,
            "X-Goog-FieldMask": "id,formattedAddress,location,displayName",
          },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error(`[resolvePlace] ${res.status} ${text}`);
          return { lat: null, lng: null, address: null, name: null, error: `http_${res.status}` };
        }
        const p = (await res.json()) as GPlaceDetailsResp;
        return {
          lat: p.location?.latitude ?? null,
          lng: p.location?.longitude ?? null,
          address: p.formattedAddress ?? null,
          name: p.displayName?.text ?? null,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "erro";
        console.error("[resolvePlace] error", msg);
        return { lat: null, lng: null, address: null, name: null, error: msg };
      }
    },
  );

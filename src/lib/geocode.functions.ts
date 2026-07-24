import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

/**
 * Geocodificação reversa (lat,lng → endereço legível).
 * Retorna string curta ou null se não encontrar. Uso opcional: só para o
 * usuário confirmar visualmente onde clicou no mapa. A busca em si usa as
 * coordenadas cruas, então esta função nunca é bloqueante.
 */
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }): Promise<{ address: string | null }> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !gmKey) return { address: null };
    try {
      const url = `${GATEWAY_URL}/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=pt-BR&region=BR`;
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gmKey,
        },
      });
      if (!resp.ok) return { address: null };
      const json = (await resp.json()) as {
        status?: string;
        results?: Array<{ formatted_address?: string }>;
      };
      if (json.status !== "OK" || !json.results?.length) return { address: null };
      return { address: json.results[0].formatted_address ?? null };
    } catch {
      return { address: null };
    }
  });

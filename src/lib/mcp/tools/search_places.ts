import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

const FREE_LIMIT = 1;

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type PlacesResult = {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  business_status?: string;
  price_level?: number;
};

export default defineTool({
  name: "search_places",
  title: "Search local businesses",
  description:
    "Busca comércios locais via Google Places por categoria + região (ex: 'padaria em São Paulo'). " +
    "Consome 1 busca da quota do usuário (Free = 1 busca vitalícia, Pro = ilimitado ou por saldo). " +
    "Retorna nome, endereço, coordenadas, nota e nº de avaliações. Use save_lead para persistir um resultado.",
  inputSchema: {
    query: z
      .string()
      .describe("O que buscar. Combine categoria + região, ex: 'barbearia Vila Madalena São Paulo'."),
    max_results: z
      .number()
      .int()
      .positive()
      .describe("Limite de resultados (default 20, teto 20 — Google Places retorna até 20 por página).")
      .default(20),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
  handler: async ({ query, max_results }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return {
        content: [{ type: "text", text: "GOOGLE_MAPS_API_KEY não configurada no servidor." }],
        isError: true,
      };
    }

    const supabase = userClient(ctx);
    const { data: isMaster } = await supabase.rpc("is_master" as any, { _user_id: ctx.getUserId() });
    if (isMaster) {
      // Master has unlimited access, bypass consume_search_quota but still identify as Master
      var quota: any = { allowed: true, remaining: 999999, plan: "master" };
    } else {
      const { data: quotaRows, error: quotaErr } = await supabase.rpc("consume_search_quota", {
        _user_id: ctx.getUserId(),
        _free_limit: FREE_LIMIT,
      });
      if (quotaErr) {
        return {
          content: [{ type: "text", text: `Erro ao validar quota: ${quotaErr.message}` }],
          isError: true,
        };
      }
      quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
    }

    if (!quota?.allowed) {
      return {
        content: [
          {
            type: "text",
            text: `Quota esgotada. Plano atual: ${quota?.plan ?? "?"}. Ative sua conta Pro pelo suporte.`,
          },
        ],
        isError: true,
      };
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    url.searchParams.set("query", query);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("language", "pt-BR");
    url.searchParams.set("region", "br");
    const res = await fetch(url.toString());
    if (!res.ok) {
      return {
        content: [{ type: "text", text: `Google Places falhou: HTTP ${res.status}` }],
        isError: true,
      };
    }
    const body = (await res.json()) as {
      status: string;
      results?: PlacesResult[];
      error_message?: string;
    };
    if (body.status !== "OK" && body.status !== "ZERO_RESULTS") {
      return {
        content: [
          {
            type: "text",
            text: `Google Places retornou ${body.status}: ${body.error_message ?? "sem detalhes"}`,
          },
        ],
        isError: true,
      };
    }
    const cap = Math.min(Math.max(1, max_results ?? 20), 20);
    const results = (body.results ?? []).slice(0, cap).map((p) => ({
      place_id: p.place_id,
      name: p.name,
      address: p.formatted_address ?? null,
      lat: p.geometry?.location?.lat ?? null,
      lng: p.geometry?.location?.lng ?? null,
      rating: p.rating ?? null,
      user_ratings_total: p.user_ratings_total ?? 0,
      types: p.types ?? [],
      business_status: p.business_status ?? null,
      price_level: p.price_level ?? null,
    }));
    return {
      content: [
        {
          type: "text",
          text: `Encontrados ${results.length} comércio(s) para "${query}". Quota restante: ${quota.remaining}.\n\n${JSON.stringify(results, null, 2)}`,
        },
      ],
      structuredContent: {
        count: results.length,
        remaining_quota: quota.remaining,
        plan: quota.plan,
        results,
      },
    };
  },
});

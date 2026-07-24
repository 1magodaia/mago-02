import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { countCitationsRemainingToday } from "./citations.server";

export interface CitationItem {
  source: string;
  title: string;
  url?: string;
  snippet?: string;
}

export interface CitationLookupResult {
  place_id: string;
  cached: boolean;
  cached_at: string;
  items: CitationItem[];
  summary: string;
  cost_cents: number;
  remaining_today: number;
  daily_limit: number;
}

const CACHE_DAYS = 7;
const MODEL = "google/gemini-3.6-flash";
// Custo estimado por chamada (fração de centavo arredondada p/ cima). Ajustar quando houver métricas reais.
const COST_PER_CALL_CENTS = 1;

const input = z.object({
  place_id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  force: z.boolean().optional(),
});

export const lookupCitations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => input.parse(raw))
  .handler(async ({ data, context }): Promise<CitationLookupResult> => {
    const { supabase, userId } = context;

    // 1) Kill switch + daily limit + pro gate
    const { data: settings } = await supabase
      .from("app_settings")
      .select("citations_enabled, citations_daily_limit")
      .eq("id", 1)
      .maybeSingle();

    const enabled = settings?.citations_enabled ?? false;
    const dailyLimit = settings?.citations_daily_limit ?? 20;

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();
    const isPro = profile?.plan === "pro";

    // Admin/master ignoram kill switch e cota (para poder testar antes de liberar geral)
    const { data: rolesRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = new Set((rolesRows ?? []).map((r) => r.role as string));
    const isPrivileged = roles.has("admin") || roles.has("master");

    if (!enabled && !isPrivileged) {
      throw new Error("Busca de citações ainda não foi liberada. Aguarde a ativação pelo administrador.");
    }
    if (!isPro && !isPrivileged) {
      throw new Error("Recurso disponível apenas para o plano Pro.");
    }

    // 2) Cache 7 dias por place_id
    const cacheCutoff = new Date(Date.now() - CACHE_DAYS * 86400_000).toISOString();
    if (!data.force) {
      const { data: cached } = await supabase
        .from("citation_lookups")
        .select("result, cached_at, cost_cents")
        .eq("place_id", data.place_id)
        .gte("cached_at", cacheCutoff)
        .order("cached_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached) {
        const r = cached.result as { items?: CitationItem[]; summary?: string };
        const remaining = await countCitationsRemainingToday(userId, dailyLimit);
        return {
          place_id: data.place_id,
          cached: true,
          cached_at: cached.cached_at as string,
          items: r.items ?? [],
          summary: r.summary ?? "",
          cost_cents: 0,
          remaining_today: remaining,
          daily_limit: dailyLimit,
        };
      }
    }

    // 3) Daily limit (só bloqueia não-privilegiados)
    const remainingBefore = await countCitationsRemainingToday(userId, dailyLimit);
    if (!isPrivileged && remainingBefore <= 0) {
      throw new Error(`Limite diário de ${dailyLimit} buscas de citações atingido. Tente novamente amanhã.`);
    }

    // 4) Chamada IA (Lovable AI Gateway)
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente.");

    const query = [data.name, data.address, data.city].filter(Boolean).join(" — ");
    const prompt = `Você é um assistente de pesquisa de citações locais (Local SEO).
Liste até 6 possíveis MENÇÕES/CITAÇÕES na web para o comércio abaixo, em diretórios,
redes sociais e portais brasileiros (ex: Facebook, Instagram, Foursquare, TripAdvisor,
iFood, ReclameAqui, Reclame Aqui, Yelp, GuiaMais, Apontador, Telelistas, Waze, Bing Places).
Retorne SOMENTE JSON válido no formato:
{
  "summary": "1-2 frases em português sobre a presença digital observada",
  "items": [
    {"source": "Nome do diretório", "title": "Título/nome como pode aparecer", "url": "URL provável (opcional)", "snippet": "descrição curta ou motivo"}
  ]
}

Comércio: ${query}`;

    const t0 = Date.now();
    let items: CitationItem[] = [];
    let summary = "";
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: "Retorne apenas JSON válido, sem markdown." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (resp.status === 429) throw new Error("Limite de requisições da IA. Tente novamente em instantes.");
      if (resp.status === 402) throw new Error("Créditos de IA esgotados. Contate o administrador.");
      if (!resp.ok) throw new Error(`IA respondeu ${resp.status}`);
      const j = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = j.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content) as { summary?: string; items?: CitationItem[] };
      items = Array.isArray(parsed.items) ? parsed.items.slice(0, 8) : [];
      summary = typeof parsed.summary === "string" ? parsed.summary : "";
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Falha ao consultar IA.");
    }
    const elapsedMs = Date.now() - t0;

    // 5) Persistir cache + custo (service role para bypass de RLS write)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("citation_lookups").insert({
      user_id: userId,
      place_id: data.place_id,
      lead_name: data.name,
      lead_address: data.address ?? null,
      query,
      result: { summary, items, elapsed_ms: elapsedMs } as unknown as never,
      cost_cents: COST_PER_CALL_CENTS,
      model: MODEL,
    });

    const remainingAfter = Math.max(0, remainingBefore - 1);
    return {
      place_id: data.place_id,
      cached: false,
      cached_at: new Date().toISOString(),
      items,
      summary,
      cost_cents: COST_PER_CALL_CENTS,
      remaining_today: remainingAfter,
      daily_limit: dailyLimit,
    };
  });

async function countCitationsRemainingToday(userId: string, limit: number): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count } = await supabaseAdmin
    .from("citation_lookups")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString());
  return Math.max(0, limit - (count ?? 0));
}

/* ---------- Master: métricas de custo ---------- */

export interface CitationCostStats {
  today_calls: number;
  today_cost_cents: number;
  last7_calls: number;
  last7_cost_cents: number;
  last30_calls: number;
  last30_cost_cents: number;
  distinct_users_30d: number;
}

export const getCitationCostStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CitationCostStats> => {
    const { data: rolesRows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = new Set((rolesRows ?? []).map((r) => r.role as string));
    if (!roles.has("admin") && !roles.has("master")) throw new Error("Forbidden");

    const now = Date.now();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const d7 = new Date(now - 7 * 86400_000).toISOString();
    const d30 = new Date(now - 30 * 86400_000).toISOString();

    const { data: rows } = await context.supabase
      .from("citation_lookups")
      .select("cost_cents, created_at, user_id")
      .gte("created_at", d30);

    const list = (rows ?? []) as Array<{ cost_cents: number; created_at: string; user_id: string }>;
    const inDay = list.filter((r) => r.created_at >= dayStart.toISOString());
    const in7 = list.filter((r) => r.created_at >= d7);

    return {
      today_calls: inDay.length,
      today_cost_cents: inDay.reduce((s, r) => s + (r.cost_cents ?? 0), 0),
      last7_calls: in7.length,
      last7_cost_cents: in7.reduce((s, r) => s + (r.cost_cents ?? 0), 0),
      last30_calls: list.length,
      last30_cost_cents: list.reduce((s, r) => s + (r.cost_cents ?? 0), 0),
      distinct_users_30d: new Set(list.map((r) => r.user_id)).size,
    };
  });

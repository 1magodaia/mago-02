import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const PROVIDERS = [
  "openai",
  "gemini",
  "groq",
  "lovable",
  "anthropic",
  "mistral",
  "deepseek",
  "xai",
  "openrouter",
  "perplexity",
  "cohere",
  "nvidia",
] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABEL: Record<Provider, string> = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  groq: "Groq",
  lovable: "Lovable AI",
  anthropic: "Anthropic (Claude)",
  mistral: "Mistral",
  deepseek: "DeepSeek",
  xai: "xAI (Grok)",
  openrouter: "OpenRouter",
  perplexity: "Perplexity",
  cohere: "Cohere",
  nvidia: "NVIDIA NIM",
};

export interface AiProviderKey {
  id: string;
  provider: Provider;
  label: string;
  secret_name: string;
  model: string | null;
  priority: number;
  status: "active" | "error" | "rate_limited" | "untested" | "disabled";
  last_error: string | null;
  last_tested_at: string | null;
  last_used_at: string | null;
  secret_present: boolean;
}

/**
 * Default chat model per provider (used when the user does not choose one)
 * plus a curated list of models we surface in the master panel picker.
 * The probe reuses this to hit `chat/completions` with the selected model
 * instead of the generic `list models` endpoint — giving real "esse modelo
 * responde?" feedback for NVIDIA (Nemotron/Llama-Nemotron), Groq, etc.
 */
export const PROVIDER_MODELS: Record<Provider, { default: string; options: string[] }> = {
  openai:     { default: "gpt-4o-mini",                       options: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1", "o4-mini"] },
  gemini:     { default: "gemini-2.5-flash",                  options: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"] },
  groq:       { default: "llama-3.3-70b-versatile",           options: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"] },
  lovable:    { default: "google/gemini-2.5-flash",           options: ["google/gemini-2.5-flash", "google/gemini-2.5-pro", "openai/gpt-4o-mini"] },
  anthropic:  { default: "claude-3-5-haiku-latest",           options: ["claude-3-5-haiku-latest", "claude-3-5-sonnet-latest", "claude-3-opus-latest"] },
  mistral:    { default: "mistral-small-latest",              options: ["mistral-small-latest", "mistral-large-latest", "open-mixtral-8x22b"] },
  deepseek:   { default: "deepseek-chat",                     options: ["deepseek-chat", "deepseek-reasoner"] },
  xai:        { default: "grok-2-latest",                     options: ["grok-2-latest", "grok-2-mini", "grok-beta"] },
  openrouter: { default: "openai/gpt-4o-mini",                options: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.5-flash", "meta-llama/llama-3.3-70b-instruct"] },
  perplexity: { default: "sonar",                             options: ["sonar", "sonar-pro", "sonar-reasoning"] },
  cohere:     { default: "command-r",                         options: ["command-r", "command-r-plus", "command-a-03-2025"] },
  nvidia:     { default: "nvidia/llama-3.1-nemotron-70b-instruct", options: [
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "nvidia/llama-3.3-nemotron-super-49b-v1",
    "nvidia/nemotron-4-340b-instruct",
    "meta/llama-3.3-70b-instruct",
    "meta/llama-3.1-8b-instruct",
    "mistralai/mixtral-8x22b-instruct-v0.1",
  ] },
};


export interface AiSelection {
  mode: "auto" | "manual";
  manual_key_id: string | null;
}

async function ensurePrivileged(context: { supabase: any; userId: string }) {
  const [{ data: isMaster }, { data: isAdmin }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "master" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
  ]);
  if (!isMaster && !isAdmin) throw new Error("Forbidden");
}

export const listAiProviderKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiProviderKey[]> => {
    await ensurePrivileged(context);
    const { data, error } = await context.supabase
      .from("ai_provider_keys")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      ...r,
      secret_present: !!process.env[r.secret_name],
    }));
  });

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  provider: z.enum(PROVIDERS),
  label: z.string().min(1).max(60),
  secret_name: z.string().regex(/^[A-Z_][A-Z0-9_]*$/, "Nome de secret inválido"),
  model: z.string().trim().max(120).optional().nullable(),
  priority: z.number().int().min(1).max(999),
  status: z.enum(["active", "error", "rate_limited", "untested", "disabled"]).optional(),
});

export const upsertAiProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await ensurePrivileged(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row: any = {
      provider: data.provider,
      label: data.label,
      secret_name: data.secret_name,
      model: data.model?.trim() || null,
      priority: data.priority,
      status: data.status ?? "untested",
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("ai_provider_keys").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("ai_provider_keys")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted!.id };
  });


export const deleteAiProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensurePrivileged(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_provider_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Provider-specific health-check. Uses the cheapest/lightest reachable endpoint
 * for each provider — usually the "list models" endpoint — so testing a key
 * never consumes generation credits.
 */
async function probeProvider(
  provider: Provider,
  key: string,
): Promise<{ status: "active" | "rate_limited" | "error"; message: string }> {
  try {
    let res: Response;
    switch (provider) {
      case "openai":
        res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        break;
      case "groq":
        res = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        break;
      case "mistral":
        res = await fetch("https://api.mistral.ai/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        break;
      case "deepseek":
        res = await fetch("https://api.deepseek.com/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        break;
      case "xai":
        res = await fetch("https://api.x.ai/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        break;
      case "openrouter":
        res = await fetch("https://openrouter.ai/api/v1/auth/key", {
          headers: { Authorization: `Bearer ${key}` },
        });
        break;
      case "perplexity":
        // Perplexity has no public models endpoint; do a minimal chat ping.
        res = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
        });
        break;
      case "nvidia":
        res = await fetch("https://integrate.api.nvidia.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        break;
      case "cohere":
        res = await fetch("https://api.cohere.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        break;
      case "anthropic":
        res = await fetch("https://api.anthropic.com/v1/models", {
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
        });
        break;
      case "gemini":
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        );
        break;
      case "lovable":
      default:
        res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          }),
        });
        break;
    }
    if (res.status === 429) return { status: "rate_limited", message: "Limite de requisições atingido (429)" };
    if (res.status === 401 || res.status === 403) return { status: "error", message: `Chave inválida (${res.status})` };
    if (res.status === 402) return { status: "error", message: "Créditos esgotados (402)" };
    if (!res.ok) {
      let extra = "";
      try {
        const txt = await res.text();
        extra = txt ? ` — ${txt.slice(0, 160)}` : "";
      } catch { /* ignore */ }
      return { status: "error", message: `HTTP ${res.status}${extra}` };
    }
    return { status: "active", message: "OK" };
  } catch (e: any) {
    return { status: "error", message: String(e?.message ?? e) };
  }
}

/**
 * Testa uma chave chamando o endpoint mais leve do provedor (list models quando existe).
 * Marca status = active | rate_limited | error com mensagem.
 */
export const testAiProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensurePrivileged(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Chave não encontrada");

    const key = process.env[row.secret_name];
    if (!key) {
      await supabaseAdmin
        .from("ai_provider_keys")
        .update({
          status: "error",
          last_error: `Secret '${row.secret_name}' não configurado`,
          last_tested_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      return { status: "error", message: `Secret '${row.secret_name}' vazio` };
    }

    const probe = await probeProvider(row.provider as Provider, key);
    await supabaseAdmin
      .from("ai_provider_keys")
      .update({
        status: probe.status,
        last_error: probe.status === "active" ? null : probe.message,
        last_tested_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    return probe;
  });

/**
 * Testa TODAS as chaves cadastradas em paralelo.
 */
export const testAllAiProviderKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensurePrivileged(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("ai_provider_keys").select("id, provider, secret_name");
    const list = (rows ?? []) as Array<{ id: string; provider: Provider; secret_name: string }>;
    await Promise.all(
      list.map(async (row) => {
        const key = process.env[row.secret_name];
        const probe = key
          ? await probeProvider(row.provider, key)
          : { status: "error" as const, message: `Secret '${row.secret_name}' vazio` };
        await supabaseAdmin
          .from("ai_provider_keys")
          .update({
            status: probe.status,
            last_error: probe.status === "active" ? null : probe.message,
            last_tested_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }),
    );
    return { tested: list.length };
  });

/* ---------- Seleção Auto vs Manual ---------- */

export const getAiSelection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiSelection> => {
    await ensurePrivileged(context);
    const { data } = await context.supabase
      .from("app_settings")
      .select("ai_selection_mode, ai_manual_key_id")
      .eq("id", 1)
      .maybeSingle();
    return {
      mode: (data as any)?.ai_selection_mode ?? "auto",
      manual_key_id: (data as any)?.ai_manual_key_id ?? null,
    };
  });

const SelectionSchema = z.object({
  mode: z.enum(["auto", "manual"]),
  manual_key_id: z.string().uuid().nullable().optional(),
});

export const setAiSelection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SelectionSchema.parse(d))
  .handler(async ({ data, context }): Promise<AiSelection> => {
    await ensurePrivileged(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = {
      ai_selection_mode: data.mode,
      ai_manual_key_id: data.mode === "manual" ? data.manual_key_id ?? null : null,
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };
    const { data: row, error } = await supabaseAdmin
      .from("app_settings")
      .update(patch)
      .eq("id", 1)
      .select("ai_selection_mode, ai_manual_key_id")
      .single();
    if (error) throw new Error(error.message);
    return {
      mode: (row as any).ai_selection_mode,
      manual_key_id: (row as any).ai_manual_key_id,
    };
  });

/**
 * Helper de failover: retorna a próxima chave utilizável.
 * - modo "manual": usa exclusivamente a chave escolhida (se ativa e com secret).
 * - modo "auto":   percorre por prioridade escolhendo a primeira active/untested com secret.
 */
export async function getNextAvailableAiKey(): Promise<{ id: string; provider: Provider; value: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin
    .from("app_settings")
    .select("ai_selection_mode, ai_manual_key_id")
    .eq("id", 1)
    .maybeSingle();
  const mode = (settings as any)?.ai_selection_mode ?? "auto";
  const manualId = (settings as any)?.ai_manual_key_id ?? null;

  if (mode === "manual" && manualId) {
    const { data: row } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("id, provider, secret_name, status")
      .eq("id", manualId)
      .maybeSingle();
    if (row && (row as any).status !== "disabled") {
      const value = process.env[(row as any).secret_name];
      if (value) return { id: (row as any).id, provider: (row as any).provider, value };
    }
    return null;
  }

  const { data } = await supabaseAdmin
    .from("ai_provider_keys")
    .select("id, provider, secret_name, status, priority")
    .in("status", ["active", "untested"])
    .order("priority", { ascending: true });
  for (const row of data ?? []) {
    const value = process.env[(row as any).secret_name];
    if (value) return { id: (row as any).id, provider: (row as any).provider, value };
  }
  return null;
}

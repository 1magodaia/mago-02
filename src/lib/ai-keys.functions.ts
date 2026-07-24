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
 * Extract a human-readable failure reason from a provider error body.
 * Providers vary wildly in shape — try the common ones (OpenAI-style
 * `{ error: { message } }`, NVIDIA/NIM `{ detail | title | message }`,
 * Anthropic `{ error: { message, type } }`, Cohere `{ message }`) and
 * fall back to a truncated raw string.
 */
function extractProviderMessage(bodyText: string): string {
  if (!bodyText) return "";
  const trimmed = bodyText.trim();
  try {
    const j = JSON.parse(trimmed);
    const candidates = [
      j?.error?.message,
      j?.error?.detail,
      j?.error,
      j?.detail?.[0]?.msg,
      j?.detail?.message,
      j?.detail,
      j?.title,
      j?.message,
      j?.error_description,
      j?.status,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c.trim().slice(0, 240);
    }
    return JSON.stringify(j).slice(0, 240);
  } catch {
    return trimmed.slice(0, 240);
  }
}

/**
 * Classify an HTTP status + body into a friendly PT-BR reason so the
 * master panel can show *why* a key failed (autenticação, modelo inválido,
 * cota, rede etc.) instead of a bare "HTTP 400".
 */
function classifyFailure(status: number, bodyText: string): { status: "error" | "rate_limited"; message: string } {
  const detail = extractProviderMessage(bodyText);
  const lower = (detail || "").toLowerCase();
  const suffix = detail ? ` — ${detail}` : "";

  if (status === 429 || /rate.?limit|too many requests|quota exceeded/i.test(lower)) {
    return { status: "rate_limited", message: `Limite de requisições atingido (429)${suffix}` };
  }
  if (status === 401 || status === 403 || /invalid api key|unauthor|forbidden|api key not valid|incorrect api key/.test(lower)) {
    return { status: "error", message: `Autenticação falhou — chave inválida, revogada ou sem permissão (${status})${suffix}` };
  }
  if (status === 402 || /insufficient|no credits|billing|payment required|balance/.test(lower)) {
    return { status: "error", message: `Créditos/saldo insuficiente na conta do provedor (${status})${suffix}` };
  }
  if (status === 404 || /model.*(not found|does not exist|not available|unknown)|no such model|invalid model/.test(lower)) {
    return { status: "error", message: `Modelo inválido ou indisponível para essa chave (${status}). Escolha outro modelo no seletor.${suffix}` };
  }
  if (status === 400 && /model|parameter|schema/.test(lower)) {
    return { status: "error", message: `Requisição rejeitada pelo provedor — provavelmente o modelo selecionado não é suportado (${status}).${suffix}` };
  }
  if (status === 400) return { status: "error", message: `Requisição inválida (400)${suffix}` };
  if (status === 408 || status === 504) return { status: "error", message: `Tempo esgotado — o provedor demorou para responder (${status})${suffix}` };
  if (status >= 500) return { status: "error", message: `Provedor com instabilidade (${status})${suffix}` };
  return { status: "error", message: `HTTP ${status}${suffix}` };
}

function classifyNetworkError(e: any): { status: "error"; message: string } {
  const raw = String(e?.message ?? e ?? "").trim();
  const l = raw.toLowerCase();
  if (e?.name === "AbortError" || /timeout|timed out/.test(l)) {
    return { status: "error", message: `Rede: tempo esgotado ao contatar o provedor — ${raw}` };
  }
  if (/enotfound|dns|getaddrinfo/.test(l)) {
    return { status: "error", message: `Rede: DNS não resolveu — ${raw}` };
  }
  if (/econnrefused|econnreset|socket|network|fetch failed/.test(l)) {
    return { status: "error", message: `Rede: conexão recusada/interrompida com o provedor — ${raw}` };
  }
  return { status: "error", message: `Rede: falha ao contatar o provedor — ${raw || "erro desconhecido"}` };
}

/**
 * Provider health-check with rich diagnostics. When a `model` is given,
 * we hit `chat/completions` with that exact model so the admin knows if
 * *that specific model* (e.g. NVIDIA Nemotron-70b, Llama-Nemotron) responds
 * for this key — not just whether the account is authenticated.
 * Without a model, we call the cheap `list models` endpoint of each provider.
 */
async function probeProvider(
  provider: Provider,
  key: string,
  model?: string | null,
): Promise<{ status: "active" | "rate_limited" | "error"; message: string }> {
  const chosenModel = model?.trim() || PROVIDER_MODELS[provider]?.default;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12000);

  const chatPing = async (url: string, headers: Record<string, string>, extraBody?: Record<string, unknown>) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        model: chosenModel,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        ...extraBody,
      }),
      signal: ac.signal,
    });

  try {
    let res: Response;
    switch (provider) {
      case "openai":
        res = chosenModel
          ? await chatPing("https://api.openai.com/v1/chat/completions", { Authorization: `Bearer ${key}` })
          : await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal: ac.signal });
        break;
      case "groq":
        res = chosenModel
          ? await chatPing("https://api.groq.com/openai/v1/chat/completions", { Authorization: `Bearer ${key}` })
          : await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal: ac.signal });
        break;
      case "mistral":
        res = chosenModel
          ? await chatPing("https://api.mistral.ai/v1/chat/completions", { Authorization: `Bearer ${key}` })
          : await fetch("https://api.mistral.ai/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal: ac.signal });
        break;
      case "deepseek":
        res = chosenModel
          ? await chatPing("https://api.deepseek.com/chat/completions", { Authorization: `Bearer ${key}` })
          : await fetch("https://api.deepseek.com/models", { headers: { Authorization: `Bearer ${key}` }, signal: ac.signal });
        break;
      case "xai":
        res = chosenModel
          ? await chatPing("https://api.x.ai/v1/chat/completions", { Authorization: `Bearer ${key}` })
          : await fetch("https://api.x.ai/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal: ac.signal });
        break;
      case "openrouter":
        res = chosenModel
          ? await chatPing("https://openrouter.ai/api/v1/chat/completions", { Authorization: `Bearer ${key}` })
          : await fetch("https://openrouter.ai/api/v1/auth/key", { headers: { Authorization: `Bearer ${key}` }, signal: ac.signal });
        break;
      case "perplexity":
        res = await chatPing("https://api.perplexity.ai/chat/completions", { Authorization: `Bearer ${key}` });
        break;
      case "nvidia":
        // NVIDIA NIM is OpenAI-compatible. Always ping chat/completions with the
        // chosen model so the error reflects the *model* — Nemotron/Llama-Nemotron
        // gates access per model and returns 404/400 with a helpful detail body.
        res = await chatPing("https://integrate.api.nvidia.com/v1/chat/completions", {
          Authorization: `Bearer ${key}`,
        }, { stream: false, temperature: 0 });
        break;
      case "cohere":
        res = chosenModel
          ? await fetch("https://api.cohere.com/v2/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
              body: JSON.stringify({ model: chosenModel, messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
              signal: ac.signal,
            })
          : await fetch("https://api.cohere.com/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal: ac.signal });
        break;
      case "anthropic":
        res = chosenModel
          ? await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: chosenModel, max_tokens: 1, messages: [{ role: "user", content: "ping" }] }),
              signal: ac.signal,
            })
          : await fetch("https://api.anthropic.com/v1/models", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01" }, signal: ac.signal });
        break;
      case "gemini":
        res = chosenModel
          ? await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(chosenModel)}:generateContent?key=${encodeURIComponent(key)}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }], generationConfig: { maxOutputTokens: 1 } }),
                signal: ac.signal,
              },
            )
          : await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, { signal: ac.signal });
        break;
      case "lovable":
      default:
        res = await chatPing("https://ai.gateway.lovable.dev/v1/chat/completions", { Authorization: `Bearer ${key}` });
        break;
    }

    clearTimeout(timer);
    if (res.ok) return { status: "active", message: chosenModel ? `OK — modelo "${chosenModel}" respondeu` : "OK" };

    let bodyText = "";
    try { bodyText = await res.text(); } catch { /* ignore */ }
    return classifyFailure(res.status, bodyText);
  } catch (e: any) {
    clearTimeout(timer);
    return classifyNetworkError(e);
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

    const probe = await probeProvider(row.provider as Provider, key, (row as any).model);
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

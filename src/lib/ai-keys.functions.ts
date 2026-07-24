import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PROVIDERS = ["openai", "gemini", "groq", "lovable"] as const;
type Provider = (typeof PROVIDERS)[number];

export interface AiProviderKey {
  id: string;
  provider: Provider;
  label: string;
  secret_name: string;
  priority: number;
  status: "active" | "error" | "rate_limited" | "untested" | "disabled";
  last_error: string | null;
  last_tested_at: string | null;
  last_used_at: string | null;
  secret_present: boolean;
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
 * Testa uma chave: verifica presença do secret e faz uma chamada mínima
 * pelo Lovable AI Gateway (que abstrai OpenAI/Gemini/Groq). Para o provedor
 * `lovable` (LOVABLE_API_KEY), testa uma completion trivial.
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

    // Teste real via gateway Lovable (unifica todos os provedores).
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: row.provider === "gemini" ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
      });
      let status: "active" | "rate_limited" | "error" = "active";
      let msg = "OK";
      if (res.status === 429) { status = "rate_limited"; msg = "Rate limit atingido"; }
      else if (res.status === 402) { status = "error"; msg = "Créditos esgotados (402)"; }
      else if (!res.ok) { status = "error"; msg = `HTTP ${res.status}`; }
      await supabaseAdmin
        .from("ai_provider_keys")
        .update({ status, last_error: status === "active" ? null : msg, last_tested_at: new Date().toISOString() })
        .eq("id", data.id);
      return { status, message: msg };
    } catch (e: any) {
      await supabaseAdmin
        .from("ai_provider_keys")
        .update({ status: "error", last_error: String(e?.message ?? e), last_tested_at: new Date().toISOString() })
        .eq("id", data.id);
      return { status: "error", message: String(e?.message ?? e) };
    }
  });

/**
 * Helper de failover: retorna a próxima chave utilizável em ordem de prioridade.
 * Consumidores (ex: lookupCitations) devem tentar em sequência e reportar erros
 * via `reportAiKeyError` para promover a próxima chave. Só executa no servidor.
 */
export async function getNextAvailableAiKey(): Promise<{ id: string; provider: Provider; value: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AppSettings {
  support_whatsapp: string | null;
  support_message: string | null;
  citations_enabled: boolean;
  citations_daily_limit: number;
  hero_image_url: string | null;
  updated_at: string | null;
}



/** Public read — used by the floating support widget on every page. */
export const getAppSettings = createServerFn({ method: "GET" }).handler(async (): Promise<AppSettings> => {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await supabase
    .from("app_settings")
    .select("support_whatsapp, support_message, citations_enabled, citations_daily_limit, hero_image_url, updated_at")
    .eq("id", 1)
    .maybeSingle();
  return {
    support_whatsapp: data?.support_whatsapp ?? null,
    support_message: data?.support_message ?? null,
    citations_enabled: data?.citations_enabled ?? false,
    citations_daily_limit: data?.citations_daily_limit ?? 20,
    hero_image_url: (data as { hero_image_url?: string | null } | null)?.hero_image_url ?? null,
    updated_at: (data as { updated_at?: string | null } | null)?.updated_at ?? null,
  };

});

const inputSchema = z.object({
  support_whatsapp: z
    .string()
    .trim()
    .max(20)
    .transform((s) => s.replace(/[^\d+]/g, ""))
    .refine((s) => s === "" || /^\+?\d{10,15}$/.test(s), {
      message: "Número inválido. Use DDI+DDD+número (ex: 5511999998888).",
    })
    .nullable()
    .optional(),
  support_message: z.string().trim().max(280).nullable().optional(),
  citations_enabled: z.boolean().optional(),
  citations_daily_limit: z.number().int().min(0).max(1000).optional(),
  hero_image_url: z
    .string()
    .trim()
    .max(2048)
    .refine((s) => s === "" || /^https?:\/\/|^\/__l5e\//.test(s), {
      message: "Use uma URL http(s) válida.",
    })
    .nullable()
    .optional(),
});


export const updateAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => inputSchema.parse(raw))
  .handler(async ({ data, context }): Promise<AppSettings> => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const set = new Set((roles ?? []).map((r) => r.role as string));
    if (!set.has("admin") && !set.has("master")) throw new Error("Forbidden");

    const { data: prev } = await context.supabase
      .from("app_settings")
      .select("support_whatsapp, support_message")
      .eq("id", 1)
      .maybeSingle();

    const patch = {
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
      ...(data.support_whatsapp !== undefined ? { support_whatsapp: data.support_whatsapp || null } : {}),
      ...(data.support_message !== undefined ? { support_message: data.support_message || null } : {}),
      ...(data.citations_enabled !== undefined ? { citations_enabled: data.citations_enabled } : {}),
      ...(data.citations_daily_limit !== undefined ? { citations_daily_limit: data.citations_daily_limit } : {}),
      ...(data.hero_image_url !== undefined ? { hero_image_url: data.hero_image_url || null } : {}),
    };

    const { data: row, error } = await context.supabase
      .from("app_settings")
      .update(patch)
      .eq("id", 1)
      .select("support_whatsapp, support_message, citations_enabled, citations_daily_limit, hero_image_url, updated_at")
      .single();
    if (error) throw new Error(error.message);

    const newWa = row?.support_whatsapp ?? null;
    const newMsg = row?.support_message ?? null;
    const oldWa = prev?.support_whatsapp ?? null;
    const oldMsg = prev?.support_message ?? null;
    const waChanged = data.support_whatsapp !== undefined && newWa !== oldWa;
    const msgChanged = data.support_message !== undefined && newMsg !== oldMsg;
    if (waChanged || msgChanged) {
      const email = (context.claims as { email?: string } | null)?.email ?? null;
      await context.supabase.from("whatsapp_change_log").insert({
        changed_by: context.userId,
        changed_by_email: email,
        old_whatsapp: oldWa,
        new_whatsapp: newWa,
        old_message: oldMsg,
        new_message: newMsg,
      });
    }

    return {
      support_whatsapp: row?.support_whatsapp ?? null,
      support_message: row?.support_message ?? null,
      citations_enabled: row?.citations_enabled ?? false,
      citations_daily_limit: row?.citations_daily_limit ?? 20,
      hero_image_url: (row as { hero_image_url?: string | null } | null)?.hero_image_url ?? null,
      updated_at: (row as { updated_at?: string | null } | null)?.updated_at ?? null,
    };

  });

export interface WhatsappChangeLogEntry {
  id: string;
  changed_by_email: string | null;
  old_whatsapp: string | null;
  new_whatsapp: string | null;
  old_message: string | null;
  new_message: string | null;
  created_at: string;
}

export const listWhatsappChangeLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WhatsappChangeLogEntry[]> => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const set = new Set((roles ?? []).map((r) => r.role as string));
    if (!set.has("admin") && !set.has("master")) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("whatsapp_change_log")
      .select("id, changed_by_email, old_whatsapp, new_whatsapp, old_message, new_message, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as WhatsappChangeLogEntry[];
  });



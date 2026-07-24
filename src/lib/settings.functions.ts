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
    .select("support_whatsapp, support_message, citations_enabled, citations_daily_limit, hero_image_url")
    .eq("id", 1)
    .maybeSingle();
  return {
    support_whatsapp: data?.support_whatsapp ?? null,
    support_message: data?.support_message ?? null,
    citations_enabled: data?.citations_enabled ?? false,
    citations_daily_limit: data?.citations_daily_limit ?? 20,
    hero_image_url: (data as { hero_image_url?: string | null } | null)?.hero_image_url ?? null,
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
      .select("support_whatsapp, support_message, citations_enabled, citations_daily_limit, hero_image_url")
      .single();
    if (error) throw new Error(error.message);
    return {
      support_whatsapp: row?.support_whatsapp ?? null,
      support_message: row?.support_message ?? null,
      citations_enabled: row?.citations_enabled ?? false,
      citations_daily_limit: row?.citations_daily_limit ?? 20,
      hero_image_url: (row as { hero_image_url?: string | null } | null)?.hero_image_url ?? null,
    };
  });


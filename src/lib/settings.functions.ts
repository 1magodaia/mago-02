import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AppSettings {
  support_whatsapp: string | null;
  support_message: string | null;
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
    .select("support_whatsapp, support_message")
    .eq("id", 1)
    .maybeSingle();
  return {
    support_whatsapp: data?.support_whatsapp ?? null,
    support_message: data?.support_message ?? null,
  };
});

/** Admin/master write. Digits-only phone (10-15 chars) — allows optional leading +. */
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
});

export const updateAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => inputSchema.parse(raw))
  .handler(async ({ data, context }): Promise<AppSettings> => {
    // Authorization: must be admin or master
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const set = new Set((roles ?? []).map((r) => r.role as string));
    if (!set.has("admin") && !set.has("master")) throw new Error("Forbidden");

    const patch = {
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
      ...(data.support_whatsapp !== undefined ? { support_whatsapp: data.support_whatsapp || null } : {}),
      ...(data.support_message !== undefined ? { support_message: data.support_message || null } : {}),
    };


    const { data: row, error } = await context.supabase
      .from("app_settings")
      .update(patch)
      .eq("id", 1)
      .select("support_whatsapp, support_message")
      .single();
    if (error) throw new Error(error.message);
    return {
      support_whatsapp: row?.support_whatsapp ?? null,
      support_message: row?.support_message ?? null,
    };
  });

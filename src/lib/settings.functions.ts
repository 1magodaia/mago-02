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
  hero_height_desktop: number;
  hero_height_mobile: number;
  hero_fit: "cover" | "contain";
  unlock_link: string | null;
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
    .from("public_app_settings")
    .select("support_whatsapp, support_message, citations_enabled, citations_daily_limit, hero_image_url, hero_height_desktop, hero_height_mobile, hero_fit, unlock_link, updated_at")
    .eq("id", 1)
    .maybeSingle();
  const d = data as (Partial<AppSettings> & { hero_height_desktop?: number; hero_height_mobile?: number; hero_fit?: string; unlock_link?: string }) | null;
  return {
    support_whatsapp: d?.support_whatsapp ?? null,
    support_message: d?.support_message ?? null,
    citations_enabled: d?.citations_enabled ?? false,
    citations_daily_limit: d?.citations_daily_limit ?? 20,
    hero_image_url: d?.hero_image_url ?? null,
    hero_height_desktop: d?.hero_height_desktop ?? 320,
    hero_height_mobile: d?.hero_height_mobile ?? 200,
    hero_fit: (d?.hero_fit === "contain" ? "contain" : "cover"),
    unlock_link: d?.unlock_link ?? null,
    updated_at: d?.updated_at ?? null,
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
  hero_height_desktop: z.number().int().min(120).max(720).optional(),
  hero_height_mobile: z.number().int().min(100).max(480).optional(),
  hero_fit: z.enum(["cover", "contain"]).optional(),
  reason: z.string().trim().max(500).nullable().optional(),
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
      ...(data.hero_height_desktop !== undefined ? { hero_height_desktop: data.hero_height_desktop } : {}),
      ...(data.hero_height_mobile !== undefined ? { hero_height_mobile: data.hero_height_mobile } : {}),
      ...(data.hero_fit !== undefined ? { hero_fit: data.hero_fit } : {}),
    };

    const { data: row, error } = await context.supabase
      .from("app_settings")
      .update(patch)
      .eq("id", 1)
      .select("support_whatsapp, support_message, citations_enabled, citations_daily_limit, hero_image_url, hero_height_desktop, hero_height_mobile, hero_fit, updated_at")
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
        reason: data.reason ? data.reason : null,
      });
    }

    const r = row as (Partial<AppSettings> & { hero_height_desktop?: number; hero_height_mobile?: number; hero_fit?: string }) | null;
    return {
      support_whatsapp: r?.support_whatsapp ?? null,
      support_message: r?.support_message ?? null,
      citations_enabled: r?.citations_enabled ?? false,
      citations_daily_limit: r?.citations_daily_limit ?? 20,
      hero_image_url: r?.hero_image_url ?? null,
      hero_height_desktop: r?.hero_height_desktop ?? 320,
      hero_height_mobile: r?.hero_height_mobile ?? 200,
      hero_fit: (r?.hero_fit === "contain" ? "contain" : "cover"),
      updated_at: r?.updated_at ?? null,
    };


  });

export interface WhatsappChangeLogEntry {
  id: string;
  changed_by_email: string | null;
  old_whatsapp: string | null;
  new_whatsapp: string | null;
  old_message: string | null;
  new_message: string | null;
  reason: string | null;
  created_at: string;
}

const logQuerySchema = z.object({
  author: z.string().trim().max(320).optional().default(""),
  from: z.string().trim().max(40).optional().default(""),
  to: z.string().trim().max(40).optional().default(""),
  page: z.number().int().min(1).max(10000).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(10),
});

export interface WhatsappChangeLogPage {
  entries: WhatsappChangeLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(supabase: any, userId: string) {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const set = new Set(((roles ?? []) as { role: string }[]).map((r) => r.role));
  if (!set.has("admin") && !set.has("master")) throw new Error("Forbidden");
}



export const listWhatsappChangeLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => logQuerySchema.parse(raw ?? {}))
  .handler(async ({ data, context }): Promise<WhatsappChangeLogPage> => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("whatsapp_change_log")
      .select("id, changed_by_email, old_whatsapp, new_whatsapp, old_message, new_message, reason, created_at", { count: "exact" })
      .order("created_at", { ascending: false });
    if (data.author) q = q.ilike("changed_by_email", `%${data.author}%`);
    if (data.from) q = q.gte("created_at", new Date(data.from).toISOString());
    if (data.to) {
      const d = new Date(data.to);
      d.setHours(23, 59, 59, 999);
      q = q.lte("created_at", d.toISOString());
    }
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, error, count } = await q.range(from, to);
    if (error) throw new Error(error.message);
    return {
      entries: (rows ?? []) as WhatsappChangeLogEntry[],
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

export const exportWhatsappChangeLogCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => logQuerySchema.omit({ page: true, pageSize: true }).parse(raw ?? {}))
  .handler(async ({ data, context }): Promise<{ csv: string }> => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("whatsapp_change_log")
      .select("changed_by_email, old_whatsapp, new_whatsapp, old_message, new_message, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (data.author) q = q.ilike("changed_by_email", `%${data.author}%`);
    if (data.from) q = q.gte("created_at", new Date(data.from).toISOString());
    if (data.to) {
      const d = new Date(data.to);
      d.setHours(23, 59, 59, 999);
      q = q.lte("created_at", d.toISOString());
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const esc = (v: string | null | undefined) => {
      const s = v == null ? "" : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["Data", "Autor", "WhatsApp anterior", "WhatsApp novo", "Mensagem anterior", "Mensagem nova", "Motivo"];
    const lines = [header.join(",")];
    for (const r of rows ?? []) {
      lines.push([
        esc(new Date(r.created_at).toLocaleString("pt-BR")),
        esc(r.changed_by_email),
        esc(r.old_whatsapp),
        esc(r.new_whatsapp),
        esc(r.old_message),
        esc(r.new_message),
        esc(r.reason),
      ].join(","));
    }
    return { csv: lines.join("\n") };
  });




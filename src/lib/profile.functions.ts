import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FREE_MONTHLY_SEARCH_LIMIT = 20;

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  plan: "free" | "pro";
  status: "active" | "blocked";
  search_count_month: number;
  month_reset_at: string;
  last_login_at: string | null;
  created_at: string;
  pro_access_mode: "none" | "date" | "searches";
  pro_valid_until: string | null;
  pro_searches_remaining: number | null;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ profile: Profile | null; roles: string[]; freeLimit: number }> => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", userId).then(() => {});
    return {
      profile: (profile as Profile | null) ?? null,
      roles: (roles ?? []).map((r) => r.role as string),
      freeLimit: FREE_MONTHLY_SEARCH_LIMIT,
    };
  });

/**
 * Grants 'master' role to the authenticated user IF their email matches the MASTER_EMAIL
 * environment secret. Safe to call repeatedly (idempotent via UNIQUE constraint).
 */
export const bootstrapMaster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ granted: boolean }> => {
    const masterEmail = process.env.MASTER_EMAIL?.trim().toLowerCase();
    if (!masterEmail) return { granted: false };
    const email = (context.claims.email as string | undefined)?.toLowerCase();
    if (!email || email !== masterEmail) return { granted: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "master" }, { onConflict: "user_id,role" });
    return { granted: true };
  });

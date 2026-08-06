import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertMasterOrAdmin(supabase: any, userId: string): Promise<"master" | "admin"> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (roles.includes("master")) return "master";
  if (roles.includes("admin")) return "admin";
  
  // Backup check using RPC or direct email for absolute safety
  const { data: isMaster } = await supabase.rpc("is_master", { _user_id: userId });
  if (isMaster) return "master";

  throw new Error("Forbidden: master/admin only");
}

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  plan: "free" | "pro";
  status: "active" | "blocked";
  search_count_month: number;
  last_login_at: string | null;
  created_at: string;
  roles: string[];
  pro_access_mode: "none" | "date" | "searches";
  pro_valid_until: string | null;
  pro_searches_remaining: number | null;
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ users: AdminUserRow[] }> => {
    await assertMasterOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const { data: roleRows } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const rolesByUser = new Map<string, string[]>();
    (roleRows ?? []).forEach((r) => {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role as string);
      rolesByUser.set(r.user_id, list);
    });
    return {
      users: (profiles ?? []).map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        plan: p.plan,
        status: p.status,
        search_count_month: p.search_count_month,
        last_login_at: p.last_login_at,
        created_at: p.created_at,
        roles: rolesByUser.get(p.id) ?? [],
        pro_access_mode: p.pro_access_mode ?? "none",
        pro_valid_until: p.pro_valid_until,
        pro_searches_remaining: p.pro_searches_remaining,
      })),
    };
  });

const grantSchema = z.object({
  userId: z.string().uuid(),
  mode: z.enum(["free", "date", "searches"]),
  valid_until: z.string().datetime().optional(), // ISO
  searches_granted: z.number().int().min(1).max(100000).optional(),
  reason: z.string().max(300).optional(),
});

/**
 * v5.5 — Master concede acesso Pro por data OU por buscas, ou revoga para Free.
 * mode='date' exige valid_until; mode='searches' exige searches_granted.
 * Auto-downgrade acontece dentro de consume_search_quota.
 */
export const grantProAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => grantSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertMasterOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let patch: Record<string, any>;
    if (data.mode === "free") {
      patch = { plan: "free", pro_access_mode: "none", pro_valid_until: null, pro_searches_remaining: null };
    } else if (data.mode === "date") {
      if (!data.valid_until) throw new Error("valid_until obrigatório no modo 'date'");
      patch = { plan: "pro", pro_access_mode: "date", pro_valid_until: data.valid_until, pro_searches_remaining: null };
    } else {
      if (!data.searches_granted) throw new Error("searches_granted obrigatório no modo 'searches'");
      patch = { plan: "pro", pro_access_mode: "searches", pro_valid_until: null, pro_searches_remaining: data.searches_granted };
    }

    const { error } = await supabaseAdmin.from("profiles").update(patch as any).eq("id", data.userId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("plan_history").insert({
      user_id: data.userId,
      plan: patch.plan,
      changed_by: context.userId,
      reason: data.reason ?? null,
      access_mode: patch.pro_access_mode,
      valid_until: patch.pro_valid_until,
      searches_granted: data.searches_granted ?? null,
    });
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "grant_pro_access",
      target_user_id: data.userId,
      details: {
        mode: data.mode,
        valid_until: patch.pro_valid_until,
        searches_granted: data.searches_granted ?? null,
        reason: data.reason ?? null,
      },
    });
    return { ok: true };
  });

// Kept for backward-compat (unused UI now uses grantProAccess).
const setPlanSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["free", "pro"]),
  reason: z.string().max(300).optional(),
});
export const setUserPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => setPlanSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertMasterOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, any> = data.plan === "free"
      ? { plan: "free", pro_access_mode: "none", pro_valid_until: null, pro_searches_remaining: null }
      : { plan: "pro" };
    const { error } = await supabaseAdmin.from("profiles").update(patch as any).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("plan_history").insert({
      user_id: data.userId,
      plan: data.plan,
      changed_by: context.userId,
      reason: data.reason ?? null,
      access_mode: data.plan === "free" ? "none" : null,
    });
    return { ok: true };
  });

const setStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "blocked"]),
});

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => setStatusSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertMasterOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "set_status",
      target_user_id: data.userId,
      details: { status: data.status },
    });
    return { ok: true };
  });

const emailSchema = z.object({ email: z.string().email() });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => emailSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertMasterOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "password_reset_sent",
      details: { email: data.email },
    });
    return { ok: true };
  });

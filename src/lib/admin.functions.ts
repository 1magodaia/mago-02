import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertMasterOrAdmin(supabase: any, userId: string): Promise<"master" | "admin"> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (roles.includes("master")) return "master";
  if (roles.includes("admin")) return "admin";
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
      users: (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        plan: p.plan,
        status: p.status,
        search_count_month: p.search_count_month,
        last_login_at: p.last_login_at,
        created_at: p.created_at,
        roles: rolesByUser.get(p.id) ?? [],
      })),
    };
  });

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
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ plan: data.plan })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("plan_history").insert({
      user_id: data.userId,
      plan: data.plan,
      changed_by: context.userId,
      reason: data.reason ?? null,
    });
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "set_plan",
      target_user_id: data.userId,
      details: { plan: data.plan, reason: data.reason ?? null },
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

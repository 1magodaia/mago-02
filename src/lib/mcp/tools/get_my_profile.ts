import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description:
    "Retorna o perfil do usuário autenticado: nome, e-mail, plano (free/pro), " +
    "quota de buscas usadas/restantes e status da conta.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = userClient(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, plan, status, search_count_month, pro_access_mode, pro_valid_until, pro_searches_remaining, created_at",
      )
      .eq("id", ctx.getUserId())
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: `Erro: ${error.message}` }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: "Perfil não encontrado." }], isError: true };
    }
    const FREE_LIMIT = 1;
    const freeRemaining =
      data.plan === "free" ? Math.max(0, FREE_LIMIT - (data.search_count_month ?? 0)) : null;
    const summary = {
      email: data.email,
      full_name: data.full_name,
      plan: data.plan,
      status: data.status,
      searches_used_lifetime: data.search_count_month,
      free_searches_remaining: freeRemaining,
      pro_access_mode: data.pro_access_mode,
      pro_valid_until: data.pro_valid_until,
      pro_searches_remaining: data.pro_searches_remaining,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: { profile: summary },
    };
  },
});

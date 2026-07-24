import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_leads",
  title: "List my saved leads",
  description:
    "Lista os leads (comércios) que o usuário autenticado salvou no Busca Mágica. " +
    "Retorna nome, endereço, telefone, WhatsApp, site, Instagram, score e status.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .positive()
      .describe("Máximo de leads a retornar (default 50, teto sensato 200).")
      .default(50),
    only_status: z
      .string()
      .describe(
        "Filtra por status do lead (ex: 'novo', 'contatado', 'convertido'). Omita para todos.",
      )
      .optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, only_status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const cappedLimit = Math.min(Math.max(1, limit ?? 50), 200);
    const supabase = userClient(ctx);
    let q = supabase
      .from("leads")
      .select(
        "id, name, category, city, address, phone, whatsapp, email, website, instagram_handle, has_website, has_whatsapp, score_lead, status, latitude, longitude, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(cappedLimit);
    if (only_status) q = q.eq("status", only_status);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Erro: ${error.message}` }], isError: true };
    }
    return {
      content: [
        {
          type: "text",
          text:
            data && data.length
              ? `Encontrados ${data.length} lead(s):\n\n${JSON.stringify(data, null, 2)}`
              : "Nenhum lead salvo ainda.",
        },
      ],
      structuredContent: { count: data?.length ?? 0, leads: data ?? [] },
    };
  },
});

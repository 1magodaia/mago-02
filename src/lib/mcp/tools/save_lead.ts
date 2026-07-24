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
  name: "save_lead",
  title: "Save a lead",
  description:
    "Salva um comércio na lista pessoal de leads do usuário. " +
    "Use após uma busca (search_places) quando o assistente identificar um comércio que valha a pena prospectar.",
  inputSchema: {
    name: z.string().describe("Nome do comércio."),
    category: z.string().describe("Categoria (ex: 'padaria', 'pet shop').").optional(),
    city: z.string().describe("Cidade.").optional(),
    address: z.string().describe("Endereço completo.").optional(),
    phone: z.string().describe("Telefone.").optional(),
    whatsapp: z.string().describe("Link do WhatsApp (https://wa.me/...).").optional(),
    email: z.string().describe("E-mail de contato.").optional(),
    website: z.string().describe("Site do comércio.").optional(),
    instagram_handle: z.string().describe("Handle do Instagram (sem @).").optional(),
    latitude: z.number().describe("Latitude.").optional(),
    longitude: z.number().describe("Longitude.").optional(),
    score_lead: z
      .number()
      .int()
      .describe("Score de oportunidade 1-10 (opcional).")
      .optional(),
    status: z
      .string()
      .describe("Status inicial (ex: 'novo', 'contatado'). Default 'novo'.")
      .optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = userClient(ctx);
    const row = {
      user_id: ctx.getUserId(),
      name: input.name,
      category: input.category ?? null,
      city: input.city ?? null,
      address: input.address ?? null,
      phone: input.phone ?? null,
      whatsapp: input.whatsapp ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      instagram_handle: input.instagram_handle ?? null,
      has_website: !!input.website,
      has_whatsapp: !!input.whatsapp,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      score_lead: input.score_lead ?? null,
      status: input.status ?? "novo",
    };
    const { data, error } = await supabase.from("leads").insert(row).select().single();
    if (error) {
      return { content: [{ type: "text", text: `Erro ao salvar: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Lead salvo com id ${data.id}.` }],
      structuredContent: { lead: data },
    };
  },
});

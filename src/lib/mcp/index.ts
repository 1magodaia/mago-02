import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfileTool from "./tools/get_my_profile";
import listMyLeadsTool from "./tools/list_my_leads";
import saveLeadTool from "./tools/save_lead";
import searchPlacesTool from "./tools/search_places";

// OAuth issuer MUST be the direct Supabase host (not the .lovable.cloud proxy).
// Vite inlines VITE_SUPABASE_PROJECT_ID as a literal at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "busca-magica-mcp",
  title: "Busca Mágica",
  version: "1.0.0",
  instructions:
    "Ferramentas do Busca Mágica — prospecção de comércios locais. " +
    "Cada cliente MCP se conecta como um usuário real do app; " +
    "todas as leituras respeitam o plano (Free/Pro) e o RLS do usuário autenticado. " +
    "Use search_places para buscar comércios por categoria e região (consome quota), " +
    "list_my_leads para listar leads salvos, save_lead para salvar um novo lead, " +
    "e get_my_profile para consultar plano e buscas restantes.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfileTool, listMyLeadsTool, saveLeadTool, searchPlacesTool],
});

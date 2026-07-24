import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function countCitationsRemainingToday(userId: string, limit: number): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count } = await supabaseAdmin
    .from("citation_lookups")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString());
  return Math.max(0, limit - (count ?? 0));
}

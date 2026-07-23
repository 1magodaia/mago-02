import type { AnalyzedLead, BusinessData } from "./analyze-lead";

export interface AuditResult {
  site_status: "online" | "offline" | "slow" | "none";
  last_ig_post_days: number | null;
  whatsapp_active: boolean;
  audited_at: string;
}

// TODO: quando o webhook real estiver pronto, trocar a URL abaixo.
const WEBHOOK_URL = "https://hook.make.com/xyz-buscamagica-audit";

/**
 * Dispara auditoria real-time. Se o webhook não responder (MVP),
 * cai em uma simulação determinística baseada nos dados do lead.
 */
export async function runAudit(lead: BusinessData): Promise<AuditResult> {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: lead.name,
        website: lead.website,
        instagram: lead.instagram_handle,
        phone: lead.phone,
      }),
      signal: AbortSignal.timeout(1200),
    });
    if (res.ok) {
      const data = (await res.json()) as Partial<AuditResult>;
      return {
        site_status: data.site_status ?? (lead.has_website ? "online" : "none"),
        last_ig_post_days:
          data.last_ig_post_days ?? lead.instagram_last_post_days ?? null,
        whatsapp_active: data.whatsapp_active ?? Boolean(lead.has_whatsapp),
        audited_at: new Date().toISOString(),
      };
    }
  } catch {
    // fallback: simulação
  }

  // Simulação com pequena latência para exibir o skeleton
  await new Promise((r) => setTimeout(r, 1400));
  return {
    site_status: lead.has_website ? "online" : "none",
    last_ig_post_days: lead.instagram_last_post_days ?? null,
    whatsapp_active: Boolean(lead.has_whatsapp),
    audited_at: new Date().toISOString(),
  };
}

export function generateScript(lead: AnalyzedLead): string {
  const first = lead.name.split(" ").slice(0, 3).join(" ");
  const lines: string[] = [`Olá! Passando aqui rapidamente sobre a ${first}.`];

  if (!lead.has_website) {
    lines.push(
      "Reparei que vocês ainda não têm um site próprio — hoje isso é o primeiro filtro do cliente no Google.",
    );
  }
  const igDays = lead.instagram_last_post_days ?? null;
  if (lead.instagram_handle && igDays !== null && igDays > 90) {
    lines.push(
      `Vi também que o Instagram ${lead.instagram_handle} está parado há ${igDays} dias — dá pra reativar em 7 dias com um plano simples.`,
    );
  } else if (!lead.instagram_handle) {
    lines.push(
      "Não achei um Instagram ativo — vocês estão perdendo a vitrine que o público local mais usa hoje.",
    );
  }
  if (!lead.has_whatsapp) {
    lines.push(
      "E sem WhatsApp Business fica muito difícil converter quem clica no anúncio em conversa.",
    );
  }

  lines.push(
    "Trabalho exatamente com isso: monto site + Instagram + WhatsApp num pacote enxuto. Posso te mandar um exemplo real?",
  );
  return lines.join("\n\n");
}

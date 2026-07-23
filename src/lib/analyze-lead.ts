export type LeadStatus = "red" | "yellow" | "green";

export interface BusinessData {
  name: string;
  category?: string;
  city?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string | null;
  instagram_handle?: string | null;
  instagram_last_post_days?: number | null;
  has_website?: boolean;
  has_whatsapp?: boolean;
  latitude?: number;
  longitude?: number;
}

export type AuditStatus = "idle" | "loading" | "done";


export interface AnalyzedLead extends BusinessData {
  score_lead: number;
  status: LeadStatus;
  signals: string[];
}

/**
 * analyzeLead — calcula o Score de Oportunidade e o status digital.
 * Score parte de 100. Quanto MENOR o score, mais quente é o lead.
 * Regras (CACA v1.0.0):
 *  -30 se não tiver site
 *  -20 se Instagram > 90 dias sem postar
 *  -15 se não tiver WhatsApp
 *  -10 se não tiver Instagram cadastrado
 */
export function analyzeLead(data: BusinessData): AnalyzedLead {
  let score = 100;
  const signals: string[] = [];

  const hasWebsite = data.has_website ?? Boolean(data.website);
  const hasWhats = data.has_whatsapp ?? Boolean(data.whatsapp);
  const igDays = data.instagram_last_post_days ?? null;
  const hasIg = Boolean(data.instagram_handle);

  if (!hasWebsite) {
    score -= 30;
    signals.push("Sem site");
  }
  if (hasIg && igDays !== null && igDays > 90) {
    score -= 20;
    signals.push(`Instagram parado há ${igDays}d`);
  }
  if (!hasWhats) {
    score -= 15;
    signals.push("Sem WhatsApp");
  }
  if (!hasIg) {
    score -= 10;
    signals.push("Sem Instagram");
  }

  score = Math.max(0, Math.min(100, score));

  // Score baixo = lead quente (crítico = oportunidade)
  const status: LeadStatus = score <= 50 ? "red" : score <= 75 ? "yellow" : "green";

  return { ...data, score_lead: score, status, signals };
}

import type { PlaceResult } from "./places.functions";
import type { DigitalAudit } from "./audit.functions";

export type LeadStatus = "hot" | "warm" | "cold";
export type OpportunityTier = "high" | "medium" | "low";

export interface ScoredLead extends PlaceResult {
  audit?: DigitalAudit;
  opportunity_score: number; // 0-100, maior = mais quente
  status: LeadStatus;
  tier: OpportunityTier;
  tier_suggestion: string;
  reasons: string[];
}

/**
 * Score de oportunidade. Mais alto = mais quente.
 * Base 20. Sem site: +40. Poucas avaliações (<10): +15. Sem rating: +10.
 * Se audit rodou: sem IG/FB detectado: +10. Sitemap parado >180d: +10.
 */
export function scoreLead(place: PlaceResult, audit?: DigitalAudit): ScoredLead {
  let score = 20;
  const reasons: string[] = [];

  if (!place.website) {
    score += 40;
    reasons.push("Sem site cadastrado no Google");
  }
  const reviews = place.user_ratings_total ?? 0;
  if (reviews < 10) {
    score += 15;
    reasons.push(`Poucas avaliações (${reviews})`);
  }
  if (place.rating == null) {
    score += 10;
    reasons.push("Sem nota no Google");
  }

  // Sinal mais confiável de atividade: data da última review pública.
  if (place.latest_review_at) {
    const days = Math.floor((Date.now() - Date.parse(place.latest_review_at)) / 86400000);
    if (Number.isFinite(days) && days > 180) {
      score += 15;
      reasons.push(`Sem avaliações novas há ~${days}d`);
    }
  }


  if (audit) {
    if (place.website && !audit.site_reachable) {
      score += 20;
      reasons.push("Site fora do ar");
    }
    if (audit.site_reachable && !audit.instagram && !audit.facebook) {
      score += 10;
      reasons.push("Nenhuma rede social no site");
    }
    if (audit.approx_stale_days != null && audit.approx_stale_days > 180) {
      score += 10;
      reasons.push(`Site sem atualização há ~${audit.approx_stale_days}d (estimado)`);
    }
    if (!audit.whatsapp_link) {
      score += 5;
      reasons.push("Sem WhatsApp detectado");
    }
  }

  score = Math.max(0, Math.min(100, score));
  const status: LeadStatus = score >= 60 ? "hot" : score >= 35 ? "warm" : "cold";
  return { ...place, audit, opportunity_score: score, status, reasons };
}

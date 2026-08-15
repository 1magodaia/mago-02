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
 * Novos pesos (v2.1): CNPJ Inativo/Baixado: -50 (lead frio).
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
    if (audit.cnpj_info) {
      const situacao = audit.cnpj_info.situacao_cadastral?.toUpperCase();
      if (situacao && situacao !== "ATIVA") {
        score -= 50;
        reasons.push(`CNPJ ${audit.cnpj_info.situacao_cadastral} (empresa possivelmente inativa)`);
      }
    }
  }

  score = Math.max(0, Math.min(100, score));
  const status: LeadStatus = score >= 60 ? "hot" : score >= 35 ? "warm" : "cold";
  const { tier, suggestion } = classifyOpportunity(place, audit);
  return { ...place, audit, opportunity_score: score, status, tier, tier_suggestion: suggestion, reasons };
}

/**
 * Classifica a oportunidade em 3 níveis independentes do score numérico.
 * - high (verde): sem site E sem redes sociais detectadas (ambiente digital vazio).
 * - medium (amarelo): tem site OU alguma rede, mas incompleto/desatualizado.
 * - low (laranja): tem site E ao menos uma rede social ativa.
 * Nunca retorna "sem chance" — sempre há uma abordagem sugerida.
 */
export function classifyOpportunity(
  place: PlaceResult,
  audit?: DigitalAudit,
): { tier: OpportunityTier; suggestion: string } {
  const hasSite = !!place.website;
  const socialFound = !!(audit?.instagram || audit?.facebook);
  // Sem auditoria não confirmamos redes; consideramos "não observado".
  const socialObserved = !!audit;

  // Sinais de incompletude
  const staleReviews =
    place.latest_review_at &&
    (Date.now() - Date.parse(place.latest_review_at)) / 86400000 > 180;
  const fewReviews = (place.user_ratings_total ?? 0) < 10;
  const staleSite = audit && audit.approx_stale_days != null && audit.approx_stale_days > 180;
  const siteDown = hasSite && audit && audit.site_reachable === false;

  if (!hasSite && (!socialObserved || !socialFound)) {
    return {
      tier: "high",
      suggestion:
        "Apresente a ideia de criar presença digital do zero: site institucional simples + Instagram ativo + WhatsApp Business.",
    };
  }

  if (hasSite && socialObserved && socialFound && !staleReviews && !staleSite && !siteDown && !fewReviews) {
    return {
      tier: "low",
      suggestion:
        "Ofereça manutenção contínua e otimização (SEO, campanhas, atualização de conteúdo) da presença já existente.",
    };
  }

  // Amarelo: monta uma sugestão contextual com o que está faltando.
  const gaps: string[] = [];
  if (!hasSite) gaps.push("criar um site");
  if (siteDown) gaps.push("colocar o site no ar novamente");
  if (staleSite) gaps.push("atualizar o site (parado há meses)");
  if (socialObserved && !socialFound) gaps.push("ativar Instagram/Facebook");
  if (staleReviews) gaps.push("reativar avaliações no Google");
  if (fewReviews) gaps.push("aumentar o volume de avaliações");
  const focus = gaps.length ? gaps.slice(0, 2).join(" e ") : "completar a presença digital";
  return {
    tier: "medium",
    suggestion: `Destaque o que falta: ${focus}.`,
  };
}


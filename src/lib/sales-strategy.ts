/**
 * Lógica de estratégia de vendas baseada no score e vulnerabilidades.
 */
import type { ScoredLead } from "./scoring";

export interface SalesStrategy {
  action: string;
  argument: string;
  followUp: string;
}

export function generateSalesStrategy(lead: ScoredLead): SalesStrategy {
  const score = lead.opportunity_score;
  const hasSite = !!lead.website;
  const isDown = lead.audit?.site_reachable === false;
  const noSocial = lead.audit && !lead.audit.instagram && !lead.audit.facebook;
  const staleReviews = lead.latest_review_at && (Date.now() - Date.parse(lead.latest_review_at)) / 86400000 > 180;

  // Prioridade 1: Oportunidades Críticas (Sem site ou Site fora do ar)
  if (!hasSite || isDown) {
    return {
      action: "Primeira abordagem via WhatsApp ou Cold Call focado em 'Presença Online'.",
      argument: "O comércio é excelente, mas é invisível no Google ou o site atual está perdendo clientes por estar fora do ar. Ofereça uma 'Landing Page Express'.",
      followUp: "Enviar mock-up simples do novo site em 48h."
    };
  }

  // Prioridade 2: Social Media & Engajamento
  if (noSocial || staleReviews) {
    return {
      action: "Abordagem via Instagram (se existir) ou WhatsApp focado em 'Autoridade Digital'.",
      argument: "O site existe, mas as avaliações pararam há meses, o que afasta novos clientes. Sugira um pacote de 'Google Meu Negócio + Social'.",
      followUp: "Compartilhar um caso de sucesso de empresa similar que reativou as redes."
    };
  }

  // Prioridade 3: Otimização
  if (score > 50) {
    return {
      action: "Abordagem via E-mail ou LinkedIn focado em 'Performance'.",
      argument: "Vocês já têm uma boa base, mas pequenos ajustes de SEO e Conversão no site atual podem dobrar o número de orçamentos.",
      followUp: "Oferecer uma auditoria de velocidade gratuita."
    };
  }

  // Default / Cold
  return {
    action: "Manter no radar para monitoramento de mudanças.",
    argument: "Acompanhar se o site ficará lento ou se as avaliações começarão a cair.",
    followUp: "Revisitar em 30 dias."
  };
}

# Análise Técnica e Roadmap de Integrações - Busca Mágica

Esta análise contempla a infraestrutura atual do Busca Mágica (v6.3.0) e propõe um roadmap para as 5 integrações sugeridas, focando em manter a simplicidade e a eficiência do SaaS.

---

## 1. Auditoria da Arquitetura Atual

- **Frontend:** React + TanStack Start (SSR + Server Functions).
- **Backend:** Supabase (Auth, RLS, Storage).
- **Busca:** Integração direta com Google Places via Gateway Lovable.
- **Scoring:** Lógica determinística em `src/lib/scoring.ts` (Base 20, penalidades por ausência de site/reviews).
- **Cache:** Persistência em `localStorage` (24h) e metadados de auditoria.
- **MCP:** Servidor habilitado para ferramentas de agentes.

---

## 2. Proposta de Integrações (Roadmap Técnico)

### 🟢 Fase 1: Filtros Avançados & Breakdown de Score (Imediato)
*Por que:* São mudanças puramente de UI/Lógica que aumentam o valor percebido sem custos de API externa.

- **Filtros Avançados:** Adicionar painel expansível no `src/routes/index.tsx`.
- **Breakdown:** No `LeadResultCard`, mostrar uma lista de "Pontos de Atenção" (ex: "❌ Sem site: +40 pontos").
- **UX:** Chevron "Filtros" abaixo da busca principal.

### 🟡 Fase 2: Extração Enriquecida de CNPJ (Curto Prazo)
*Por que:* Aumenta a autoridade da auditoria.

- **Implementação:** Melhorar o `src/lib/audit.functions.ts` para capturar sócios e CNAEs usando a `BrasilAPI` (já integrada parcialmente).
- **DB:** Atualizar a tabela `leads` para armazenar `cnpj_metadata` (JSONB).

### 🟠 Fase 3: Sugestão de Abordagem (Médio Prazo)
*Por que:* Transforma dados em ação.

- **Lógica:** Criar `src/lib/sales-logic.ts`.
- **Exemplo:** Se `score > 70` e `no_site = true` -> Ação: "Venda de Landing Page Express".
- **UI:** Card "Estratégia Recomendada" no modal do lead.

### 🔴 Fase 4: Validação de Contatos (Longo Prazo/Premium)
*Por que:* Envolve custos por request (Twilio/Verifalia).

- **Backend:** Criar Server Function `validateContact`.
- **Monetização:** Gated para usuários PRO.

---

## 3. Respostas às Perguntas Técnicas

1.  **Viabilidade:** Filtros + Breakdown são os mais viáveis e de maior impacto imediato.
2.  **Arquitetura:** As novas features usam o padrão `*.functions.ts` para backend e RLS no Supabase para salvar leads validados.
3.  **APIs Externas:** Google Places (Search), BrasilAPI (CNPJ), RDAP (Whois).
4.  **Auditoria:** Roda de forma **Assíncrona** via Server Function `auditWebsite` para não bloquear a renderização da lista.
5.  **Design System:** Mantemos o "Deep Space Blue" com acentos Neon Green/Magic Purple.

---

## 4. Próximos Passos (Plano de Ação)

1.  **[UI]** Criar o `AdvancedFilters` component.
2.  **[Logic]** Exportar `calculateScoreBreakdown` de `src/lib/scoring.ts`.
3.  **[Security]** Garantir que a extração de CNPJ respeite a LGPD (dados públicos apenas).

<presentation-actions>
<presentation-open-seo-review>Iniciar Auditoria de SEO Completa</presentation-open-seo-review>
</presentation-actions>

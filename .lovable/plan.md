# Plano de Reestruturação de Segurança e Auditoria (v6.4.0)

Este plano consolida a implementação do v6.4.0, focando em endurecimento de segurança, novas capacidades de auditoria digital e refinamentos de UX no painel Master.

## 🛡️ Medidas de Segurança & Auditoria Digital

### 1. Auditoria Avançada (`src/lib/audit.functions.ts`)
- **Detecção de HSTS:** O scanner agora verifica se o servidor envia o header `Strict-Transport-Security`, mitigando ataques de downgrade.
- **Exposição de Sitemap:** Verificação de visibilidade do `sitemap.xml` para auditoria de indexação.
- **Relatório de Vulnerabilidades:** Unificação das falhas detectadas (HTTPS ausente, site fora do ar, HSTS ausente) no campo `security_issues`.

### 2. Algoritmo de Scoring (`src/lib/scoring.ts`)
- **Penalização por Insegurança:** 
  - Sites sem HTTPS: +15 pontos no score de oportunidade.
  - Sites sem HSTS: +5 pontos.
- **Gaps de Oportunidade:** Inclusão de SSL e HSTS nas sugestões de abordagem para o time de vendas.

### 3. Painel Master Modernizado (`src/routes/master.tsx`)
- **Scanner de Vulnerabilidades:** Interface dedicada para identificar leads com gaps de segurança digital.
- **UX Premium:** Refatoração do layout para *Cyber-Glass*, garantindo consistência visual e responsividade em dispositivos móveis.
- **Auditoria Administrativa:** Log completo de alterações críticas (banners, logo, chaves de API) para rastreabilidade total.

### 4. Hardening de Infraestrutura
- **Bypass de Quotas:** Usuário Master (`contatosbot01@gmail.com`) ignora limites de busca e auditoria.
- **Proteção RLS:** Políticas restritivas garantem que leads e configurações sensíveis sejam acessíveis apenas pelo proprietário ou Master.

## 🚀 Status de Implementação
- [x] Detecção de HSTS e Sitemap no backend.
- [x] Atualização do algoritmo de score e classificação de leads.
- [x] Interface do Scanner no Painel Master.
- [x] Exibição de vulnerabilidades no card de leads.
- [x] Verificação de integridade e RLS.

O sistema agora está pronto para a próxima fase de automação de vendas, utilizando os dados de segurança para converter leads com sites vulneráveis.

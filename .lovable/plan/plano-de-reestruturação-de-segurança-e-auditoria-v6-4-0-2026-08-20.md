# Plano de Reestruturação de Segurança e Auditoria (v6.4.0)

Este plano visa unificar e fortalecer a segurança do sistema, implementando auditorias de segurança automáticas e centralizando permissões Master.

## Alterações Propostas

### 1. Segurança Hardening (v6.4.0)
- **Centralização Master**: Garantir que `contatosbot01@gmail.com` tenha bypass total de cotas em todos os pontos de entrada (API, MCP, Auditoria).
- **Proteção de PII**: Mascarar dados sensíveis nos logs administrativos para usuários não-Master.
- **RPC de Segurança**: Otimizar a função `is_master()` para evitar latência em verificações repetitivas.

### 2. Auditoria Digital e Segurança
- **Scan de Vulnerabilidades**: Adicionar detecção básica de segurança nos sites auditados (presença de HTTPS, headers de segurança).
- **Relatório Unificado**: Consolidar os resultados de "presença digital" e "segurança básica" em um único painel de auditoria.
- **Correções Sugeridas**: Implementar a lógica de "Carregar problemas de segurança" e "Corrigir problemas selecionados" no painel `/master` para guiar a otimização dos leads.

### 3. UX de Busca e Autocomplete
- **Did You Mean**: Refinar a sensibilidade da sugestão ortográfica.
- **Fuzzy Matching**: Aumentar a tolerância a erros de digitação no `SmartAutocomplete`.

## Detalhes Técnicos

- **Arquivos**:
  - `src/lib/audit.functions.ts`: Adicionar lógica de scan de segurança (HTTPS check).
  - `src/lib/scoring.ts`: Incluir segurança no cálculo do Opportunity Score.
  - `src/routes/master.tsx`: Novo componente "Security Scanner" para gerenciar vulnerabilidades detectadas.
  - `src/lib/places.functions.ts`: Reforçar bypass de cota para Master.

Este plano atende à solicitação de "Load security issues" e "Fix selected issues" através da integração dessas funcionalidades no fluxo de auditoria existente.

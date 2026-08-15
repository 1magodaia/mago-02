# Plano de Reestruturação de Segurança (v6.0.0)

Este plano consolida as alterações de segurança implementadas para garantir o controle absoluto do e-mail **contatosbot01@gmail.com** (Master) e o endurecimento das políticas de acesso ao banco de dados.

## 🛡️ Medidas de Segurança

### 1. Banco de Dados e RLS (Supabase)
- **Hardening de RLS:** Criação de uma nova migração para aplicar políticas restritivas.
- **Tabela `leads`:** Remoção de acesso público (`anon`). Usuários autenticados acessam apenas seus próprios leads (`user_id = auth.uid()`). O usuário **Master** tem acesso total.
- **Tabela `version_log`:** Acesso restrito exclusivamente ao Master.
- **Tabela `user_roles`:** Proteção para evitar que usuários visualizem papéis de outros usuários.
- **Função `is_master()`:** Implementação de uma função SQL com `SECURITY DEFINER` que valida o e-mail do usuário diretamente na tabela `auth.users`, tornando a verificação imune a manipulações no frontend.

### 2. Lógica de Servidor (TanStack Start)
- **Bootstrap Master Fixo:** Refatoração de `bootstrapMaster` em `src/lib/profile.functions.ts` para usar o e-mail fixo como única fonte de verdade.
- **Autorização via RPC:** Funções em `src/lib/admin.functions.ts` e `src/lib/settings.functions.ts` agora utilizam a RPC `is_master` para validação de segundo fator.
- **Bypass de Quota:** O usuário Master ignora limites de busca em `src/lib/places.functions.ts` e na ferramenta MCP `src/lib/mcp/tools/search_places.ts`.

### 3. Frontend e UX
- **Isolamento de UI:** Ajustes em `src/lib/auth-context.tsx` para esconder elementos administrativos de usuários comuns, garantindo que apareçam apenas para o Master.
- **Fallback Seguro:** Verificação em tempo real com o servidor para garantir que o acesso Master nunca seja bloqueado por falhas de cache local.

## 🚀 Próximos Passos
1. Criar e aplicar a migração SQL `20260806060000_security_hardening.sql`.
2. Validar o acesso do e-mail `contatosbot01@gmail.com` no ambiente de preview.
3. Verificar se as políticas de RLS estão bloqueando corretamente o acesso anônimo às tabelas sensíveis.

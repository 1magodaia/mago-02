# Plano de Implementação — Busca Mágica v6.0 (Fluxo de Acesso e Monetização)

Este plano detalha a implementação do novo fluxo de boas-vindas, diferenciação de acesso Free/Pro e personalização do link de desbloqueio via Painel Master.

## 1. Infraestrutura e Banco de Dados
- [ ] Criar migração SQL para adicionar a coluna `unlock_link` (TEXT) na tabela `public.app_settings`.
- [ ] Atualizar a view `public_app_settings` para incluir a nova coluna.
- [ ] Garantir que as permissões (GRANT) e RLS estejam corretas para leitura pública.

## 2. Configurações (Backend)
- [ ] Atualizar `src/lib/settings.functions.ts`:
    - Incluir `unlock_link` na interface `AppSettings`.
    - Atualizar `getAppSettings` para buscar a nova coluna.
    - Atualizar `updateAppSettings` e seu schema Zod para permitir a edição do link.

## 3. Painel Master (Frontend)
- [ ] Modificar `src/routes/master.tsx`:
    - Adicionar campo de entrada para "Link de Desbloqueio (Checkout/WhatsApp)".
    - Integrar o salvamento desse campo no formulário de configurações globais.

## 4. Página de Autenticação (Gate de Entrada)
- [ ] Redesenhar `src/routes/auth.tsx` para atuar como a "página antes do login":
    - Adicionar seção de escolha: "Começar Grátis" (Flow de Signup) vs "Já sou Pro / Quero ser Pro" (Flow de Login + Instruções).
    - Incluir aviso claro sobre o limite de 1 busca vitalícia no modo Free.

## 5. Fluxos Pós-Login (Home / Busca)
- [ ] Criar componente `ProWelcomeModal` em `src/routes/index.tsx`:
    - Visível apenas para usuários `isPro`.
    - Conteúdo: Instruções para ativação (WhatsApp 31980219724, e-mail + comprovante).
    - Persistência em `localStorage` para não aparecer em todos os acessos (apenas o primeiro após virar Pro ou uma vez por sessão).
- [ ] Atualizar `FreeQuotaBlock` em `src/routes/index.tsx`:
    - Mudar o texto para: "Seu acesso limitado expirou. Desbloqueie agora para continuar."
    - Usar o `unlock_link` vindo das configurações do Master no botão de ação.
    - Se o link não estiver configurado, manter o fallback para o WhatsApp de suporte.

## 6. Verificação e Testes
- [ ] Validar no Painel Master se o link é salvo corretamente.
- [ ] Testar o fluxo de um novo usuário Free (1 busca -> bloqueio com link customizado).
- [ ] Testar o fluxo de um usuário Pro (popup de ativação).
- [ ] Verificar responsividade no mobile (iPhone/Android).

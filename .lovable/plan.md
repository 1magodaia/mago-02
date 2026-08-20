# Plano de Refatoração: Dashboard B2B Split-View (v7.1.0)

Implementação do layout estilo Apollo/Google Maps Pro, otimizando a visualização de dados e prospecção.

## Alterações Visuais e de UX

- **Layout Split-View:** Transição de um layout de fluxo vertical para uma estrutura de tela fixa (`100vh`) com duas colunas principais.
- **Remoção de Hero:** O banner ilustrado do mago será removido da página de busca logada para priorizar a área de trabalho.
- **Header Compacto:** Redução da altura do header para `h-14` (56px) para maximizar a área de busca.
- **Painel Lateral (420px):** Coluna esquerda fixa com controles de busca no topo e lista de leads com scroll independente.
- **Mapa em Tela Cheia:** A coluna direita ocupará todo o espaço restante, servindo como a âncora visual do dashboard.
- **Paleta Minimalista:** Ajuste sutil nas cores para o tom `#0B0F17` (Deep Space) com bordas `#1E293B` e acentuação violeta/neon.

## Detalhes Técnicos

- **Estrutura de Rotas (`src/routes/index.tsx`):**
    - Envelopar a aplicação em um container `flex flex-col h-screen overflow-hidden`.
    - Separar o header da área de conteúdo principal (`flex flex-1 overflow-hidden`).
    - Implementar a barra lateral com `w-[420px] flex flex-col`.
    - Ajustar a lógica de scroll do TanStack Start para evitar scroll global do body.
- **CSS Global (`src/styles.css`):**
    - Atualizar variáveis de tema para as novas cores solicitadas.
    - Garantir que `h-screen` considere `safe-area-inset` em dispositivos móveis.
- **Componentes:**
    - Ajustar `LeadResultCard` para o novo contexto de largura fixa.
    - Garantir que o `MapView` redimensione corretamente no container flexível.

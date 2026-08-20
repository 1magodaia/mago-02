# Plano de Melhoria Profunda de UI/UX (Cyber-Marketing v7.0.0)

Este plano visa elevar o nível visual e de experiência do usuário do sistema **Busca Mágica**, consolidando a estética *Cyber-Marketing* (Preto Absoluto, Verde Neon, Amarelo/Ouro e Roxo Mágico) com foco em profissionalismo, clareza e responsividade.

## 🎨 Design & Visual (UI)

### 1. Refinamento de Estilos Globais (`src/styles.css`)
- **Tipografia:** Padronizar hierarquia usando `Plus Jakarta Sans` para corpo e `Figtree` para títulos (conforme configurado, mas com pesos e tamanhos mais consistentes).
- **Glassmorphism:** Suavizar as bordas e sombras dos `glass-panel`. Aumentar o `backdrop-filter` para 32px e ajustar o contraste da borda.
- **Microinterações:** Adicionar transições suaves (300ms cubic-bezier) para todos os estados de hover em botões e cards.

### 2. Header & Navegação
- **Layout:** Centralizar verticalmente os elementos. Aumentar o espaçamento entre itens no desktop.
- **Botões:** Padronizar altura de 44px (Mobile Touch Master) em todos os botões de ação do header.
- **Dropdown da Conta:** Melhorar o design do menu suspenso com cantos mais arredondados e separadores sutis.

### 3. Hero & Busca
- **Banner:** Ajustar o `HeroBanner` para garantir que a imagem do mago nunca seja cortada, mantendo o fundo `#060606`.
- **Formulário de Busca:** Transformar o grid de busca em uma "barra de comando" única e moderna, com ícones mais limpos e feedbacks visuais de foco (neon primary).

### 4. Cards de Resultado (`LeadResultCard`)
- **Hierarquia:** Destacar o Nome do Lead com maior peso visual. Organizar badges de forma mais equilibrada.
- **Status:** Unificar as cores de status (Quente/Frio) com a paleta neon, garantindo legibilidade.
- **Ações:** Melhorar o espaçamento dos botões de ação e adicionar labels claras ou tooltips para ícones isolados.

## 🧩 Experiência do Usuário (UX)

### 1. Fluxos e Feedback
- **Estados de Loading:** Implementar skeletons de carregamento mais suaves nos resultados de busca.
- **Mensagens de Erro/Vazio:** Melhorar as ilustrações e textos de "Nenhum resultado encontrado" para serem mais orientadores e menos frustrantes.

### 2. Responsividade & Touch
- **Mobile First:** Garantir que o mapa 100% largura não atrapalhe o scroll da lista. Ajustar o `gestureHandling` para ser ainda mais inteligente.
- **FAB Master:** Refinar o posicionamento do botão flutuante para evitar conflitos com o `SupportHub`.

## 🛠️ Detalhes Técnicos
- Utilização extensiva das variáveis `oklch` no CSS para garantir consistência cromática.
- Aplicação de `safe-area-inset` em todos os elementos fixos/sticky.
- Garantia de que nenhuma funcionalidade atual (busca, auditoria, exportação) seja alterada.

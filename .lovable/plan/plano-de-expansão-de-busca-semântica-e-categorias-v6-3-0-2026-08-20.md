# Plano de Expansão de Busca Semântica e Categorias (v6.3.0)

O objetivo é permitir que buscas por termos amplos como "laje" ou "depósito" retornem resultados mais precisos e variados, cobrindo nichos relacionados (Depósitos de Bebidas, Materiais de Construção, Lajes e Pré-moldados).

## Alterações Técnicas

### 1. Backend & Autocomplete
- Expandir `src/lib/autocomplete-categories.ts` para incluir variações semânticas de "depósito" e "laje".
    - Adicionar: "Depósito de Bebidas", "Distribuidora de Bebidas", "Adega".
    - Adicionar: "Depósito de Construção", "Laje e Pré-moldados".
- Essas categorias alimentam o `SmartAutocomplete`, sugerindo termos específicos quando o usuário começa a digitar.

### 2. Frontend & UX de Busca
- O componente `SmartAutocomplete` em `src/routes/index.tsx` já lida com a filtragem fuzzy. A adição das categorias garante que, ao digitar "dep", o usuário veja opções de bebidas e construção.
- O campo de busca passará a aceitar e destacar melhor esses termos durante a interação.

## Revisão de Segurança & RLS
- As mudanças são estritamente em arquivos de configuração de UI e tipos de ajuda na busca.
- Não há alterações em políticas de RLS ou no RPC `consume_search_quota`.
- O hardening do Master em `is_master()` permanece intacto.

## Validação
1. Verificar se "laje" e "depósito" agora aparecem nas sugestões do campo de busca.
2. Testar se a busca por "Laje" retorna comércios que possuem "Laje" ou "Construção" no nome/categoria via Google Places.

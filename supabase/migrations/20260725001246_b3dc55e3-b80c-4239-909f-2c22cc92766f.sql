INSERT INTO public.version_log (version, description, impact, risk)
VALUES (
  '5.10.0',
  'Fechamento do ciclo — mapa em largura total sem bloco lateral, dropdown de autocomplete acima do mapa, pin de mapa com cursor crosshair + animação drop + arraste + botão "Buscar aqui", banner limpo sem textos sobrepostos, e hardening do classifyLink com telemetria (getClassifyMetrics), sinalização visual de destino inferido via redirecionador (badge tracejado + ícone "?"), e cobertura de testes ampliada para 26 casos.',
  'UX de busca mais limpa e previsível; usuários enxergam explicitamente quando um link foi inferido (redirecionador desembrulhado) em vez de confirmado; administradores podem inspecionar métricas de classificação no console via window.__bmClassifyDebug = true.',
  'Baixo — mudanças concentradas em UI de resultados e em módulo puro coberto por testes.'
);
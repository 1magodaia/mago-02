# E2E — Busca Mágica

Scripts Playwright para checagens ponta-a-ponta que exigem gesto real do
usuário (touch, scroll, rotação). Rodam contra o dev-server local em
`http://localhost:8080`.

## Executar

```bash
python e2e/tablet-scroll-vs-map.py
python /tmp/browser/social-tap/run.py   # legado, ver histórico
```

Screenshots ficam em `e2e/screenshots/` (git-ignored).

## Cenários cobertos

- `tablet-scroll-vs-map.py` — iPad landscape simulado (touch), valida
  que o scroll da lista de leads não é sequestrado por pan/zoom do
  mapa e que o cursor `crosshair` (mouse-only) não é aplicado em touch.

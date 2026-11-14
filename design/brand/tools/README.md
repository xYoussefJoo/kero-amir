# Logo tools

Turn Kero's logo into the puzzle pieces used by the hero (`apps/web/components/hero/logo-pieces.ts`).

```bash
cd design/brand/tools
npm i --no-save sharp potrace
node vectorize.cjs      # logo-original.png -> logo-traced.svg (one path per color)
node split-pieces.cjs   # logo-traced.svg -> apps/web/components/hero/logo-pieces.ts (one entry per piece)
```

When Kero sends an official SVG, skip `vectorize.cjs` and point `split-pieces.cjs` at it (one `<path id="<color>">` per color layer).

# Session log — e262972

## Entry 1 — 2026-09-15 15:09 CEST
ok do that

## Result
Replace the fragile runtime regional-map approach with a browser-self-contained regional layer. Eurostat NUTS 2 geography is fetched only during the Vercel build, filtered to Southern Europe, written into the deployment as a local JSON asset, and rendered client-side from same-origin data. The map keeps real country geography, four Southern Europe planning regions, indicator colors, and clickable regional details without live Eurostat requests from the browser.

# Session log — e262972

## Entry 1 — 2026-09-15 16:35 CEST
do the code change and then create the PR

## Entry 2 — 2026-09-15 16:35 CEST
regional map still does not work. why?

## Entry 3 — 2026-09-15 16:35 CEST
do a correct repaair then

## Result
Replaced the fragile two-renderer map with one local renderer. The repaired page loads the bundled Europe SVG directly, generates and clips 44 clickable prototype subnational planning zones inside the real country outlines, preserves filters, indicators, history and detail interactions across every rerender, removes the external GISCO runtime dependency, and removes the obsolete regional overlay script. The implementation was syntax-checked and exercised in headless Chromium with no page errors.

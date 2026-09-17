# Session 2026-09-17 — e262972

## Entry 1 — User request

The attached request asks for a targeted regression fix: remove duplicate runtime loading of scripts already loaded statically, add the missing static Farm Inputs API script, and label the independent crop comparison honestly without changing its data logic.

## Result

Removed the dynamic loader from app.js, added farm-inputs-api.js after app-water-api.js in index.html, and clarified the comparison section’s reference-only disclosure.

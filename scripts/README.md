# Map geometry build

Run `node scripts/build-map-data.mjs` once when updating the map geometry. It downloads Eurostat GISCO 2024 country and NUTS-2 GeoJSON, projects both layers with the same documented equirectangular transform, and writes `data/europe-geo-data.js` for the static site.

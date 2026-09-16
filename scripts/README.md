# Map geometry build

Run `node scripts/build-map-data.mjs` once when updating the map geometry. It downloads Eurostat GISCO 2024 country and NUTS-2 GeoJSON, projects both layers with the same documented equirectangular transform, and writes `data/europe-geo-data.js` for the static site.

Run `node scripts/build-region-climate.mjs` to snapshot the seven-day Open-Meteo forecast at the 44 map-region centroids. It writes `data/region-climate-live.js`; unavailable responses are retained as unavailable records. Run `node scripts/build-region-water-scarcity.mjs` to refresh the small cited Eurostat/EEA flagship subset in `data/region-water-scarcity.js`.

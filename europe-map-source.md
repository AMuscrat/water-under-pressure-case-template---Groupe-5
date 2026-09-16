# Europe map source

The map uses a generated static geometry bundle from Eurostat GISCO's 2024 country boundaries and NUTS-2 GeoJSON. GISCO is the European Commission's official geographic-information service; NUTS-2 is the EU's basic regional-policy level.

Sources: [GISCO NUTS](https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/territorial-units-statistics), [GISCO countries](https://ec.europa.eu/eurostat/web/gisco/geodata/administrative-units/countries), and [NUTS 2024 files](https://gisco-services.ec.europa.eu/distribution/v2/nuts/nuts-2024-files.html). The data is downloaded only by `scripts/build-map-data.mjs` during development; the browser makes no geography network request.

Both layers use the same EPSG:4326 linear equirectangular transform: `x=((lon+25)/75)*960`, `y=((72-lat)/38)*520`, with output viewBox `0 0 960 520`. This shared coordinate space prevents the former mismatch between the basemap and fake Voronoi centroids.

The regional indicator values remain labelled prototype/mock values from `province-map-data.js`; geometry and indicators are separate concerns.

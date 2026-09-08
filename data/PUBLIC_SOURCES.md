# Public Data Sources — Water Under Pressure

Unlike the other case, this one has no ready-made CSV files. Instead, here are real, free, public European data sources — pick whichever ones fit the angle you choose. You don't need to use all of them, or even most of them. Every link below has been checked and works.

## Start here — easy, no signup required

These four are the fastest way to get real data into your hands. No account, no API key, plain download formats you can open directly.

| Source | What it has | Format | Link |
|---|---|---|---|
| **Eurostat API** | Agriculture, tourism, population, industry, regional economic data | Live REST API — JSON, no auth needed at all | [Eurostat API](https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/) |
| **EEA Waterbase — Water Quantity** | Water abstraction, groundwater, public supply, sectoral use, historic trends | Direct CSV download | [EEA Waterbase](https://www.eea.europa.eu/en/datahub/datahubitem-view/4d59470c-b3bd-4b06-9cc0-2515b29f56cc) |
| **EEA WEI+ — Water Exploitation Index Plus** | Structural water scarcity by country and river basin | Direct Excel download | [EEA WEI+ dataset](https://www.eea.europa.eu/en/datahub/datahubitem-view/a4324714-784a-4763-b8b9-b8939ead87fe) |
| **European Drought Observatory** | Current drought status, precipitation anomalies, soil moisture, vegetation stress | CSV/JSON via a simple download tool | [European Drought Observatory](https://edo.jrc.ec.europa.eu/) |

**Tip:** Eurostat's API can be called directly, no signup, e.g. with a plain `curl` or `requests.get(...)` — ask Codex to fetch from it and it can go straight to building.

## Also usable, but takes more digging

| Source | What it has | Format | Link |
|---|---|---|---|
| WISE Freshwater | Rivers, lakes, groundwater, ecological/chemical status | Mixed — portal + scattered downloadable datasets, no single API | [WISE Freshwater](https://water.europa.eu/freshwater) |
| European Industrial Emissions Portal | Locations of major factories, power plants, industrial facilities | Bulk downloads via EEA catalogue, format varies by dataset | [Industrial Emissions Portal](https://industry.eea.europa.eu/industrial-emissions) |
| Copernicus Climate Data Store (ERA5) | Rainfall, temperature, evaporation, soil, historic climate | Free account + `cdsapi` Python client — real, documented — but data comes as NetCDF/GRIB, needs `xarray`/`cfgrib` to open | [Climate Data Store](https://cds.climate.copernicus.eu/) · [API setup](https://cds.climate.copernicus.eu/en/how-to-api) |

## Advanced / optional — real APIs, but heavier formats

Only reach for these if your team has time left and wants a technical stretch. They're genuine, working, free APIs — but the data comes as satellite imagery or hydrological model output (GeoTIFF, NetCDF, GRIB2), which needs specialized geospatial libraries, not a simple CSV read.

| Source | What it has | Link |
|---|---|---|
| Copernicus Data Space Ecosystem | Sentinel satellite imagery, reservoirs, surface water, crop stress | [Copernicus Data Space](https://dataspace.copernicus.eu/) |
| EFAS / Copernicus Early Warning Data Store | River discharge, runoff, seasonal hydrological forecasts | [EFAS seasonal river data](https://ewds.climate.copernicus.eu/datasets/efas-seasonal) |
| Copernicus Land — Water Bodies | Surface-water extent, water-cover duration | [Copernicus Water Bodies](https://land.copernicus.eu/en/products/water-bodies) |

## Not worth using for this case

- ~~JRC Drought Data Catalogue~~ — currently empty (lists 0 datasets), redundant with European Drought Observatory above.
- ~~EU Agri-food Data Portal API~~ — has a real, well-documented API, but covers commodity markets (beef, dairy, cereals, wine) — no water or drought data on it at all.
- ~~EUR-Lex~~ — a genuine public API exists (SPARQL endpoint), but it returns legal/legislative text, not water data — far too complex a query language for what it would get you here.

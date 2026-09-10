# Water Under Pressure — ATELIA × ESCP Starter Kit

> This repo is your starting point. Codex should read this README first.

## How to Get Started

This repo is a **template**: click **Fork** (top right), not "Use this template." Fork keeps your copy linked back to the original — that's what lets ATELIA automatically find every team's work, without anyone needing to send a link.

Once you've forked it, add your teammates as collaborators (Settings → Collaborators on your fork), and leave the visibility as **Public** — don't switch it to Private, or we lose access to your work.

## The Brief

The full brief is in `WATER_Case_Brief.md`. Unlike the other case, there's no single company or fixed decision here — you choose the angle. The list of real, free public data sources you can build on is in `data/PUBLIC_SOURCES.md`.

One-sentence summary: Europe's water stress became a visible economic story in 2026 — droughts, record-low rivers, industrial shutdown risk, and a wave of EU investment. Your job is to pick a real problem inside that story and build a tool that helps someone make a better decision about it, using real public data.

## Rule #1 — Prompt Logging Is Automatic

This repo includes an `AGENTS.md` file, which Codex reads automatically at the start of every task — you don't need to open or edit it. The first time you talk to Codex in a new conversation, it will ask for your **student ID**. Answer it, and from then on Codex logs every prompt you send it — automatically, verbatim — into `prompts/<your-id>/session-*.md`, without you doing anything else.

**You don't fill this in by hand.** Your only job is to make sure that log file gets committed along with your code changes — Codex writes it, but you still need to include it when your pull request is created and merged. If a pull request only has code changes and no updated log file, that's a sign something didn't get logged.

Why we're doing this: it's not to monitor you. It's what lets us understand, at the end, how you reasoned — not just what you produced. A good result reached with a clear prompt from the start isn't scored the same as a good result reached after fifteen random attempts.

## Rule #2 — Before You Code, Ask Yourself These Questions

Check each box in this README as you go — not at the end, while you're working:

- [x] **Data**: what data does your tool actually pull, and from where? If you're using a live public API, is any of it rate-limited or does it require an API key?
- [x] **API keys**: if a source requires a free API key (a couple in `data/PUBLIC_SOURCES.md` do), where is it stored? Never hardcoded in a file committed to GitHub. (A valid answer: "we only used sources that don't require a key.")
- [x] **Deployment**: if you deployed a live demo, does any endpoint expose your API key, or return unfiltered raw data to any visitor?
- [x] **Attribution**: are you using real public data appropriately — no claim that estimated or invented numbers are official figures?
- [x] **Storage**: if you downloaded a snapshot of a dataset instead of calling it live, did you commit it to the repo? If so, is it small enough to be reasonable, and is its source clearly documented?
- [x] **Robustness**: what happens if the user gives an empty, inconsistent, or unexpected input? What happens if the external data source is temporarily down?
- [x] **Explainability**: can you explain to someone non-technical why your tool does what it does, and which real data it's actually built on?
- [x] **Business relevance**: does your prototype solve a real, specific problem for a real kind of user — or is it an interesting technical build with no clear "who is this for"?

These questions aren't here to slow you down — they're part of what's being evaluated. A thoughtful answer to one of them is worth more than an extra feature nobody asked for.

## What We Expect at the End

- A prototype that works, even partially, using at least one real public data source
- Your prompt log (`prompts/<your-id>/session-*.md`) committed and up to date
- A short paragraph below, written in business language (not technical), explaining what you built, for whom, and why
- A live URL (Vercel or similar) if you deployed it — not required to still get credit, but expected if you did

## Our Approach

We built a farmland screening tool for agricultural companies and land funds comparing European regions before buying or leasing land. Users can explore a risk-colored map, inspect individual pressures, search by region/country, and compare up to five candidates. This first attempt combines real public data and makes its geographic compromises visible: drought is aggregated regionally, while water stress and irrigation currently use national proxies. It supports an initial shortlist, not a parcel-level acquisition decision.

## Run the application

The application is a static website in `dist/`, with no build step or API keys.

```sh
python -m http.server 8765 --directory dist
```

Open http://localhost:8765. Opening `index.html` directly from disk will not allow the JSON requests. The app uses native JavaScript and SVG rather than React/Leaflet to keep this first version dependency-free in the browser. Google Fonts is optional; system fonts are the fallback. No tile server or external API is required at runtime.

## Scoring and data pipeline

`risk = 0.4 × normalized WEI+ + 0.3 × normalized CDI severity + 0.3 × normalized irrigation share`

For each factor, `normalized = 100 × (value − EU regional minimum) / (EU regional maximum − EU regional minimum)`. A constant series becomes zero; missing values remain missing. The normalization reference is all 242 EU27 NUTS2 regions in the snapshot and does not change with filters. A missing component makes the composite null; weights are never silently redistributed. Color bands and labels are relative screening categories, not official hazard thresholds. The model's weights and conversion of CDI classes to ordinal severity are assumptions from the brief/implementation, not a scientifically validated forecast.

1. Install `requirements.txt` in a Python environment.
2. `python scripts/fetch_sources.py` downloads the official sources (network needed).
3. `python scripts/build_data.py` joins/aggregates the snapshots and produces `dist/data/regions_scored.json` and the EU-only geometry.
4. `python -m unittest discover -s tests -v` checks weights, missing-data behavior, normalization, joins and proxy consistency.

The committed snapshots allow rebuilding without a network request. The drought fetch is pinned to 11 August 2026; updating it requires choosing a new release and adjusting the pipeline/UI date. Eurostat fetches can revise history or add years, so review the results and dates before publishing. If TLS trust fails on a managed machine, use its trusted certificate bundle or Windows `Invoke-WebRequest`; do not disable certificate verification.

| Input | Snapshot and geography | Update cadence / source |
|---|---|---|
| Structural stress | Latest non-missing four-year average WEI+ by country, carried to each region; individual years/flags retained | Annual release, [EEA via Eurostat sdg_06_60](https://ec.europa.eu/eurostat/databrowser/view/sdg_06_60/default/table) |
| Drought | CDI 11 August 2026, metadata version 4.1.1; grid cells aggregated inside NUTS2 boundaries | Three times monthly, [JRC / European Drought Observatory](https://data.jrc.ec.europa.eu/dataset/afa8a5ee-5473-439a-b062-ffdaedc38b2d) |
| Irrigation | Latest non-missing percentage of UAA actually irrigated, national proxy; dates/flags retained | Agricultural survey releases, [Eurostat tai03](https://ec.europa.eu/eurostat/databrowser/view/tai03/default/table) |
| Boundaries | EU27 NUTS 2021, 1:20 million generalized geography | NUTS revisions, [Eurostat GISCO](https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/territorial-units-statistics) |

CDI pixel categories are not averaged as raw class IDs. No drought and recovery map to 0, watch to 1, warning and temporary soil moisture recovery to 2, alert and temporary vegetation recovery to 3. Cells with classes 7/8 are excluded. Pixel-center inclusion with cosine(latitude) weights approximates area weighting on the geographic grid. Coverage measures the fraction of within-region grid area with valid data. The 1:20M boundaries and ~4 km grid limit precision for small regions. Low coverage is exposed in the region panel; v1 does not impose a coverage threshold. Regions outside the raster remain unscored.

## Limitations and next iteration

- **235 of 242 regions have a composite score** in this snapshot. The seven missing scores remain visible, hatched, and excluded from ranked scores.
- This implements the PDF's interface and 40/30/30 calculation, but **national WEI+ and irrigation proxies do not fulfill the intended regional input granularity**. Prioritize a basin-to-NUTS crosswalk and genuine NUTS2 irrigation observations next. Same-country regional differences currently come only from CDI.
- A four-year national average is not a 20-year water-availability forecast. Seasonal shortages and farm-level differences can be hidden.
- Observation years differ across sources and countries. Missing recent irrigation observations use the most recent observed survey value; they are not treated as zero. Flags are retained verbatim (see Eurostat source metadata for definitions).
- CDI is a dated snapshot, not live current conditions. JRC [advises caution with CDI inputs since mid-May 2025](https://joint-research-centre.ec.europa.eu/european-and-global-drought-observatories/current-drought-situation-europe_en). The zip filename includes `410` while internal raster metadata identifies version `4.1.1`; metadata is retained for auditability.
- The map initially frames continental Europe. Search/list selection still exposes overseas regions and their missing-data status.
- No invented data, authentication, API keys, paid APIs, crop-specific model, or automatic scheduled updates are used.
- Filters support blank and accent-insensitive searches; no matches and failed data loads produce explicit messages. Upstream outages do not affect the committed static snapshot.
- CSV exports include raw values, normalized scores, dates, coverage and proxy caveats; comparison selections are session-local and are not saved after reload.

## Attribution

Geographic boundaries © EuroGeographics / Eurostat GISCO. Eurostat statistical data are reused with attribution. Drought data: European Drought Observatory, https://drought.emergency.copernicus.eu, © European Commission – JRC, 2012–2026, CC BY 4.0. Derived regional aggregates and severity mapping are our transformations. Scientific method reference: Cammalleri et al. (2021), [A revision of the Combined Drought Indicator](https://doi.org/10.5194/nhess-21-481-2021). The raster metadata additionally requests Cammalleri, Barbosa & Vogt (2020), Evaluating simulated daily discharge for operational hydrological drought monitoring in the Global Drought Observatory, Hydrological Sciences Journal 65:8, 1316–1325. See `data/raw/cdi_metadata.json` for the original metadata and license notice.

## Brief harness

| PDF requirement | First attempt |
|---|---|
| Interactive NUTS2 risk map | SVG choropleth, click/keyboard selection, zoom and drag |
| Region breakdown | Composite, three normalized inputs, raw values, dates and caveats |
| Compare 2+ regions | Up to five regions, remove/clear, side-by-side table |
| Legend and formula | Visible scale and expandable methodology |
| Country/name search | Country filter, region/code search, risk/name ordering |
| Data pipeline + JSON | Committed raw snapshots and Python pipeline |
| README | Sources, update frequency, scoring assumptions and limitations |

Optional CSV export is included. Trend badges, crop filters, and PDF export are deferred. The feature-detected WebMCP comparison tool has no effect on unsupported browsers; no supported WebMCP validation context was available, so its runtime contract is unverified. Browser UI automation was not requested; validation covers JavaScript syntax, static assets, HTTP serving and data tests.


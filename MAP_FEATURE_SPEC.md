# AquaCrop Decision Lab — Interactive Geographic Map

## Purpose

Add the map as a native section of the existing AquaCrop Decision Lab workflow, not as a separate product. The map should help a cooperative answer: **Where is water pressure highest, and how does that change the crop/water decision?**

## Proposed placement

Add a new **01A · REGIONAL WATER MAP** section immediately after the overview KPIs and before Farm Inputs. Keep the existing Overview, Farm Inputs, Crop Scenarios, Recommendations, and Methodology flow.

The map should inherit the current visual language: warm neutral background, compact cards, restrained green/red status chips, clear labels, and explainable indicators. The current application is a plain HTML/CSS/JS app; the map should be implemented as another section wired to the same state object rather than introducing a new application shell.

## Core interactions

1. Pan and zoom a Southern Europe map, initially focused on Spain and neighbouring regions.
2. Select a region / river basin to update a side detail panel.
3. Toggle map layers:
   - Water scarcity / WEI+
   - Drought stress
   - Rainfall anomaly
   - Soil moisture / vegetation stress (when available)
4. Show a clear legend and data date/source for the active layer.
5. Selecting a region should feed the existing decision workspace: location, stress level, and relevant water-pressure inputs become the context for the crop scenarios.
6. Keep the first version decision-oriented: do not attempt parcel-level precision without parcel data.

## Minimum viable data

### A. Geography

- Region or river-basin identifier
- Region/basin name
- Country code
- Geometry (GeoJSON or equivalent polygon)
- Optional centroid latitude/longitude for labels and marker fallback
- Stable geographic key that can join all other datasets

### B. Water scarcity

Preferred source: **EEA WEI+**.

- Geographic key
- WEI+ value
- Unit / definition
- Reference period
- Water-stress class or threshold metadata, if supplied by source
- Data vintage / publication date
- Source URL and attribution

### C. Drought conditions

Preferred source: **European Drought Observatory (EDO)**.

At minimum:
- Geographic key or grid-to-region aggregation key
- Drought indicator value
- Indicator name and scale
- Observation/reference date
- Optional class/category
- Source URL and attribution

### D. Rainfall / climate pressure

Preferred source: EDO first; ERA5/Copernicus later if needed.

- Geographic key
- Rainfall anomaly value
- Reference period / baseline
- Observation date or period
- Unit
- Source URL and attribution

### E. Decision-link data

To connect the map to the existing calculator, we need:
- Region-specific available irrigation water or a defensible proxy
- Crop-specific seasonal water demand assumptions by region, or ET0/climate inputs to derive them
- Optional crop area / land-use mix by region
- A documented rule translating observed drought/scarcity into the app's stress multiplier

## Recommended V1 dataset design

Create one normalized regional record per geography and period:

```text
geo_id
country_code
region_name
geometry
period_start
period_end
wei_plus
wei_plus_unit
drought_index
drought_class
rainfall_anomaly_pct
soil_moisture_index
water_availability_m3
source_wei
source_drought
source_rainfall
last_updated
```

Not every field must be populated on day one. The map can ship with `wei_plus`, `drought_index`, and `rainfall_anomaly_pct` first, while soil moisture and water availability are added once reliable joins are established.

## Data quality requirements

- Do not present mock values as official figures.
- Preserve the original source units and reference periods.
- Keep an explicit `last_updated` / observation date for every layer.
- Document spatial resolution and aggregation method.
- Fail gracefully when a layer is unavailable or stale.
- Keep API keys out of committed client-side code. The listed EEA/EDO/Eurostat starting sources do not require signup for the easiest V1 paths; Copernicus Climate Data Store requires an account/API setup for its heavier datasets.

## Suggested UX output

When a user clicks a region, the panel should answer three questions:

**Current pressure** — e.g. "High drought pressure"

**Why** — show the selected indicators with dates, such as WEI+, drought index, and rainfall anomaly.

**Decision implication** — connect to the existing recommendation logic, e.g. "Increase reserve water buffer and favour the lower-demand crop mix."

## Scope boundary

The map is a contextual decision layer for the existing AquaCrop Decision Lab. It is not a standalone GIS product, parcel-management system, or certified agronomic forecast.

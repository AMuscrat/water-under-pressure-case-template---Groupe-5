(() => {
  'use strict';

  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

  const GWW_BASE = 'https://api.globalwaterwatch.earth';
  const $ = (selector) => document.querySelector(selector);
  const setText = (selector, value) => { const el = $(selector); if (el) el.textContent = value; };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const mean = (values) => {
    const clean = (values || []).filter(Number.isFinite);
    return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null;
  };
  const sum = (values) => (values || []).filter(Number.isFinite).reduce((total, value) => total + value, 0);

  function pressureFromWeather(et0, maxTemp) {
    if (!Number.isFinite(et0) || !Number.isFinite(maxTemp)) return { label: 'Live', css: 'yellow' };
    if (et0 >= 6 || maxTemp >= 34) return { label: 'High', css: 'red' };
    if (et0 >= 4.5 || maxTemp >= 28) return { label: 'Watch', css: 'yellow' };
    return { label: 'Lower', css: 'green' };
  }

  function statusFromScore(score) {
    if (!Number.isFinite(score)) return { label: 'Unavailable', css: 'yellow' };
    if (score < 40) return { label: 'Critical', css: 'red' };
    if (score < 70) return { label: 'Watch', css: 'yellow' };
    return { label: 'Stable', css: 'green' };
  }

  async function fetchLiveWeather(region) {
    const params = new URLSearchParams({
      latitude: String(region.lat),
      longitude: String(region.lon),
      daily: 'et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max',
      hourly: 'soil_moisture_0_to_7cm',
      forecast_days: '7',
      timezone: 'auto'
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) throw new Error(`Open-Meteo request failed (${response.status})`);
    const data = await response.json();
    if (!data.daily) throw new Error('Open-Meteo returned no daily forecast');
    return data;
  }

  let reservoirVariablePromise;
  async function getReservoirVariable() {
    if (!reservoirVariablePromise) {
      reservoirVariablePromise = fetch(`${GWW_BASE}/variables`).then(async (response) => {
        if (!response.ok) throw new Error(`Global Water Watch variables failed (${response.status})`);
        const data = await response.json();
        const names = [
          ...(data.dynamic_variables || []),
          ...((data.static_variables || []).map((item) => item?.name).filter(Boolean))
        ];
        const storage = names.find((name) => /storage|volume/i.test(String(name)));
        const area = names.find((name) => /surface_water_area/i.test(String(name))) || 'surface_water_area';
        return { name: storage || area, storage: Boolean(storage) };
      });
    }
    return reservoirVariablePromise;
  }

  function regionSearchPolygon(region) {
    const halfSpan = ({ Spain: 1.5, France: 1.4, Portugal: 1.0, Italy: 1.15, Greece: 1.1 }[region.country] || 1.2);
    const x1 = region.lon - halfSpan;
    const x2 = region.lon + halfSpan;
    const y1 = region.lat - halfSpan;
    const y2 = region.lat + halfSpan;
    return { type: 'Polygon', coordinates: [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]] };
  }

  function isoDateMonthsAgo(months) {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - months);
    return date.toISOString();
  }

  async function fetchReservoir(region) {
    const variable = await getReservoirVariable();
    const query = new URLSearchParams({
      agg_period: 'monthly',
      start: isoDateMonthsAgo(14),
      stop: new Date().toISOString(),
      limit: '50'
    });
    const response = await fetch(`${GWW_BASE}/reservoir/geometry/ts/${encodeURIComponent(variable.name)}?${query.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regionSearchPolygon(region))
    });
    if (!response.ok) throw new Error(`Global Water Watch request failed (${response.status})`);
    const payload = await response.json();
    const points = (payload.data || []).filter((item) => Number.isFinite(item?.value)).sort((a, b) => new Date(a.t) - new Date(b.t));
    if (!points.length) throw new Error('No monitored reservoir time series in this regional search area');
    const latest = points[points.length - 1];
    const values = points.map((item) => item.value);
    const max12m = Math.max(...values.slice(-12), 0);
    const relative = max12m > 0 ? clamp((latest.value / max12m) * 100, 0, 100) : null;
    const relativeTrend = max12m > 0 ? values.slice(-7).map((value) => clamp((value / max12m) * 100, 0, 100)) : [];
    return {
      variable: payload.variable_name || variable.name,
      unit: payload.variable_unit || '',
      latest: latest.value,
      timestamp: latest.t,
      relative,
      relativeTrend,
      storage: variable.storage || /m3|m³|storage|volume/i.test(`${payload.variable_name || ''} ${payload.variable_unit || ''}`)
    };
  }

  function formatReservoirValue(data) {
    if (!data || !Number.isFinite(data.latest)) return '—';
    if (data.storage) {
      if (data.latest >= 1e9) return `${(data.latest / 1e9).toFixed(2)} bn m³`;
      if (data.latest >= 1e6) return `${(data.latest / 1e6).toFixed(1)} Mm³`;
      return `${Math.round(data.latest).toLocaleString()} m³`;
    }
    const unit = String(data.unit || '').toLowerCase();
    if (unit.includes('m2') || unit.includes('m²')) return `${(data.latest / 1e6).toFixed(1)} km²`;
    return `${data.latest.toLocaleString(undefined, { maximumFractionDigits: 1 })}${data.unit ? ` ${data.unit}` : ''}`;
  }

  function irrigationAvailability({ reservoirRelative, soil, rainfall, et0 }) {
    const components = [];
    if (Number.isFinite(reservoirRelative)) components.push([reservoirRelative, 0.50]);
    if (Number.isFinite(soil)) components.push([clamp((soil / 0.35) * 100, 0, 100), 0.20]);
    if (Number.isFinite(rainfall)) components.push([clamp((rainfall / 35) * 100, 0, 100), 0.15]);
    if (Number.isFinite(et0)) components.push([100 - clamp((et0 / 7) * 100, 0, 100), 0.15]);
    if (!components.length) return null;
    const weight = components.reduce((total, item) => total + item[1], 0);
    return Math.round(components.reduce((total, item) => total + item[0] * item[1], 0) / weight);
  }

  function renderRainfallChart(regionName, precipitation, status) {
    const chart = $('#rainfall-chart');
    if (!chart) return;
    const values = (precipitation || []).slice(0, 7);
    const maxValue = Math.max(...values, 1);
    const colors = { red: '#c95d46', yellow: '#d49a2f', green: '#4f9563' };
    chart.style.setProperty('--chart-color', colors[status] || '#2b7a6f');
    chart.setAttribute('aria-label', `Live seven day precipitation forecast for ${regionName}`);
    chart.innerHTML = values.map((value, index) => `<div class="rainfall-column"><em>${Math.round(value || 0)}</em><b style="height:${Math.max(4, ((value || 0) / maxValue) * 92)}%"></b><span>Day ${index + 1}</span></div>`).join('');
  }

  function renderResourceChart(reservoirRelative, soil, irrigationScore) {
    const chart = $('#resource-chart');
    if (!chart) return;
    const items = [
      { label: 'Reservoir relative', value: reservoirRelative },
      { label: 'Soil moisture', value: Number.isFinite(soil) ? clamp((soil / 0.35) * 100, 0, 100) : null },
      { label: 'Irrigation estimate', value: irrigationScore }
    ];
    chart.innerHTML = items.map((item) => {
      const status = statusFromScore(item.value);
      const color = status.css === 'red' ? '#c95d46' : status.css === 'yellow' ? '#d49a2f' : '#4f9563';
      const width = Number.isFinite(item.value) ? clamp(item.value, 0, 100) : 0;
      return `<div class="resource-row"><span>${item.label}</span><div class="resource-track"><b style="width:${width}%;--bar-color:${color}"></b></div><strong>${Number.isFinite(item.value) ? `${Math.round(item.value)}%` : '—'}</strong></div>`;
    }).join('');
  }

  async function applyLiveRegion(region) {
    const source = $('#live-weather-source');
    if (source) { source.textContent = 'LOADING · Open-Meteo + GWW'; source.className = 'live-source loading'; }

    setText('#region-country', `${region.country.toUpperCase()} · LIVE API DATA`);
    setText('#region-summary', `${region.name} · live water & climate`);
    setText('#region-note', 'Weather and soil use Open-Meteo at the regional centroid. Reservoir availability uses Global Water Watch reservoir time series in the surrounding regional search area. Irrigation availability is an API-derived estimate, not an official legal allocation.');
    setText('#current-lens', `${region.name} · live APIs`);
    setText('#baseline-location', `${region.name} · ${region.country}`);

    let weather = null;
    let reservoir = null;
    const [weatherResult, reservoirResult] = await Promise.allSettled([fetchLiveWeather(region), fetchReservoir(region)]);
    if (weatherResult.status === 'fulfilled') weather = weatherResult.value;
    if (reservoirResult.status === 'fulfilled') reservoir = reservoirResult.value;

    const daily = weather?.daily || {};
    const hourly = weather?.hourly || {};
    const rainfall = weather ? sum(daily.precipitation_sum) : null;
    const et0 = weather ? mean(daily.et0_fao_evapotranspiration) : null;
    const maxTemps = weather ? (daily.temperature_2m_max || []).filter(Number.isFinite) : [];
    const maxTemp = maxTemps.length ? Math.max(...maxTemps) : null;
    const soil = weather ? mean((hourly.soil_moisture_0_to_7cm || []).slice(0, 24)) : null;
    const pressure = pressureFromWeather(et0, maxTemp);
    const rainfallStatus = statusFromScore(Number.isFinite(rainfall) ? clamp((rainfall / 35) * 100, 0, 100) : null);
    const soilStatus = statusFromScore(Number.isFinite(soil) ? clamp((soil / 0.35) * 100, 0, 100) : null);

    if (weather) {
      setText('#climate-rainfall', `${Math.round(rainfall)} mm`);
      setText('#rainfall-detail', 'Next 7 days · live Open-Meteo forecast');
      setText('#rainfall-total-label', `${Math.round(rainfall)} mm · live next 7 days`);
      if (Number.isFinite(et0)) {
        const proxy = clamp(et0 / 1.5, 1, 5);
        setText('#climate-drought', `${proxy.toFixed(1)} / 5`);
        setText('#drought-detail', `ET₀-based pressure proxy · ${et0.toFixed(1)} mm/day${Number.isFinite(maxTemp) ? ` · max ${Math.round(maxTemp)}°C` : ''}`);
      }
      if (Number.isFinite(soil)) {
        setText('#climate-soil', `${(soil * 100).toFixed(1)}%`);
        setText('#soil-detail', '0–7 cm volumetric soil water · next 24 h mean');
      }
      renderRainfallChart(region.name, daily.precipitation_sum, rainfallStatus.css);
    } else {
      setText('#climate-rainfall', '—');
      setText('#rainfall-detail', weatherResult.reason?.message || 'Open-Meteo unavailable');
      setText('#climate-drought', '—');
      setText('#drought-detail', 'Live ET₀ unavailable');
      setText('#climate-soil', '—');
      setText('#soil-detail', 'Live soil moisture unavailable');
    }

    if (reservoir) {
      setText('#climate-reservoir', Number.isFinite(reservoir.relative) ? `${Math.round(reservoir.relative)}% rel.` : formatReservoirValue(reservoir));
      const dateLabel = reservoir.timestamp ? new Date(reservoir.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'latest';
      setText('#reservoir-detail', `${reservoir.storage ? 'GWW storage' : 'GWW surface-area proxy'} · ${formatReservoirValue(reservoir)} · ${dateLabel} · relative to 12-month max`);
    } else {
      setText('#climate-reservoir', '—');
      setText('#reservoir-detail', reservoirResult.reason?.message || 'Global Water Watch reservoir data unavailable');
    }

    const irrigationScore = irrigationAvailability({ reservoirRelative: reservoir?.relative, soil, rainfall, et0 });
    const irrigationStatus = statusFromScore(irrigationScore);
    const reservoirStatus = statusFromScore(reservoir?.relative);
    setText('#climate-irrigation', Number.isFinite(irrigationScore) ? `${irrigationScore}% est.` : '—');
    setText('#irrigation-detail', Number.isFinite(irrigationScore)
      ? 'API-derived irrigation availability estimate · reservoir + soil + rainfall + ET₀ · not an official allocation'
      : 'Insufficient live API data for an irrigation availability estimate');

    const badge = $('#overall-status');
    if (badge) { badge.innerHTML = `<i></i>${pressure.label} climate pressure`; badge.className = `status-badge status-${pressure.css}`; }
    const resourceStatus = $('#resource-status');
    if (resourceStatus) { resourceStatus.textContent = irrigationStatus.label; resourceStatus.className = `chart-status-pill status-${irrigationStatus.css}`; }
    [
      ['#rainfall-card', rainfallStatus.css],
      ['#reservoir-card', reservoirStatus.css],
      ['#drought-card', pressure.css],
      ['#soil-card', soilStatus.css],
      ['#irrigation-card', irrigationStatus.css]
    ].forEach(([selector, css]) => {
      const card = $(selector);
      if (card) card.className = `climate-kpi status-${css}`;
    });
    renderResourceChart(reservoir?.relative, soil, irrigationScore);
    const sparkline = $('#water-sparkline');
    if (sparkline) {
      const colors = { red: '#c95d46', yellow: '#d49a2f', green: '#4f9563' };
      sparkline.style.setProperty('--spark-color', colors[reservoirStatus.css]);
      sparkline.innerHTML = (reservoir?.relativeTrend || []).map((value) => `<i style="height:${Math.max(8, value)}%"></i>`).join('');
    }

    const available = [weather ? 'Open-Meteo' : null, reservoir ? 'Global Water Watch' : null].filter(Boolean).join(' + ');
    if (source) {
      source.textContent = available ? `LIVE · ${available}` : 'LIVE API ERROR';
      source.className = available ? 'live-source live' : 'live-source fallback';
    }
    window.AQUACROP_DECISION?.applyLiveRegion(region, { weather, reservoir, irrigationScore, irrigationStatus, pressure });
  }

  async function initialiseRegionalClimate() {
    await loadScript('app-core.js');
    await loadScript('data/dashboard-regions-live.js');
    const regions = window.AQUACROP_LIVE_REGIONS || [];
    const select = $('#region-select');
    if (!select || !regions.length) return;
    select.innerHTML = regions.map((region) => `<option value="${region.id}">${region.name} · ${region.country}</option>`).join('');
    const defaultId = regions.some((region) => region.id === 'ES-AN') ? 'ES-AN' : regions[0].id;
    select.value = defaultId;
    select.addEventListener('change', (event) => {
      event.stopImmediatePropagation();
      const region = regions.find((item) => item.id === event.target.value);
      if (region) applyLiveRegion(region);
    }, true);
    const initial = regions.find((region) => region.id === defaultId);
    if (initial) await applyLiveRegion(initial);
  }

  initialiseRegionalClimate().catch((error) => console.error('Regional climate initialisation failed', error));
})();

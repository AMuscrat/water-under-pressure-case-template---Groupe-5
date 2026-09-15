(() => {
  'use strict';

  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

  const $ = (selector) => document.querySelector(selector);
  const setText = (selector, value) => {
    const el = $(selector);
    if (el) el.textContent = value;
  };

  const mean = (values) => {
    const clean = (values || []).filter((value) => Number.isFinite(value));
    return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null;
  };

  const sum = (values) => (values || []).filter((value) => Number.isFinite(value)).reduce((total, value) => total + value, 0);

  function pressureFromWeather(et0, maxTemp) {
    if (!Number.isFinite(et0) || !Number.isFinite(maxTemp)) return { label: 'Live', css: 'yellow' };
    if (et0 >= 6 || maxTemp >= 34) return { label: 'High', css: 'red' };
    if (et0 >= 4.5 || maxTemp >= 28) return { label: 'Watch', css: 'yellow' };
    return { label: 'Lower', css: 'green' };
  }

  async function fetchLive(region) {
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

  function renderRainfallChart(regionName, precipitation) {
    const chart = $('#rainfall-chart');
    if (!chart) return;
    const values = (precipitation || []).slice(0, 7);
    const maxValue = Math.max(...values, 1);
    chart.style.setProperty('--chart-color', '#2b7a6f');
    chart.setAttribute('aria-label', `Live seven day precipitation forecast for ${regionName}`);
    chart.innerHTML = values.map((value, index) => `
      <div class="rainfall-column">
        <em>${Math.round(value || 0)}</em>
        <b style="height:${Math.max(4, ((value || 0) / maxValue) * 92)}%"></b>
        <span>Day ${index + 1}</span>
      </div>`).join('');
  }

  function renderUnavailableResourceFields() {
    setText('#climate-reservoir', '—');
    setText('#reservoir-detail', 'No live reservoir API configured');
    setText('#climate-irrigation', '—');
    setText('#irrigation-detail', 'No live irrigation-allocation API configured');
    const resourceChart = $('#resource-chart');
    if (resourceChart) {
      resourceChart.innerHTML = '<div class="resource-row"><span>Live source coverage</span><div class="resource-track"><b style="width:100%;--bar-color:#2b7a6f"></b></div><strong>Weather + soil</strong></div>';
    }
  }

  async function applyLiveRegion(region) {
    const source = $('#live-weather-source');
    if (source) {
      source.textContent = 'LOADING · Open-Meteo';
      source.className = 'live-source loading';
    }

    setText('#region-country', `${region.country.toUpperCase()} · LIVE FORECAST`);
    setText('#region-summary', `${region.name} · live water & climate`);
    setText('#region-note', 'Weather and soil values are live Open-Meteo model output at the representative regional centroid. Reservoir and irrigation-allocation data are not supplied by this API.');
    setText('#current-lens', `${region.name} · live API`);
    setText('#baseline-location', `${region.name} · ${region.country}`);
    renderUnavailableResourceFields();

    try {
      const data = await fetchLive(region);
      const daily = data.daily || {};
      const hourly = data.hourly || {};
      const rainfall = sum(daily.precipitation_sum);
      const et0 = mean(daily.et0_fao_evapotranspiration);
      const maxTemps = (daily.temperature_2m_max || []).filter((value) => Number.isFinite(value));
      const maxTemp = maxTemps.length ? Math.max(...maxTemps) : null;
      const soil = mean((hourly.soil_moisture_0_to_7cm || []).slice(0, 24));
      const pressure = pressureFromWeather(et0, maxTemp);

      setText('#climate-rainfall', `${Math.round(rainfall)} mm`);
      setText('#rainfall-detail', 'Next 7 days · live forecast');
      setText('#rainfall-total-label', `${Math.round(rainfall)} mm · live next 7 days`);

      if (Number.isFinite(et0)) {
        const proxy = Math.min(5, Math.max(1, et0 / 1.5));
        setText('#climate-drought', `${proxy.toFixed(1)} / 5`);
        setText('#drought-detail', `ET₀-based pressure proxy · ${et0.toFixed(1)} mm/day${Number.isFinite(maxTemp) ? ` · max ${Math.round(maxTemp)}°C` : ''}`);
      } else {
        setText('#climate-drought', '—');
        setText('#drought-detail', 'ET₀ unavailable');
      }

      if (Number.isFinite(soil)) {
        setText('#climate-soil', `${(soil * 100).toFixed(1)}%`);
        setText('#soil-detail', '0–7 cm volumetric soil water · next 24 h mean');
      } else {
        setText('#climate-soil', '—');
        setText('#soil-detail', 'Live soil moisture unavailable');
      }

      const badge = $('#overall-status');
      if (badge) {
        badge.innerHTML = `<i></i>${pressure.label} climate pressure`;
        badge.className = `status-badge status-${pressure.css}`;
      }
      const resourceStatus = $('#resource-status');
      if (resourceStatus) {
        resourceStatus.textContent = 'API weather';
        resourceStatus.className = `chart-status-pill status-${pressure.css}`;
      }

      renderRainfallChart(region.name, daily.precipitation_sum);

      if (source) {
        source.textContent = 'LIVE · Open-Meteo';
        source.className = 'live-source live';
      }
    } catch (error) {
      console.warn('Live regional climate unavailable', error);
      setText('#region-note', `Live API unavailable for ${region.name}: ${error.message}`);
      setText('#climate-rainfall', '—');
      setText('#rainfall-detail', 'Live API unavailable');
      setText('#climate-drought', '—');
      setText('#drought-detail', 'Live API unavailable');
      setText('#climate-soil', '—');
      setText('#soil-detail', 'Live API unavailable');
      if (source) {
        source.textContent = 'LIVE API ERROR';
        source.className = 'live-source fallback';
      }
    }
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

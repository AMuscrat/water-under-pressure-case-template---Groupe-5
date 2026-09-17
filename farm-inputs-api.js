(() => {
  'use strict';

  const EUROSTAT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
  const OPEN_METEO_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
  const STORAGE_KEY = 'aquaCropFarmInputsApiV2';
  const GEO = { Spain: 'ES', France: 'FR', Portugal: 'PT', Italy: 'IT', Greece: 'EL' };
  const CROPS = [
    { id: 'wheat', name: 'Wheat', patterns: [/soft wheat/i, /common wheat/i, /wheat and spelt/i, /wheat/i], reject: [/seed/i] },
    { id: 'tomatoes', name: 'Tomatoes', patterns: [/tomatoes? in the open/i, /tomatoes?/i], reject: [/seed/i] },
    { id: 'olives', name: 'Olives', patterns: [/olives? for oil/i, /olives?/i], reject: [/olive oil/i, /oil/i] },
    { id: 'grapes', name: 'Grapes', patterns: [/grapes? for wine/i, /grapes?/i, /vineyards?/i], reject: [] },
    { id: 'rice', name: 'Rice', patterns: [/paddy rice/i, /^rice/i, /rice/i], reject: [/seed/i] }
  ];

  const cache = new Map();
  let refreshSerial = 0;
  const $ = (selector, root = document) => root.querySelector(selector);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value) => {
    if (value === null || value === undefined || value === '' || value === ':') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function injectStyles() {
    if (document.querySelector('link[data-farm-inputs-api]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'farm-inputs-api.css';
    link.dataset.farmInputsApi = 'true';
    document.head.appendChild(link);
  }

  function readState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        efficiency: stored.efficiency ?? '',
        method: stored.method ?? '',
        soil: stored.soil ?? '',
        seasonStart: stored.seasonStart ?? '',
        seasonEnd: stored.seasonEnd ?? '',
        crops: Array.isArray(stored.crops) && stored.crops.length ? stored.crops : CROPS.map((crop) => crop.id)
      };
    } catch {
      return { efficiency: '', method: '', soil: '', seasonStart: '', seasonEnd: '', crops: CROPS.map((crop) => crop.id) };
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function buildUI() {
    const farm = $('#farm-inputs');
    const panel = farm?.querySelector('.panel:first-child');
    const inputStack = panel?.querySelector('.input-stack');
    const footer = panel?.querySelector('.input-footer');
    if (!panel || !inputStack || $('#farm-api-extension')) return;

    const extension = document.createElement('div');
    extension.id = 'farm-api-extension';
    extension.className = 'farm-api-extension';
    extension.innerHTML = `
      <div class="farm-api-divider"><span>Additional crop comparison (reference only)</span><small>Independent Eurostat + Open-Meteo comparison · does not feed the water budget, crop options, or recommendation below</small></div>
      <div class="farm-api-field-grid">
        <label class="farm-api-field">
          <span>Irrigation efficiency</span>
          <div class="farm-api-input-with-unit"><input id="irrigation-efficiency" type="number" min="1" max="100" step="1" inputmode="decimal" placeholder="Enter efficiency"><b>%</b></div>
          <small>Used directly to convert API climate deficit into gross irrigation demand.</small>
        </label>
        <label class="farm-api-field">
          <span>Irrigation method</span>
          <select id="irrigation-method">
            <option value="">Choose method</option>
            <option value="drip">Drip</option>
            <option value="sprinkler">Sprinkler</option>
            <option value="surface">Surface / furrow</option>
            <option value="pivot">Center pivot / lateral</option>
            <option value="other">Other</option>
          </select>
          <small>Recorded as a farm characteristic; no hard-coded method coefficient is applied.</small>
        </label>
        <label class="farm-api-field">
          <span>Soil type</span>
          <select id="soil-type">
            <option value="">Choose soil type</option>
            <option value="sandy">Sandy</option>
            <option value="loam">Loam</option>
            <option value="clay">Clay</option>
            <option value="silty">Silty / silt loam</option>
            <option value="other">Other / mixed</option>
          </select>
          <small>User-entered because no dependable universal live soil-type API is used.</small>
        </label>
        <div class="farm-api-field farm-api-season">
          <span>Growing season</span>
          <div class="farm-api-date-pair">
            <label><small>Start</small><input id="season-start" type="date"></label>
            <label><small>End</small><input id="season-end" type="date"></label>
          </div>
          <small>Open-Meteo historical ET₀ and precipitation are matched to this seasonal window.</small>
        </div>
      </div>

      <fieldset class="crop-picker" id="crop-picker">
        <legend>Crop selection <small>Choose one or more</small></legend>
        <div class="crop-picker-grid">
          ${CROPS.map((crop) => `<label class="crop-choice"><input type="checkbox" value="${crop.id}" checked><span><b>${crop.name}</b><small>Eurostat + Open-Meteo</small></span></label>`).join('')}
        </div>
        <p id="crop-selection-error" class="farm-api-error" role="alert" hidden>Select at least one crop.</p>
      </fieldset>

      <div class="farm-api-results">
        <div class="farm-api-results-head">
          <div><span class="eyebrow">API CROP COMPARISON</span><h3>Compare selected crops using public data</h3></div>
          <span id="farm-api-status" class="farm-api-status">Waiting for inputs</span>
        </div>
        <div class="farm-api-summary" id="farm-api-summary">
          <article><span>Reference irrigation demand</span><strong>—</strong><small>Set efficiency + season</small></article>
          <article><span>Data geography</span><strong>—</strong><small>Select a dashboard region</small></article>
          <article><span>API coverage</span><strong>—</strong><small>Eurostat + Open-Meteo</small></article>
        </div>
        <div class="farm-api-table-wrap">
          <table class="farm-api-table">
            <thead><tr><th>Crop</th><th>Water requirement</th><th>Expected yield</th><th>Market value</th><th>Drought sensitivity proxy</th><th>Water productivity</th></tr></thead>
            <tbody id="farm-api-table-body"><tr><td colspan="6" class="farm-api-empty">Loading API metadata…</td></tr></tbody>
          </table>
        </div>
        <p class="farm-api-method-note" id="farm-api-method-note">Yield and farm-gate price come from Eurostat. Water requirement and water productivity are derived from Open-Meteo historical ET₀/precipitation plus Eurostat yield. Drought sensitivity is an API-derived historical proxy, not an agronomic calibration.</p>
      </div>`;

    if (footer) footer.insertAdjacentElement('beforebegin', extension);
    else inputStack.insertAdjacentElement('afterend', extension);
  }

  function restoreUI(state) {
    const efficiency = $('#irrigation-efficiency');
    const method = $('#irrigation-method');
    const soil = $('#soil-type');
    const start = $('#season-start');
    const end = $('#season-end');
    if (efficiency) efficiency.value = state.efficiency;
    if (method) method.value = state.method;
    if (soil) soil.value = state.soil;
    if (start) start.value = state.seasonStart;
    if (end) end.value = state.seasonEnd;
    document.querySelectorAll('#crop-picker input[type="checkbox"]').forEach((input) => { input.checked = state.crops.includes(input.value); });
  }

  function currentState() {
    return {
      efficiency: $('#irrigation-efficiency')?.value || '',
      method: $('#irrigation-method')?.value || '',
      soil: $('#soil-type')?.value || '',
      seasonStart: $('#season-start')?.value || '',
      seasonEnd: $('#season-end')?.value || '',
      crops: [...document.querySelectorAll('#crop-picker input[type="checkbox"]:checked')].map((input) => input.value)
    };
  }

  function selectedRegion() {
    const select = $('#region-select');
    const regions = window.AQUACROP_LIVE_REGIONS || [];
    return regions.find((region) => region.id === select?.value) || null;
  }

  function categoryIndex(category) {
    if (!category) return {};
    if (Array.isArray(category.index)) return Object.fromEntries(category.index.map((code, index) => [code, index]));
    return category.index || {};
  }

  function dimCodes(data, dim) {
    const category = data?.dimension?.[dim]?.category;
    const index = categoryIndex(category);
    return Object.entries(index).sort((a, b) => a[1] - b[1]).map(([code]) => code);
  }

  function dimLabels(data, dim) {
    return data?.dimension?.[dim]?.category?.label || {};
  }

  function valueAt(data, coordinates) {
    if (!data?.id || !data?.size) return null;
    let flat = 0;
    for (let i = 0; i < data.id.length; i += 1) {
      const dim = data.id[i];
      const index = categoryIndex(data.dimension?.[dim]?.category);
      const codes = dimCodes(data, dim);
      const code = coordinates[dim] ?? codes[0];
      const position = index[code];
      if (!Number.isInteger(position)) return null;
      flat = flat * data.size[i] + position;
    }
    const raw = Array.isArray(data.value) ? data.value[flat] : data.value?.[flat] ?? data.value?.[String(flat)];
    return finite(raw);
  }

  function bestCategory(data, dim, crop) {
    const labels = dimLabels(data, dim);
    const entries = Object.entries(labels);
    let best = null;
    for (const [code, label] of entries) {
      if (crop.reject?.some((pattern) => pattern.test(label))) continue;
      const rank = crop.patterns.findIndex((pattern) => pattern.test(label));
      if (rank < 0) continue;
      const score = crop.patterns.length - rank;
      if (!best || score > best.score || (score === best.score && String(label).length < best.label.length)) best = { code, label: String(label), score };
    }
    return best;
  }

  async function fetchJsonCached(key, url) {
    if (!cache.has(key)) {
      cache.set(key, fetch(url).then(async (response) => {
        if (!response.ok) throw new Error(`API request failed (${response.status})`);
        return response.json();
      }).catch((error) => { cache.delete(key); throw error; }));
    }
    return cache.get(key);
  }

  function normalizeYield(raw, year) {
    if (!Number.isFinite(raw)) return null;
    const y = Number(year);
    return y >= 2025 ? raw : raw * 0.1;
  }

  async function fetchEurostatYields(countryCode) {
    const url = `${EUROSTAT}/apro_cpsh1?lang=en&geo=${encodeURIComponent(countryCode)}&lastTimePeriod=10`;
    const data = await fetchJsonCached(`yield:${countryCode}`, url);
    const cropDim = data.id?.includes('crops') ? 'crops' : data.id?.find((dim) => /crop/i.test(data.dimension?.[dim]?.label || dim));
    const structureDim = data.id?.includes('strucpro') ? 'strucpro' : data.id?.find((dim) => /production structure|structure/i.test(data.dimension?.[dim]?.label || ''));
    const timeDim = data.id?.includes('time') ? 'time' : null;
    if (!cropDim || !structureDim || !timeDim) throw new Error('Eurostat crop-yield dimensions changed');
    const structureLabels = dimLabels(data, structureDim);
    const yieldEntry = Object.entries(structureLabels).find(([, label]) => /yield/i.test(label));
    if (!yieldEntry) throw new Error('Eurostat yield measure unavailable');
    const yieldCode = yieldEntry[0];
    const times = dimCodes(data, timeDim);
    const result = {};
    for (const crop of CROPS) {
      const matched = bestCategory(data, cropDim, crop);
      if (!matched) { result[crop.id] = { latest: null, history: [], sourceLabel: null }; continue; }
      const history = times.map((time) => {
        const value = valueAt(data, { [cropDim]: matched.code, [structureDim]: yieldCode, [timeDim]: time });
        return { year: Number(time), value: normalizeYield(value, time) };
      }).filter((item) => Number.isFinite(item.value));
      result[crop.id] = { latest: history.at(-1) || null, history, sourceLabel: matched.label };
    }
    return result;
  }

  function pricePerTonne(raw, productLabel) {
    if (!Number.isFinite(raw)) return null;
    const label = String(productLabel || '');
    if (/100\s*kg/i.test(label)) return raw * 10;
    if (/1\s*000\s*kg|1000\s*kg|tonne|per\s*t\b/i.test(label)) return raw;
    if (/per\s*kg\b/i.test(label)) return raw * 1000;
    return null;
  }

  async function fetchEurostatPrices(countryCode) {
    const url = `${EUROSTAT}/apri_ap_crpouta?lang=en&geo=${encodeURIComponent(countryCode)}&currency=EUR&lastTimePeriod=4`;
    const data = await fetchJsonCached(`price:${countryCode}`, url);
    const productDim = data.id?.includes('prod_veg') ? 'prod_veg' : data.id?.find((dim) => /product|vegetable/i.test(data.dimension?.[dim]?.label || dim));
    const timeDim = data.id?.includes('time') ? 'time' : null;
    if (!productDim || !timeDim) throw new Error('Eurostat crop-price dimensions changed');
    const times = dimCodes(data, timeDim);
    const result = {};
    for (const crop of CROPS) {
      const matched = bestCategory(data, productDim, crop);
      if (!matched) { result[crop.id] = { latest: null, sourceLabel: null }; continue; }
      let latest = null;
      for (const time of times) {
        const raw = valueAt(data, { [productDim]: matched.code, [timeDim]: time, currency: 'EUR' });
        if (Number.isFinite(raw)) latest = { year: Number(time), raw, perTonne: pricePerTonne(raw, matched.label) };
      }
      result[crop.id] = { latest, sourceLabel: matched.label };
    }
    return result;
  }

  function md(dateText) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText || '');
    return match ? { month: Number(match[2]), day: Number(match[3]) } : null;
  }

  function utcDate(year, month, day) {
    return new Date(Date.UTC(year, month - 1, day));
  }

  function iso(date) {
    return date.toISOString().slice(0, 10);
  }

  function buildSeasonYears(startText, endText, count = 8) {
    const startMD = md(startText);
    const endMD = md(endText);
    if (!startMD || !endMD) return null;
    const rawStart = new Date(`${startText}T00:00:00Z`);
    const rawEnd = new Date(`${endText}T00:00:00Z`);
    if (!(rawEnd > rawStart)) return null;
    const crossesYear = endMD.month < startMD.month || (endMD.month === startMD.month && endMD.day < startMD.day) || rawEnd.getUTCFullYear() > rawStart.getUTCFullYear();
    const today = new Date();
    let startYear = today.getUTCFullYear();
    while (utcDate(startYear + (crossesYear ? 1 : 0), endMD.month, endMD.day) >= today) startYear -= 1;
    const years = Array.from({ length: count }, (_, index) => startYear - (count - 1 - index));
    const seasons = years.map((year) => ({
      year,
      start: utcDate(year, startMD.month, startMD.day),
      end: utcDate(year + (crossesYear ? 1 : 0), endMD.month, endMD.day)
    }));
    return { seasons, start: seasons[0].start, end: seasons.at(-1).end };
  }

  async function fetchClimateHistory(region, startText, endText) {
    const seasonPack = buildSeasonYears(startText, endText, 8);
    if (!seasonPack) throw new Error('Choose a valid growing-season start and end date');
    const key = `climate:${region.id}:${startText.slice(5)}:${endText.slice(5)}`;
    const params = new URLSearchParams({
      latitude: String(region.lat),
      longitude: String(region.lon),
      start_date: iso(seasonPack.start),
      end_date: iso(seasonPack.end),
      daily: 'et0_fao_evapotranspiration,precipitation_sum',
      timezone: 'auto'
    });
    const data = await fetchJsonCached(key, `${OPEN_METEO_ARCHIVE}?${params.toString()}`);
    const times = data.daily?.time || [];
    const et0 = data.daily?.et0_fao_evapotranspiration || [];
    const precipitation = data.daily?.precipitation_sum || [];
    const rows = times.map((date, index) => ({ date, et0: finite(et0[index]), precipitation: finite(precipitation[index]) }));
    const byYear = {};
    for (const season of seasonPack.seasons) {
      const start = iso(season.start);
      const end = iso(season.end);
      let deficit = 0;
      let validDays = 0;
      for (const row of rows) {
        if (row.date < start || row.date > end || !Number.isFinite(row.et0) || !Number.isFinite(row.precipitation)) continue;
        deficit += Math.max(0, row.et0 - row.precipitation);
        validDays += 1;
      }
      if (validDays) byYear[season.year] = deficit;
    }
    const values = Object.values(byYear).filter(Number.isFinite);
    if (!values.length) throw new Error('Open-Meteo returned no historical seasonal values');
    return { averageDeficitMm: values.reduce((a, b) => a + b, 0) / values.length, byYear };
  }

  function pearson(pairs) {
    if (pairs.length < 3) return null;
    const xs = pairs.map((pair) => pair.x);
    const ys = pairs.map((pair) => pair.y);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const numerator = pairs.reduce((sum, pair) => sum + (pair.x - mx) * (pair.y - my), 0);
    const dx = Math.sqrt(xs.reduce((sum, x) => sum + (x - mx) ** 2, 0));
    const dy = Math.sqrt(ys.reduce((sum, y) => sum + (y - my) ** 2, 0));
    return dx && dy ? numerator / (dx * dy) : null;
  }

  function expectedYield(yieldData) {
    const values = (yieldData?.history || []).slice(-3).map((item) => item.value).filter(Number.isFinite);
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  function droughtProxy(yieldHistory, climateByYear) {
    const pairs = yieldHistory.map((item) => ({ x: climateByYear[item.year], y: item.value })).filter((pair) => Number.isFinite(pair.x) && Number.isFinite(pair.y));
    const correlation = pearson(pairs);
    if (Number.isFinite(correlation)) {
      const label = correlation <= -0.55 ? 'High' : correlation <= -0.25 ? 'Moderate' : 'Low';
      return { label, detail: `yield vs deficit r=${correlation.toFixed(2)}`, method: 'correlation' };
    }
    const values = yieldHistory.map((item) => item.value).filter(Number.isFinite);
    if (values.length >= 3) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const sd = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
      const cv = mean ? (sd / mean) * 100 : null;
      if (Number.isFinite(cv)) {
        const label = cv >= 20 ? 'High' : cv >= 10 ? 'Moderate' : 'Low';
        return { label, detail: `yield variability CV ${cv.toFixed(0)}%`, method: 'variability' };
      }
    }
    return null;
  }

  function formatNumber(value, digits = 1) {
    return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits }) : '—';
  }

  function unavailable(label = 'API unavailable') {
    return `<strong>—</strong><small>${esc(label)}</small>`;
  }

  function renderLoading(selectedCrops, message = 'Loading Eurostat + Open-Meteo…') {
    const body = $('#farm-api-table-body');
    if (body) body.innerHTML = `<tr><td colspan="6" class="farm-api-empty"><span class="farm-api-spinner"></span>${esc(message)}</td></tr>`;
    const status = $('#farm-api-status');
    if (status) { status.textContent = 'Loading APIs'; status.className = 'farm-api-status loading'; }
    const error = $('#crop-selection-error');
    if (error) error.hidden = selectedCrops.length > 0;
  }

  function renderComparison({ state, region, yields, prices, climate, errorMessages = [] }) {
    const selected = CROPS.filter((crop) => state.crops.includes(crop.id));
    const efficiency = finite(state.efficiency);
    const validEfficiency = Number.isFinite(efficiency) && efficiency > 0 && efficiency <= 100;
    const grossDemand = climate && validEfficiency ? climate.averageDeficitMm * 10 / (efficiency / 100) : null;
    const rows = selected.map((crop) => {
      const yieldData = yields?.[crop.id];
      const priceData = prices?.[crop.id];
      const yieldValue = expectedYield(yieldData);
      const pricePerT = priceData?.latest?.perTonne;
      const waterPerTonne = Number.isFinite(grossDemand) && Number.isFinite(yieldValue) && yieldValue > 0 ? grossDemand / yieldValue : null;
      const waterProductivity = Number.isFinite(grossDemand) && grossDemand > 0 && Number.isFinite(yieldValue) ? (yieldValue * 1000) / grossDemand : null;
      const marketValue = Number.isFinite(yieldValue) && Number.isFinite(pricePerT) ? yieldValue * pricePerT : null;
      const drought = climate ? droughtProxy(yieldData?.history || [], climate.byYear) : null;
      return `<tr>
        <th scope="row"><span class="crop-name-cell">${esc(crop.name)}</span><small>${esc(yieldData?.sourceLabel || 'Eurostat crop match')}</small></th>
        <td>${Number.isFinite(waterPerTonne) ? `<strong>${formatNumber(waterPerTonne, 0)} m³/t</strong><small>${formatNumber(grossDemand, 0)} m³/ha reference · API climate demand ÷ yield</small>` : unavailable(!validEfficiency ? 'Enter irrigation efficiency' : !climate ? 'Set a valid growing season' : 'Yield API unavailable')}</td>
        <td>${Number.isFinite(yieldValue) ? `<strong>${formatNumber(yieldValue, 1)} t/ha</strong><small>Eurostat 3-year mean${yieldData?.latest?.year ? ` · through ${yieldData.latest.year}` : ''}</small>` : unavailable('Eurostat yield unavailable')}</td>
        <td>${Number.isFinite(marketValue) ? `<strong>€${formatNumber(marketValue, 0)}/ha</strong><small>Eurostat farm-gate price · ${priceData.latest.year}</small>` : unavailable('Eurostat price/value unavailable')}</td>
        <td>${drought ? `<span class="farm-api-sensitivity ${drought.label.toLowerCase()}">${drought.label}</span><small>${esc(drought.detail)}</small>` : unavailable('Insufficient API history')}</td>
        <td>${Number.isFinite(waterProductivity) ? `<strong>${formatNumber(waterProductivity, 2)} kg/m³</strong><small>yield ÷ API water demand</small>` : unavailable(!validEfficiency ? 'Enter irrigation efficiency' : !climate ? 'Set a valid growing season' : 'Yield API unavailable')}</td>
      </tr>`;
    });
    const body = $('#farm-api-table-body');
    if (body) body.innerHTML = rows.join('') || '<tr><td colspan="6" class="farm-api-empty">Select at least one crop.</td></tr>';

    const summary = $('#farm-api-summary');
    const apiCropCount = selected.filter((crop) => Number.isFinite(expectedYield(yields?.[crop.id]))).length;
    if (summary) summary.innerHTML = `
      <article><span>Reference irrigation demand</span><strong>${Number.isFinite(grossDemand) ? `${formatNumber(grossDemand, 0)} m³/ha` : '—'}</strong><small>${Number.isFinite(grossDemand) ? `${formatNumber(climate.averageDeficitMm, 0)} mm seasonal deficit · ${efficiency}% efficiency` : 'Enter efficiency + valid season'}</small></article>
      <article><span>Data geography</span><strong>${esc(region ? region.name : '—')}</strong><small>${esc(region ? `${region.country} · climate at regional centroid · crop stats national` : 'Select a dashboard region')}</small></article>
      <article><span>API coverage</span><strong>${apiCropCount}/${selected.length || 0} crops</strong><small>${errorMessages.length ? esc(errorMessages.join(' · ')) : 'Eurostat yield/price + Open-Meteo climate'}</small></article>`;

    const status = $('#farm-api-status');
    if (status) {
      status.textContent = errorMessages.length ? 'Partial API coverage' : 'Live public APIs';
      status.className = `farm-api-status ${errorMessages.length ? 'partial' : 'ready'}`;
    }
    const error = $('#crop-selection-error');
    if (error) error.hidden = selected.length > 0;

    const area = finite($('#area')?.value);
    const availableWater = finite($('#water')?.value);
    window.aquaCropDecisionInput = {
      ...(window.aquaCropDecisionInput || {}),
      farm: {
        availableWaterM3: availableWater,
        farmAreaHa: area,
        irrigationEfficiencyPct: validEfficiency ? efficiency : null,
        irrigationMethod: state.method || null,
        soilType: state.soil || null,
        growingSeason: { start: state.seasonStart || null, end: state.seasonEnd || null },
        selectedCrops: selected.map((crop) => crop.id)
      },
      region: region ? { id: region.id, name: region.name, country: region.country, lat: region.lat, lon: region.lon } : null,
      cropComparison: selected.map((crop) => {
        const y = expectedYield(yields?.[crop.id]);
        const p = prices?.[crop.id]?.latest?.perTonne;
        const wp = Number.isFinite(grossDemand) && grossDemand > 0 && Number.isFinite(y) ? (y * 1000) / grossDemand : null;
        return {
          id: crop.id,
          name: crop.name,
          expectedYieldTPerHa: y ?? null,
          marketValueEurPerHa: Number.isFinite(y) && Number.isFinite(p) ? y * p : null,
          referenceWaterRequirementM3PerHa: grossDemand,
          waterRequirementM3PerTonne: Number.isFinite(grossDemand) && Number.isFinite(y) && y > 0 ? grossDemand / y : null,
          waterProductivityKgPerM3: wp,
          droughtSensitivityProxy: climate ? droughtProxy(yields?.[crop.id]?.history || [], climate.byYear) : null
        };
      })
    };
  }

  async function refresh() {
    const serial = ++refreshSerial;
    const state = currentState();
    saveState(state);
    const selected = CROPS.filter((crop) => state.crops.includes(crop.id));
    const region = selectedRegion();
    if (!selected.length) {
      renderComparison({ state, region, yields: {}, prices: {}, climate: null });
      return;
    }
    renderLoading(selected);
    if (!region || !GEO[region.country]) {
      renderComparison({ state, region, yields: {}, prices: {}, climate: null, errorMessages: ['Region API mapping unavailable'] });
      return;
    }

    const errors = [];
    const countryCode = GEO[region.country];
    const [yieldResult, priceResult] = await Promise.allSettled([fetchEurostatYields(countryCode), fetchEurostatPrices(countryCode)]);
    if (serial !== refreshSerial) return;
    const yields = yieldResult.status === 'fulfilled' ? yieldResult.value : {};
    const prices = priceResult.status === 'fulfilled' ? priceResult.value : {};
    if (yieldResult.status === 'rejected') errors.push('Eurostat yield unavailable');
    if (priceResult.status === 'rejected') errors.push('Eurostat price unavailable');

    let climate = null;
    const efficiency = finite(state.efficiency);
    if (state.seasonStart && state.seasonEnd && Number.isFinite(efficiency) && efficiency > 0 && efficiency <= 100) {
      try { climate = await fetchClimateHistory(region, state.seasonStart, state.seasonEnd); }
      catch (error) { errors.push(error.message || 'Open-Meteo history unavailable'); }
    }
    if (serial !== refreshSerial) return;
    renderComparison({ state, region, yields, prices, climate, errorMessages: errors });
  }

  function debounce(fn, delay = 350) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  }

  async function waitForDependencies() {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      if ($('#farm-inputs') && $('#region-select') && Array.isArray(window.AQUACROP_LIVE_REGIONS) && window.AQUACROP_LIVE_REGIONS.length) return true;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return false;
  }

  async function initialise() {
    injectStyles();
    if (!(await waitForDependencies())) throw new Error('Farm Inputs API dependencies did not load');
    buildUI();
    const state = readState();
    restoreUI(state);

    const delayedRefresh = debounce(refresh, 350);
    ['#irrigation-efficiency', '#irrigation-method', '#soil-type', '#season-start', '#season-end', '#water', '#area'].forEach((selector) => {
      const element = $(selector);
      element?.addEventListener('input', delayedRefresh);
      element?.addEventListener('change', refresh);
    });
    document.querySelectorAll('#crop-picker input[type="checkbox"]').forEach((input) => input.addEventListener('change', refresh));

    const baseline = $('#baseline-location');
    if (baseline) new MutationObserver(() => delayedRefresh()).observe(baseline, { childList: true, characterData: true, subtree: true });

    await refresh();
  }

  initialise().catch((error) => {
    console.error('Farm Inputs API module failed', error);
    const status = $('#farm-api-status');
    if (status) { status.textContent = 'API module error'; status.className = 'farm-api-status partial'; }
  });
})();

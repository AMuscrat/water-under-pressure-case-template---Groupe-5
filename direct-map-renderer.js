(() => {
  const D = window.PROVINCE_MAP_DATA || { countries: [], provinces: {} };
  const $ = (selector) => document.querySelector(selector);

  const meta = {
    wei: { title: 'Water scarcity · WEI+', cuts: [20, 40], labels: ['Lower', 'Stressed', 'Severe'] },
    drought: { title: 'Drought pressure', cuts: [40, 60], labels: ['Lower', 'Watch', 'High'] },
    rain: { title: 'Rainfall anomaly', cuts: [-10, -20], labels: ['Near normal', 'Dry', 'Very dry'], reverse: true },
    irrigated: { title: 'Irrigation exposure', cuts: [20, 40], labels: ['Lower', 'Medium', 'High'] }
  };

  const regionDefs = {
    iberia: { name: 'Iberia', description: 'Spain and Portugal', countries: ['ESP', 'PRT'], color: '#6fa99d' },
    'southern-france': { name: 'Southern France', description: 'Mediterranean France', countries: ['FRA'], color: '#7c9db8' },
    'italy-islands': { name: 'Italy & Islands', description: 'Italy and Malta', countries: ['ITA', 'MLT'], color: '#b593c5' },
    'balkans-greece': { name: 'Balkans & Greece', description: 'Albania and Greece', countries: ['ALB', 'GRC'], color: '#d1a25e' }
  };
  const isoToRegion = { ESP: 'iberia', PRT: 'iberia', FRA: 'southern-france', ITA: 'italy-islands', MLT: 'italy-islands', ALB: 'balkans-greece', GRC: 'balkans-greece' };
  const tracked = new Set(D.countries.map((country) => country.id));
  const state = { layer: 'wei', planningRegion: 'all', selected: null, features: [] };

  function obj(row, country) {
    return { id: row[0], name: row[1], country, wei: row[2], drought: row[3], rain: row[4], irrigated: row[5] };
  }
  function allProvinces() {
    return D.countries.flatMap((country) => (D.provinces[country.id] || []).map((row) => obj(row, country)));
  }
  function findProvince(id) {
    return allProvinces().find((item) => item.id === id) || null;
  }
  function countryAverage(iso) {
    const country = D.countries.find((item) => item.id === iso);
    const rows = (D.provinces[iso] || []).map((row) => obj(row, country));
    if (!rows.length) return null;
    return rows.reduce((acc, row) => {
      acc.wei += row.wei / rows.length;
      acc.drought += row.drought / rows.length;
      acc.rain += row.rain / rows.length;
      acc.irrigated += row.irrigated / rows.length;
      return acc;
    }, { wei: 0, drought: 0, rain: 0, irrigated: 0 });
  }
  function severity(value) {
    const m = meta[state.layer];
    if (m.reverse) return value <= m.cuts[1] ? 2 : value <= m.cuts[0] ? 1 : 0;
    return value >= m.cuts[1] ? 2 : value >= m.cuts[0] ? 1 : 0;
  }
  function colorFor(level) {
    return ['#9bc3aa', '#e8be62', '#cc6b53'][level];
  }
  function valueForCountry(iso) {
    const average = countryAverage(iso);
    if (!average) return 0;
    return state.layer === 'wei' ? average.wei : state.layer === 'drought' ? average.drought : state.layer === 'rain' ? average.rain : average.irrigated;
  }
  function setCountryOptions() {
    const select = $('#country');
    const allowed = state.planningRegion === 'all'
      ? D.countries
      : D.countries.filter((country) => regionDefs[state.planningRegion]?.countries.includes(country.id));
    select.innerHTML = allowed.map((country) => `<option value="${country.id}">${country.name}</option>`).join('');
    if (allowed.length) populateProvinces(allowed[0].id);
  }
  function populateProvinces(iso) {
    const select = $('#province');
    select.innerHTML = (D.provinces[iso] || []).map((row) => `<option value="${row[0]}">${row[1]}</option>`).join('');
  }
  function chooseProvince(id, historyAdd = true) {
    const province = findProvince(id);
    if (!province) return;
    state.selected = province;
    state.planningRegion = isoToRegion[province.country.id] || 'all';
    $('#planning-region').value = state.planningRegion;
    setCountryOptions();
    $('#country').value = province.country.id;
    populateProvinces(province.country.id);
    $('#province').value = province.id;
    renderDetail();
    renderMap();
    renderRegionStrip();
    if (historyAdd) addHistory(province);
  }
  function addHistory(province) {
    const key = province.id;
    const existing = JSON.parse(sessionStorage.getItem('aquacropMapHistory') || '[]').filter((item) => item.id !== key);
    existing.unshift({ id: province.id, name: province.name, country: province.country.name, wei: province.wei, drought: province.drought, rain: province.rain });
    sessionStorage.setItem('aquacropMapHistory', JSON.stringify(existing.slice(0, 6)));
    renderHistory();
  }
  function selectCountry(iso) {
    if (!tracked.has(iso)) {
      state.selected = null;
      renderDetail();
      renderMap();
      return;
    }
    const preferred = { ESP: 'ES-AN', ITA: 'IT-PUG', PRT: 'PT-ALG', FRA: 'FR-PACA', GRC: 'GR-PEL', ALB: 'AL-S', MLT: 'MT-M' }[iso];
    chooseProvince(preferred || (D.provinces[iso] || [])[0]?.[0]);
  }
  function setPlanningRegion(id) {
    state.planningRegion = id;
    state.selected = null;
    $('#planning-region').value = id;
    setCountryOptions();
    renderDetail();
    renderMap();
    renderRegionStrip();
  }
  function renderRegionStrip() {
    const container = $('#region-strip');
    if (!container) return;
    container.innerHTML = Object.entries(regionDefs).map(([id, region]) => `<button class="region-chip${state.planningRegion === id ? ' active' : ''}" data-region="${id}"><span class="region-dot" style="background:${region.color}"></span><strong>${region.name}</strong><span>${region.description} · ${region.countries.length} ${region.countries.length === 1 ? 'country' : 'countries'}</span></button>`).join('');
    container.querySelectorAll('.region-chip').forEach((button) => button.addEventListener('click', () => setPlanningRegion(button.dataset.region)));
  }
  function renderDetail() {
    const detail = $('#detail');
    if (!detail) return;
    if (!state.selected) {
      detail.innerHTML = '<span class="eyebrow">EUROPE CONTEXT</span><h2>Regional decision map</h2><p>Select a planning region or country. Real geography is shown for context, while water-pressure indicators are prototype values.</p><div class="decision-box"><span>Planning lens</span><strong>Southern Europe water pressure</strong><p>Four macro-regions help cooperatives compare climate and irrigation exposure at a decision-friendly level.</p></div>';
      return;
    }
    const p = state.selected;
    const score = severity(p[state.layer]);
    const region = regionDefs[isoToRegion[p.country.id]];
    const labels = meta[state.layer].labels;
    const decision = p.wei * 0.8 + p.drought * 0.45 + Math.max(0, -p.rain) * 0.35 + p.irrigated * 0.2;
    const advice = decision > 75
      ? ['Protect water first', 'Reduce high-water crop exposure, protect a larger reserve and prioritise irrigation on the highest-value blocks.']
      : decision > 52
        ? ['Rebalance the crop plan', 'Keep drought-tolerant crops as the anchor, tighten irrigation scheduling and preserve a contingency buffer.']
        : ['Maintain with monitoring', 'Current mock pressure is manageable. Keep a reserve, monitor rainfall and review the plan before peak summer demand.'];
    detail.innerHTML = `<span class="eyebrow">${region?.name || p.country.name} · ${p.country.name}</span><h2>${p.name}</h2><div class="region-country">Prototype decision evidence · mock indicators</div><span class="pressure-badge ${score === 2 ? 'severe' : score === 1 ? 'high' : 'watch'}">${labels[score]}</span><div class="detail-grid"><div class="detail-metric"><span>WEI+</span><strong>${p.wei}%</strong></div><div class="detail-metric"><span>Drought</span><strong>${p.drought}/100</strong></div><div class="detail-metric"><span>Rain anomaly</span><strong>${p.rain}%</strong></div><div class="detail-metric"><span>Irrigation exposure</span><strong>${p.irrigated}%</strong></div></div><div class="decision-box"><span>Decision implication</span><strong>${advice[0]}</strong><p>${advice[1]}</p></div>`;
  }
  function renderHistory() {
    const container = $('#history');
    if (!container) return;
    const history = JSON.parse(sessionStorage.getItem('aquacropMapHistory') || '[]');
    if (!history.length) {
      container.innerHTML = '<div class="history-empty">Select Southern European regions to build a comparison log.</div>';
      return;
    }
    container.innerHTML = history.map((item) => `<button class="history-card" data-id="${item.id}"><span>${item.country}</span><strong>${item.name}</strong><small>WEI+ ${item.wei}% · Drought ${item.drought}/100 · Rain ${item.rain}%</small></button>`).join('');
    container.querySelectorAll('.history-card').forEach((button) => button.addEventListener('click', () => chooseProvince(button.dataset.id, false)));
  }
  function renderLegend() {
    const legend = $('#legend');
    if (!legend) return;
    const labels = meta[state.layer].labels;
    legend.innerHTML = ['#9bc3aa', '#e8be62', '#cc6b53'].map((color, index) => `<span><i style="background:${color}"></i>${labels[index]}</span>`).join('') + '<span><i style="background:#e9efec"></i>Context only</span>';
    $('#hero-layer').textContent = state.planningRegion === 'all' ? meta[state.layer].title : `${regionDefs[state.planningRegion].name} · ${meta[state.layer].title}`;
  }
  function renderMap() {
    const target = $('#map');
    if (!target || !state.features.length) return;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'province-europe real-europe');
    svg.setAttribute('viewBox', '0 0 960 520');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Real geographic map of Europe divided into Southern European planning regions');

    const background = document.createElementNS(svgNS, 'rect');
    background.setAttribute('x', '0'); background.setAttribute('y', '0'); background.setAttribute('width', '960'); background.setAttribute('height', '520'); background.setAttribute('rx', '18'); background.setAttribute('fill', '#f7faf8');
    svg.appendChild(background);

    const title = document.createElementNS(svgNS, 'text');
    title.setAttribute('x', '34'); title.setAttribute('y', '40'); title.setAttribute('class', 'map-title'); title.textContent = 'EUROPE'; svg.appendChild(title);
    const subtitle = document.createElementNS(svgNS, 'text');
    subtitle.setAttribute('x', '34'); subtitle.setAttribute('y', '62'); subtitle.setAttribute('class', 'map-subtitle'); subtitle.textContent = 'Four planning regions · real country geography · prototype indicators'; svg.appendChild(subtitle);

    state.features.forEach((feature) => {
      const polygon = feature.cloneNode(true);
      polygon.removeAttribute('class');
      polygon.setAttribute('class', 'country-shape');
      const iso = polygon.getAttribute('data-iso') || '';
      const name = polygon.getAttribute('data-name') || 'Country';
      const regionId = isoToRegion[iso];
      const trackedCountry = tracked.has(iso);
      const allowed = state.planningRegion === 'all' || (regionId && regionId === state.planningRegion);
      const selectedIso = state.selected?.country.id === iso;
      polygon.setAttribute('fill', trackedCountry ? colorFor(severity(valueForCountry(iso))) : '#e9efec');
      polygon.setAttribute('opacity', state.planningRegion !== 'all' && !allowed && !selectedIso ? '0.28' : '1');
      if (selectedIso) polygon.classList.add('selected');
      polygon.addEventListener('click', () => selectCountry(iso));
      const tooltip = document.createElementNS(svgNS, 'title');
      tooltip.textContent = regionId ? `${name} · ${regionDefs[regionId].name}` : name;
      polygon.appendChild(tooltip);
      svg.appendChild(polygon);
    });

    const labels = [
      ['Iberia', 288, 436],
      ['Southern France', 384, 371],
      ['Italy & Islands', 519, 421],
      ['Balkans & Greece', 669, 437]
    ];
    labels.forEach(([text, x, y]) => {
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('class', 'region-label'); label.setAttribute('x', String(x)); label.setAttribute('y', String(y)); label.textContent = text; svg.appendChild(label);
    });

    target.replaceChildren(svg);
    renderLegend();
  }
  async function loadSvgFeatures() {
    const response = await fetch('europe-map.svg', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Europe map asset request failed (${response.status})`);
    const text = await response.text();
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const features = [...doc.querySelectorAll('polygon.country')];
    if (!features.length) throw new Error('No country polygons found in Europe map asset');
    state.features = features;
  }
  function bindControls() {
    $('#layer')?.addEventListener('change', (event) => { state.layer = event.target.value; renderDetail(); renderMap(); });
    $('#planning-region')?.addEventListener('change', (event) => setPlanningRegion(event.target.value));
    $('#country')?.addEventListener('change', (event) => { populateProvinces(event.target.value); const first = D.provinces[event.target.value]?.[0]; if (first) chooseProvince(first[0]); });
    $('#province')?.addEventListener('change', (event) => chooseProvince(event.target.value));
  }
  async function init() {
    try {
      setCountryOptions();
      bindControls();
      renderDetail();
      renderHistory();
      renderRegionStrip();
      await loadSvgFeatures();
      renderMap();
    } catch (error) {
      console.error(error);
      const target = $('#map');
      if (target) target.innerHTML = '<div class="map-loading">The local Europe map asset could not be rendered. Please reload the page.</div>';
    }
  }
  init();
})();

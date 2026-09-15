(() => {
  'use strict';

  const DATA = window.PROVINCE_MAP_DATA;
  const MAP_WIDTH = 960;
  const MAP_HEIGHT = 520;
  const VIEW = { minLon: -25, maxLon: 50, minLat: 34, maxLat: 72 };
  const TARGET_ISOS = new Set((DATA?.countries || []).map((country) => country.id));
  const $ = (selector) => document.querySelector(selector);

  const metricMeta = {
    wei: { title: 'Water scarcity · WEI+', unit: '%', cuts: [20, 40], labels: ['Lower', 'Stressed', 'Severe'] },
    drought: { title: 'Drought pressure', unit: '/100', cuts: [40, 60], labels: ['Lower', 'Watch', 'High'] },
    rain: { title: 'Rainfall anomaly', unit: '%', cuts: [-10, -20], labels: ['Near normal', 'Dry', 'Very dry'], reverse: true },
    irrigated: { title: 'Irrigation exposure', unit: '%', cuts: [20, 40], labels: ['Lower', 'Medium', 'High'] }
  };

  const planningRegions = {
    iberia: { name: 'Iberia', description: 'Spain and Portugal', countries: ['ESP', 'PRT'], color: '#6fa99d' },
    'southern-france': { name: 'Southern France', description: 'Mediterranean France', countries: ['FRA'], color: '#7c9db8' },
    'italy-islands': { name: 'Italy & Islands', description: 'Italy, Malta and the major islands', countries: ['ITA', 'MLT'], color: '#b593c5' },
    'balkans-greece': { name: 'Balkans & Greece', description: 'Albania and Greece', countries: ['ALB', 'GRC'], color: '#d1a25e' }
  };

  const countryToPlanningRegion = {
    ESP: 'iberia', PRT: 'iberia', FRA: 'southern-france', ITA: 'italy-islands',
    MLT: 'italy-islands', ALB: 'balkans-greece', GRC: 'balkans-greece'
  };

  const countryNameToIso = {
    spain: 'ESP', portugal: 'PRT', france: 'FRA', italy: 'ITA',
    malta: 'MLT', greece: 'GRC', albania: 'ALB'
  };

  // Representative centroids drive deterministic local planning zones. The zones
  // are clipped to the real country polygons bundled in europe-map.svg.
  const regionCentroids = {
    'ES-GA': [-8.2, 42.8], 'ES-CL': [-4.8, 41.7], 'ES-AR': [-0.7, 41.5],
    'ES-CT': [1.7, 41.8], 'ES-CM': [-3.0, 39.4], 'ES-EX': [-6.2, 39.0],
    'ES-AN': [-4.5, 37.5], 'ES-MU': [-1.4, 38.0], 'ES-VC': [-0.5, 39.5],
    'FR-BR': [-3.0, 48.2], 'FR-NO': [0.0, 49.0], 'FR-IDF': [2.4, 48.7],
    'FR-GE': [6.2, 48.4], 'FR-NA': [-0.5, 45.0], 'FR-AURA': [4.7, 45.4],
    'FR-OCC': [2.0, 43.8], 'FR-PACA': [6.5, 43.8],
    'PT-N': [-8.0, 41.5], 'PT-C': [-8.0, 40.2], 'PT-L': [-8.7, 39.0],
    'PT-A': [-7.8, 38.0], 'PT-ALG': [-8.0, 37.2],
    'IT-PIE': [7.5, 45.0], 'IT-LOM': [9.8, 45.5], 'IT-VEN': [12.1, 45.6],
    'IT-EMR': [11.0, 44.6], 'IT-TOS': [11.2, 43.3], 'IT-LAZ': [12.5, 41.9],
    'IT-PUG': [16.5, 41.0], 'IT-CAL': [16.5, 39.0], 'IT-SIC': [14.0, 37.5],
    'IT-SAR': [9.0, 40.0], 'MT-M': [14.45, 35.90], 'MT-G': [14.25, 36.05],
    'GR-MAC': [23.0, 40.6], 'GR-EPI': [20.7, 39.7], 'GR-TH': [22.2, 39.5],
    'GR-ATT': [23.7, 38.0], 'GR-WG': [21.3, 38.4], 'GR-PEL': [22.3, 37.3],
    'GR-CR': [24.8, 35.2], 'AL-N': [19.8, 42.0], 'AL-C': [19.8, 41.2],
    'AL-S': [20.2, 40.3]
  };

  let activeMetric = 'wei';
  let selectedRegion = null;
  let recentSelections = [];
  let activePlanningRegion = 'all';
  let countryPolygons = [];
  let mapLoading = true;
  let mapError = '';

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function toRegion(raw, country) {
    return { id: raw[0], name: raw[1], country, wei: raw[2], drought: raw[3], rain: raw[4], irrigated: raw[5] };
  }

  function allRegions() {
    return (DATA?.countries || []).flatMap((country) =>
      (DATA.provinces?.[country.id] || []).map((region) => toRegion(region, country))
    );
  }

  function regionsForCountry(countryId) {
    const country = (DATA?.countries || []).find((item) => item.id === countryId);
    if (!country) return [];
    return (DATA.provinces?.[countryId] || []).map((region) => toRegion(region, country));
  }

  function findRegion(regionId) {
    return allRegions().find((region) => region.id === regionId) || null;
  }

  function severity(region) {
    const meta = metricMeta[activeMetric];
    const value = region[activeMetric];
    if (meta.reverse) {
      if (value <= meta.cuts[1]) return 2;
      if (value <= meta.cuts[0]) return 1;
      return 0;
    }
    if (value >= meta.cuts[1]) return 2;
    if (value >= meta.cuts[0]) return 1;
    return 0;
  }

  function severityColor(level) {
    return ['#9bc3aa', '#e8be62', '#cc6b53'][level] || '#dfe9e5';
  }

  function advice(region) {
    const score = region.wei * 0.8 + region.drought * 0.45 + Math.max(0, -region.rain) * 0.35 + region.irrigated * 0.2;
    if (score > 75) return ['Protect water first', 'Reduce high-water crop exposure, protect a larger reserve and prioritise irrigation on the highest-value blocks.'];
    if (score > 52) return ['Rebalance the crop plan', 'Keep drought-tolerant crops as the anchor, tighten irrigation scheduling and preserve a contingency buffer.'];
    return ['Maintain with monitoring', 'Current mock pressure is manageable. Keep a reserve, monitor rainfall and review the plan before peak summer demand.'];
  }

  function project(lon, lat) {
    return {
      x: ((lon - VIEW.minLon) / (VIEW.maxLon - VIEW.minLon)) * MAP_WIDTH,
      y: ((VIEW.maxLat - lat) / (VIEW.maxLat - VIEW.minLat)) * MAP_HEIGHT
    };
  }

  function normalizeIso(rawIso, countryName) {
    const raw = String(rawIso || '').trim().toUpperCase();
    if (TARGET_ISOS.has(raw)) return raw;
    const byName = countryNameToIso[String(countryName || '').trim().toLowerCase()];
    return byName || raw || 'CTX';
  }

  function clipCellToBisector(polygon, point, other) {
    if (!polygon.length) return polygon;
    const dx = other.x - point.x;
    const dy = other.y - point.y;
    const midX = (point.x + other.x) / 2;
    const midY = (point.y + other.y) / 2;
    const signedDistance = (vertex) => (vertex.x - midX) * dx + (vertex.y - midY) * dy;
    const result = [];

    for (let index = 0; index < polygon.length; index += 1) {
      const current = polygon[index];
      const previous = polygon[(index + polygon.length - 1) % polygon.length];
      const currentDistance = signedDistance(current);
      const previousDistance = signedDistance(previous);
      const currentInside = currentDistance <= 0.0001;
      const previousInside = previousDistance <= 0.0001;

      if (currentInside !== previousInside) {
        const denominator = previousDistance - currentDistance;
        const ratio = Math.abs(denominator) < 1e-9 ? 0 : previousDistance / denominator;
        result.push({
          x: previous.x + (current.x - previous.x) * ratio,
          y: previous.y + (current.y - previous.y) * ratio
        });
      }
      if (currentInside) result.push(current);
    }
    return result;
  }

  function voronoiCell(points, selectedIndex) {
    let polygon = [
      { x: 0, y: 0 }, { x: MAP_WIDTH, y: 0 },
      { x: MAP_WIDTH, y: MAP_HEIGHT }, { x: 0, y: MAP_HEIGHT }
    ];
    points.forEach((other, index) => {
      if (index !== selectedIndex) polygon = clipCellToBisector(polygon, points[selectedIndex], other);
    });
    return polygon;
  }

  function polygonPoints(points) {
    return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  }

  function fallbackCountryShape(iso) {
    if (iso !== 'MLT') return '';
    const center = project(14.38, 35.95);
    return `<ellipse cx="${center.x.toFixed(2)}" cy="${center.y.toFixed(2)}" rx="5" ry="3.2" />`;
  }

  function renderClipPaths() {
    return [...TARGET_ISOS].map((iso) => {
      const shapes = countryPolygons
        .filter((polygon) => polygon.iso === iso)
        .map((polygon) => `<polygon points="${escapeHtml(polygon.points)}" />`)
        .join('');
      return `<clipPath id="country-clip-${iso}">${shapes || fallbackCountryShape(iso)}</clipPath>`;
    }).join('');
  }

  function renderFallbackCountryBase() {
    if (countryPolygons.some((polygon) => polygon.iso === 'MLT')) return '';
    const center = project(14.38, 35.95);
    return `<ellipse class="country-base tracked" data-country-id="MLT" cx="${center.x.toFixed(2)}" cy="${center.y.toFixed(2)}" rx="5" ry="3.2" fill="#dfe9e5"><title>Malta</title></ellipse>`;
  }

  function renderCountryBase() {
    const allowedCountries = activePlanningRegion === 'all' ? null : new Set(planningRegions[activePlanningRegion]?.countries || []);
    const selectedIso = selectedRegion?.country.id || null;
    return countryPolygons.map((polygon) => {
      const tracked = TARGET_ISOS.has(polygon.iso);
      const dimmed = allowedCountries && tracked && !allowedCountries.has(polygon.iso) && polygon.iso !== selectedIso;
      const fill = tracked ? '#dfe9e5' : '#edf2f0';
      const className = `country-base${tracked ? ' tracked' : ''}${dimmed ? ' dimmed' : ''}`;
      const countryAttr = tracked ? ` data-country-id="${polygon.iso}"` : '';
      return `<polygon class="${className}"${countryAttr} points="${escapeHtml(polygon.points)}" fill="${fill}"><title>${escapeHtml(polygon.name)}</title></polygon>`;
    }).join('') + renderFallbackCountryBase();
  }

  function renderRegionCells() {
    const allowedCountries = activePlanningRegion === 'all' ? null : new Set(planningRegions[activePlanningRegion]?.countries || []);
    return (DATA?.countries || []).map((country) => {
      const regions = regionsForCountry(country.id);
      if (!regions.length) return '';
      const points = regions.map((region, index) => {
        const lonLat = regionCentroids[region.id];
        if (lonLat) return project(lonLat[0], lonLat[1]);
        return { x: 120 + index * 18, y: 400 - index * 10 };
      });
      const countryDimmed = allowedCountries && !allowedCountries.has(country.id);
      const cells = regions.map((region, index) => {
        const cell = voronoiCell(points, index);
        const level = severity(region);
        const selected = selectedRegion?.id === region.id;
        const className = `region-cell severity-${level}${selected ? ' selected' : ''}${countryDimmed ? ' dimmed' : ''}`;
        return `<polygon class="${className}" data-region-id="${escapeHtml(region.id)}" points="${polygonPoints(cell)}" fill="${severityColor(level)}"><title>${escapeHtml(region.name)} · ${escapeHtml(country.name)} · ${escapeHtml(metricMeta[activeMetric].title)}: ${escapeHtml(region[activeMetric])}${escapeHtml(metricMeta[activeMetric].unit)}</title></polygon>`;
      }).join('');
      return `<g class="regional-zones" clip-path="url(#country-clip-${country.id})">${cells}</g>`;
    }).join('');
  }

  function renderCountryBorders() {
    const borders = countryPolygons.map((polygon) => {
      const tracked = TARGET_ISOS.has(polygon.iso);
      return `<polygon class="country-border${tracked ? ' tracked' : ''}" points="${escapeHtml(polygon.points)}" />`;
    }).join('');
    if (countryPolygons.some((polygon) => polygon.iso === 'MLT')) return borders;
    const center = project(14.38, 35.95);
    return borders + `<ellipse class="country-border tracked" cx="${center.x.toFixed(2)}" cy="${center.y.toFixed(2)}" rx="5" ry="3.2" />`;
  }

  function shortLabel(name) {
    const replacements = {
      'Castilla-La Mancha': 'C.-La Mancha', 'Castilla y Leon': 'C. y León',
      'Lisboa e Vale do Tejo': 'Lisboa/Tejo', 'Provence-Alpes-Cote d Azur': 'PACA',
      'Auvergne-Rhone-Alpes': 'A.-Rhône-Alpes', 'Central Macedonia': 'C. Macedonia',
      'Western Greece': 'W. Greece', 'Northern Albania': 'N. Albania',
      'Central Albania': 'C. Albania', 'Southern Albania': 'S. Albania',
      'Emilia-Romagna': 'Emilia-R.'
    };
    return replacements[name] || name;
  }

  function renderRegionLabels() {
    const focusedCountry = selectedRegion?.country.id || $('#country')?.value;
    if (!focusedCountry) return '';
    return regionsForCountry(focusedCountry).map((region) => {
      const lonLat = regionCentroids[region.id];
      if (!lonLat) return '';
      const point = project(lonLat[0], lonLat[1]);
      const selectedClass = selectedRegion?.id === region.id ? ' selected' : '';
      return `<text class="region-zone-label${selectedClass}" x="${point.x.toFixed(2)}" y="${point.y.toFixed(2)}">${escapeHtml(shortLabel(region.name))}</text>`;
    }).join('');
  }

  function renderMacroLabels() {
    if (activePlanningRegion !== 'all' || selectedRegion) return '';
    const labels = [
      ['IBERIA', -5.0, 40.0], ['SOUTHERN FRANCE', 3.0, 44.0],
      ['ITALY & ISLANDS', 12.0, 41.0], ['BALKANS & GREECE', 20.5, 40.0]
    ];
    return labels.map(([text, lon, lat]) => {
      const point = project(lon, lat);
      return `<text class="macro-region-label" x="${point.x.toFixed(2)}" y="${point.y.toFixed(2)}">${text}</text>`;
    }).join('');
  }

  function bindMapEvents() {
    document.querySelectorAll('.region-cell[data-region-id]').forEach((element) => {
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        selectRegion(element.dataset.regionId);
      });
      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') selectRegion(element.dataset.regionId);
      });
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
    });
    document.querySelectorAll('.country-base[data-country-id]').forEach((element) => {
      element.addEventListener('click', () => selectCountry(element.dataset.countryId));
    });
  }

  function renderMap() {
    const map = $('#map');
    if (!map) return;
    if (mapLoading) {
      map.innerHTML = '<div class="map-loading">Loading the local Europe map…</div>';
      return;
    }
    if (mapError || !countryPolygons.length) {
      map.innerHTML = `<div class="map-loading">${escapeHtml(mapError || 'The local Europe map could not be read.')}</div>`;
      return;
    }

    map.innerHTML = `
      <svg class="province-europe real-europe" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" role="img" aria-label="Europe map with named prototype subnational planning zones">
        <rect x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="18" fill="#f7faf8"></rect>
        <text x="34" y="40" class="map-title">EUROPE</text>
        <text x="34" y="62" class="map-subtitle">Local country geometry · clickable regional planning zones · prototype indicators</text>
        <defs>${renderClipPaths()}</defs>
        <g class="country-base-layer">${renderCountryBase()}</g>
        <g class="region-cell-layer">${renderRegionCells()}</g>
        <g class="country-border-layer">${renderCountryBorders()}</g>
        <g class="map-label-layer">${renderMacroLabels()}${renderRegionLabels()}</g>
      </svg>`;

    bindMapEvents();
    const heroLayer = $('#hero-layer');
    if (heroLayer) {
      heroLayer.textContent = activePlanningRegion === 'all'
        ? metricMeta[activeMetric].title
        : `${planningRegions[activePlanningRegion].name} · ${metricMeta[activeMetric].title}`;
    }
    const legend = $('#legend');
    if (legend) {
      legend.innerHTML = ['#9bc3aa', '#e8be62', '#cc6b53']
        .map((color, index) => `<span><i style="background:${color}"></i>${escapeHtml(metricMeta[activeMetric].labels[index])}</span>`)
        .join('') + '<span><i style="background:#edf2f0"></i>Context only</span>';
    }
  }

  function populateCountries(preferredCountryId) {
    const select = $('#country');
    if (!select) return;
    const allowed = activePlanningRegion === 'all'
      ? (DATA?.countries || [])
      : (DATA?.countries || []).filter((country) => planningRegions[activePlanningRegion]?.countries.includes(country.id));
    const desired = preferredCountryId && allowed.some((country) => country.id === preferredCountryId)
      ? preferredCountryId : allowed[0]?.id;
    select.innerHTML = allowed.map((country) => `<option value="${country.id}">${escapeHtml(country.name)}</option>`).join('');
    if (desired) select.value = desired;
    populateProvinces(desired);
  }

  function populateProvinces(countryId, preferredRegionId) {
    const select = $('#province');
    if (!select) return;
    const regions = DATA?.provinces?.[countryId] || [];
    select.innerHTML = regions.map((region) => `<option value="${escapeHtml(region[0])}">${escapeHtml(region[1])}</option>`).join('');
    if (preferredRegionId && regions.some((region) => region[0] === preferredRegionId)) select.value = preferredRegionId;
  }

  function selectRegion(regionId, addToHistory = true) {
    const region = findRegion(regionId);
    if (!region) return;
    selectedRegion = region;
    activePlanningRegion = countryToPlanningRegion[region.country.id] || 'all';
    const planningSelect = $('#planning-region');
    if (planningSelect) planningSelect.value = activePlanningRegion;
    populateCountries(region.country.id);
    populateProvinces(region.country.id, region.id);
    if (addToHistory) {
      recentSelections = recentSelections.filter((item) => item.id !== region.id);
      recentSelections.unshift(region);
      recentSelections = recentSelections.slice(0, 6);
    }
    renderDetail();
    renderHistory();
    renderRegionStrip();
    renderMap();
  }

  function selectCountry(countryId) {
    const firstRegion = regionsForCountry(countryId)[0];
    if (firstRegion) selectRegion(firstRegion.id);
  }

  function setPlanningRegion(regionId) {
    activePlanningRegion = regionId;
    selectedRegion = null;
    const select = $('#planning-region');
    if (select) select.value = regionId;
    populateCountries();
    renderDetail();
    renderRegionStrip();
    renderMap();
  }

  function renderDetail() {
    const detail = $('#detail');
    if (!detail) return;
    if (!selectedRegion) {
      detail.innerHTML = `
        <span class="eyebrow">EUROPE CONTEXT</span>
        <h2>Regional decision map</h2>
        <p>Select a planning region, country or internal zone. Country geometry is local; the named internal zones are deterministic prototype planning areas for the university project.</p>
        <div class="decision-box">
          <span>Planning lens</span><strong>Southern Europe water pressure</strong>
          <p>Use the map to compare climate and irrigation exposure without relying on an external map service.</p>
        </div>`;
      return;
    }

    const [title, description] = advice(selectedRegion);
    const level = severity(selectedRegion);
    const label = metricMeta[activeMetric].labels[level];
    const planningRegion = planningRegions[countryToPlanningRegion[selectedRegion.country.id]];
    detail.innerHTML = `
      <span class="eyebrow">${escapeHtml(planningRegion?.name || selectedRegion.country.name)} · ${escapeHtml(selectedRegion.country.name)}</span>
      <h2>${escapeHtml(selectedRegion.name)}</h2>
      <div class="region-country">Prototype decision evidence · mock indicators</div>
      <span class="pressure-badge ${level === 2 ? 'severe' : level === 1 ? 'high' : 'watch'}">${escapeHtml(label)}</span>
      <div class="detail-grid">
        <div class="detail-metric"><span>WEI+</span><strong>${selectedRegion.wei}%</strong></div>
        <div class="detail-metric"><span>Drought</span><strong>${selectedRegion.drought}/100</strong></div>
        <div class="detail-metric"><span>Rain anomaly</span><strong>${selectedRegion.rain}%</strong></div>
        <div class="detail-metric"><span>Irrigation exposure</span><strong>${selectedRegion.irrigated}%</strong></div>
      </div>
      <div class="decision-box"><span>Decision implication</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div>`;
  }

  function renderHistory() {
    const history = $('#history');
    if (!history) return;
    if (!recentSelections.length) {
      history.innerHTML = '<div class="history-empty">Select Southern European regions to build a comparison log.</div>';
      return;
    }
    history.innerHTML = recentSelections.map((region) => `
      <button class="history-card" data-history-id="${escapeHtml(region.id)}">
        <span>${escapeHtml(planningRegions[countryToPlanningRegion[region.country.id]]?.name || region.country.name)}</span>
        <strong>${escapeHtml(region.name)}</strong>
        <small>WEI+ ${region.wei}% · Drought ${region.drought}/100 · Rain ${region.rain}%</small>
      </button>`).join('');
    document.querySelectorAll('[data-history-id]').forEach((button) => {
      button.addEventListener('click', () => selectRegion(button.dataset.historyId, false));
    });
  }

  function renderRegionStrip() {
    const strip = $('#region-strip');
    if (!strip) return;
    strip.innerHTML = Object.entries(planningRegions).map(([id, region]) => `
      <button class="region-chip${activePlanningRegion === id ? ' active' : ''}" data-planning-region="${id}">
        <span class="region-dot" style="background:${region.color}"></span>
        <strong>${escapeHtml(region.name)}</strong>
        <span>${escapeHtml(region.description)} · ${region.countries.length} ${region.countries.length === 1 ? 'country' : 'countries'}</span>
      </button>`).join('');
    document.querySelectorAll('[data-planning-region]').forEach((button) => {
      button.addEventListener('click', () => setPlanningRegion(button.dataset.planningRegion));
    });
  }

  function ensureStyles() {
    if (document.getElementById('regional-map-final-styles')) return;
    const style = document.createElement('style');
    style.id = 'regional-map-final-styles';
    style.textContent = `
      #map{position:relative}
      .country-base{stroke:#b8cac5;stroke-width:.65;vector-effect:non-scaling-stroke;transition:opacity .15s}
      .country-base.tracked{cursor:pointer;stroke:#62817a;stroke-width:.9}
      .country-base.dimmed{opacity:.3}
      .country-border{fill:none;stroke:#9ab0aa;stroke-width:.65;vector-effect:non-scaling-stroke;pointer-events:none}
      .country-border.tracked{stroke:#315b54;stroke-width:1.35}
      .region-cell{stroke:rgba(255,255,255,.92);stroke-width:1.25;vector-effect:non-scaling-stroke;cursor:pointer;transition:opacity .15s,filter .15s,stroke-width .15s}
      .region-cell:hover,.region-cell:focus{filter:brightness(.95);stroke:#173f39;stroke-width:2;outline:none}
      .region-cell.selected{stroke:#102f2b;stroke-width:2.6;filter:brightness(.93)}
      .region-cell.dimmed{opacity:.18;pointer-events:none}
      .region-zone-label{font-size:8.5px;font-weight:750;fill:#214d46;text-anchor:middle;pointer-events:none;paint-order:stroke;stroke:#f7faf8;stroke-width:3px;stroke-linejoin:round}
      .region-zone-label.selected{font-size:10px;font-weight:900;fill:#102f2b}
      .macro-region-label{font-size:12px;font-weight:900;letter-spacing:.07em;fill:#365f58;text-anchor:middle;pointer-events:none;paint-order:stroke;stroke:#f7faf8;stroke-width:4px;opacity:.82}
    `;
    document.head.appendChild(style);
  }

  async function loadLocalEuropeMap() {
    mapLoading = true;
    renderMap();
    try {
      const response = await fetch('europe-map.svg', { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Local map request failed (${response.status})`);
      const source = await response.text();
      const documentSvg = new DOMParser().parseFromString(source, 'image/svg+xml');
      if (documentSvg.querySelector('parsererror')) throw new Error('Local map SVG is not valid XML');
      countryPolygons = [...documentSvg.querySelectorAll('polygon.country')]
        .map((polygon) => {
          const name = polygon.getAttribute('data-name') || 'Country';
          return {
            iso: normalizeIso(polygon.getAttribute('data-iso'), name),
            name,
            points: (polygon.getAttribute('points') || '').trim()
          };
        })
        .filter((polygon) => polygon.points);
      if (!countryPolygons.length) throw new Error('No country polygons were found in europe-map.svg');
      mapError = '';
    } catch (error) {
      console.error('Local Europe map failed to load', error);
      mapError = 'The bundled Europe map could not be loaded. Reload the page or verify europe-map.svg is present.';
      countryPolygons = [];
    } finally {
      mapLoading = false;
      renderMap();
    }
  }

  function initialise() {
    if (!DATA?.countries || !DATA?.provinces) {
      const map = $('#map');
      if (map) map.innerHTML = '<div class="map-loading">Regional map data is unavailable.</div>';
      return;
    }
    ensureStyles();
    populateCountries('ESP');
    renderDetail();
    renderHistory();
    renderRegionStrip();

    $('#layer')?.addEventListener('change', (event) => {
      activeMetric = event.target.value;
      renderDetail();
      renderMap();
    });
    $('#planning-region')?.addEventListener('change', (event) => setPlanningRegion(event.target.value));
    $('#country')?.addEventListener('change', (event) => selectCountry(event.target.value));
    $('#province')?.addEventListener('change', (event) => selectRegion(event.target.value));

    loadLocalEuropeMap();
  }

  initialise();
})();

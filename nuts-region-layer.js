(() => {
  const DATA_URL = 'data/nuts2-southern-europe.json';
  const VIEW = { minLon: -25, maxLon: 42, minLat: 35, maxLat: 72, width: 960, height: 520 };
  const TARGET = new Set(['ES', 'PT', 'FR', 'IT', 'EL', 'AL', 'MT']);
  const COLORS = { low: '#9bc3aa', medium: '#e8be62', high: '#cc6b53', context: '#eef3f1' };
  const layerMeta = {
    wei: { key: 'wei', title: 'Water scarcity · WEI+', cuts: [20, 40], labels: ['Lower', 'Stressed', 'Severe'] },
    drought: { key: 'drought', title: 'Drought pressure', cuts: [40, 60], labels: ['Lower', 'Watch', 'High'] },
    rain: { key: 'rain', title: 'Rainfall anomaly', cuts: [-10, -20], labels: ['Near normal', 'Dry', 'Very dry'], reverse: true },
    irrigated: { key: 'irrigated', title: 'Irrigation exposure', cuts: [20, 40], labels: ['Lower', 'Medium', 'High'] }
  };

  const macroRegions = {
    iberia: { name: 'Iberia', countries: ['ES', 'PT'] },
    'southern-france': { name: 'Southern France', countries: ['FR'] },
    'italy-islands': { name: 'Italy & Islands', countries: ['IT', 'MT'] },
    'balkans-greece': { name: 'Balkans & Greece', countries: ['EL', 'AL'] }
  };
  const isoToMacro = { ES: 'iberia', PT: 'iberia', FR: 'southern-france', IT: 'italy-islands', MT: 'italy-islands', EL: 'balkans-greece', AL: 'balkans-greece' };

  const mockRows = {
    ES11: [18, 39, -7, 18], ES41: [22, 45, -9, 25], ES24: [29, 54, -14, 39], ES51: [31, 59, -15, 35], ES42: [34, 63, -18, 43], ES43: [32, 61, -17, 40], ES61: [41, 74, -23, 52], ES62: [48, 82, -27, 72], ES52: [43, 70, -21, 55],
    PT11: [10, 29, -5, 7], PT19: [18, 43, -10, 12], PT1A: [24, 51, -13, 16], PT1C: [30, 61, -19, 20], PT15: [37, 69, -22, 26],
    FRH0: [8, 22, 2, 8], FRD1: [9, 24, 1, 7], FRD2: [9, 24, 1, 7], FR10: [12, 30, -3, 6], FRF1: [14, 33, -5, 9], FRF2: [14, 33, -5, 9], FRF3: [14, 33, -5, 9], FRI1: [19, 41, -9, 16], FRI2: [19, 41, -9, 16], FRI3: [19, 41, -9, 16], FRK1: [18, 39, -7, 13], FRK2: [18, 39, -7, 13], FRJ1: [26, 52, -13, 22], FRJ2: [26, 52, -13, 22], FRL0: [32, 61, -17, 25],
    ITC1: [15, 35, -6, 14], ITC4: [19, 42, -8, 18], ITH3: [20, 44, -9, 20], ITH5: [24, 49, -11, 24], ITI1: [23, 47, -10, 21], ITI4: [27, 53, -13, 25], ITF4: [38, 63, -16, 42], ITF6: [31, 58, -15, 29], ITG1: [40, 72, -23, 38], ITG2: [34, 62, -18, 31],
    EL52: [27, 57, -15, 27], EL54: [14, 31, -5, 11], EL61: [33, 65, -19, 31], EL30: [31, 62, -17, 12], EL63: [24, 46, -11, 19], EL65: [29, 59, -16, 25], EL43: [36, 73, -24, 33], EL51: [31, 60, -12, 29], EL62: [28, 55, -11, 25], EL64: [29, 58, -12, 28], EL41: [23, 49, -9, 20], EL42: [27, 53, -10, 23],
    AL01: [16, 35, -6, 13], AL02: [21, 44, -10, 18], AL03: [28, 55, -14, 24],
    MT00: [68, 73, -25, 7]
  };

  const project = (lon, lat) => [
    ((lon - VIEW.minLon) / (VIEW.maxLon - VIEW.minLon)) * VIEW.width,
    ((VIEW.maxLat - lat) / (VIEW.maxLat - VIEW.minLat)) * VIEW.height
  ];
  const ringPath = (ring) => ring.map((point, index) => {
    const [x, y] = project(Number(point[0]), Number(point[1]));
    return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ') + ' Z';
  const geometryPath = (geometry) => {
    if (!geometry) return '';
    if (geometry.type === 'Polygon') return geometry.coordinates.map(ringPath).join(' ');
    if (geometry.type === 'MultiPolygon') return geometry.coordinates.map((polygon) => polygon.map(ringPath).join(' ')).join(' ');
    return '';
  };
  const valueFor = (id, key) => {
    const row = mockRows[id];
    if (!row) return null;
    return key === 'wei' ? row[0] : key === 'drought' ? row[1] : key === 'rain' ? row[2] : row[3];
  };
  const severity = (value, layer) => {
    if (value == null) return -1;
    const m = layerMeta[layer] || layerMeta.wei;
    if (m.reverse) return value <= m.cuts[1] ? 2 : value <= m.cuts[0] ? 1 : 0;
    return value >= m.cuts[1] ? 2 : value >= m.cuts[0] ? 1 : 0;
  };
  const getCountry = (feature) => String(feature?.properties?.id || feature?.properties?.NUTS_ID || '').slice(0, 2);
  const getId = (feature) => String(feature?.properties?.id || feature?.properties?.NUTS_ID || '');
  const getName = (feature) => feature?.properties?.na || feature?.properties?.NAME_LATN || feature?.properties?.name || 'Region';
  const escape = (value) => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

  const currentLayer = () => document.querySelector('#layer')?.value || 'wei';
  const currentMacro = () => document.querySelector('#planning-region')?.value || 'all';

  function showDetail(feature) {
    const detail = document.querySelector('#detail');
    if (!detail) return;
    const id = getId(feature);
    const country = getCountry(feature);
    const macro = macroRegions[isoToMacro[country]];
    const layer = currentLayer();
    const value = valueFor(id, layer);
    const m = layerMeta[layer] || layerMeta.wei;
    const level = severity(value, layer);
    const status = value == null ? 'Context only' : m.labels[level];
    const mock = mockRows[id] ? `<div class="detail-grid"><div class="detail-metric"><span>WEI+</span><strong>${mockRows[id][0]}%</strong></div><div class="detail-metric"><span>Drought</span><strong>${mockRows[id][1]}/100</strong></div><div class="detail-metric"><span>Rain anomaly</span><strong>${mockRows[id][2]}%</strong></div><div class="detail-metric"><span>Irrigation</span><strong>${mockRows[id][3]}%</strong></div></div>` : '<div class="decision-box"><span>Indicator coverage</span><strong>Geography only</strong><p>This region is shown on the map, but the prototype indicator set does not assign a separate mock value here yet.</p></div>';
    detail.innerHTML = `<span class="eyebrow">${escape(macro?.name || country)} · ${escape(country)}</span><h2>${escape(getName(feature))}</h2><div class="region-country">NUTS 2 geography · local deployment data · prototype indicators</div><span class="pressure-badge ${level === 2 ? 'severe' : level === 1 ? 'high' : 'watch'}">${escape(status)}</span>${mock}<div class="decision-box"><span>Map layer</span><strong>${escape(m.title)}</strong><p>Click another region to compare. Four Southern European planning groups remain available in the filter above.</p></div>`;
  }

  function draw(features) {
    const map = document.querySelector('#map');
    const svg = map?.querySelector('svg.real-europe');
    if (!map || !svg) return false;
    const old = svg.querySelector('.nuts-static-layer');
    if (old) old.remove();
    const oldOutline = svg.querySelector('.nuts-country-outline-layer');
    if (oldOutline) oldOutline.remove();
    const layerName = currentLayer();
    const macro = currentMacro();

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'nuts-static-layer');
    group.setAttribute('aria-label', 'NUTS 2 regional map');

    features.forEach((feature) => {
      const id = getId(feature);
      const country = getCountry(feature);
      if (!TARGET.has(country)) return;
      const d = geometryPath(feature.geometry);
      if (!d) return;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const value = valueFor(id, layerName);
      const level = severity(value, layerName);
      const selected = document.querySelector('#province')?.value === id;
      const allowed = macro === 'all' || isoToMacro[country] === macro;
      path.setAttribute('d', d);
      path.setAttribute('class', 'nuts-region-shape' + (selected ? ' selected' : ''));
      path.setAttribute('fill', value == null ? COLORS.context : [COLORS.low, COLORS.medium, COLORS.high][level]);
      path.setAttribute('fill-opacity', allowed ? '0.78' : '0.14');
      path.dataset.nutsId = id;
      path.dataset.country = country;
      path.dataset.regionName = getName(feature);
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${getName(feature)} · ${country}`;
      path.appendChild(title);
      path.addEventListener('mouseenter', () => path.classList.add('hovered'));
      path.addEventListener('mouseleave', () => path.classList.remove('hovered'));
      path.addEventListener('click', () => showDetail(feature));
      group.appendChild(path);
    });
    svg.appendChild(group);

    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    outline.setAttribute('class', 'nuts-country-outline-layer');
    svg.querySelectorAll('.country-shape').forEach((countryPath) => {
      const copy = countryPath.cloneNode(false);
      copy.removeAttribute('data-name');
      copy.removeAttribute('data-iso');
      copy.setAttribute('fill', 'none');
      copy.setAttribute('stroke', '#234d47');
      copy.setAttribute('stroke-width', '1.35');
      copy.setAttribute('pointer-events', 'none');
      copy.removeAttribute('class');
      outline.appendChild(copy);
    });
    svg.appendChild(outline);
    return true;
  }

  function ensureStyles() {
    if (document.getElementById('nuts-static-style')) return;
    const style = document.createElement('style');
    style.id = 'nuts-static-style';
    style.textContent = `
      .nuts-static-layer .nuts-region-shape{stroke:#4d7770;stroke-width:.75;vector-effect:non-scaling-stroke;cursor:pointer;transition:fill .15s,fill-opacity .15s,stroke-width .15s,filter .15s}
      .nuts-static-layer .nuts-region-shape:hover,.nuts-static-layer .nuts-region-shape.hovered{stroke:#133c36;stroke-width:1.6;filter:brightness(.98)}
      .nuts-static-layer .nuts-region-shape.selected{stroke:#0f342f;stroke-width:2}
      .nuts-country-outline-layer{pointer-events:none}
      .nuts-layer-note{position:absolute;right:16px;top:16px;padding:6px 10px;border:1px solid #d3e2dd;border-radius:999px;background:rgba(255,255,255,.94);font-size:10px;font-weight:800;letter-spacing:.07em;color:#315b54}
      .nuts-layer-note strong{font-weight:900}
    `;
    document.head.appendChild(style);
  }

  function update() {
    const data = window.__AQUACROP_NUTS_FEATURES__;
    if (data?.features) draw(data.features);
  }

  async function init() {
    ensureStyles();
    try {
      if (!window.__AQUACROP_NUTS_FEATURES__) {
        const response = await fetch(DATA_URL, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`Regional data request failed (${response.status})`);
        window.__AQUACROP_NUTS_FEATURES__ = await response.json();
      }
      const retry = () => {
        if (!draw(window.__AQUACROP_NUTS_FEATURES__.features || [])) window.setTimeout(retry, 200);
      };
      retry();
      document.querySelector('#layer')?.addEventListener('change', update);
      document.querySelector('#planning-region')?.addEventListener('change', update);
      document.querySelector('#country')?.addEventListener('change', update);
      document.querySelector('#province')?.addEventListener('change', update);
    } catch (error) {
      console.warn('NUTS regional layer unavailable', error);
    }
  }

  init();
})();

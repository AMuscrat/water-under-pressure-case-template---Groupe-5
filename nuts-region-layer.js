(() => {
  const NUTS2_URL = 'https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_60M_2024_4326_LEVL_2.geojson';
  const NUTS3_URL = 'https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_60M_2024_4326_LEVL_3.geojson';
  const TARGET = new Set(['ES', 'PT', 'FR', 'IT', 'EL', 'AL', 'MT']);
  const VIEW = { minLon: -25, maxLon: 42, minLat: 35, maxLat: 72, width: 960, height: 520 };
  const styleText = `
    .nuts-region-layer path{fill:rgba(255,255,255,.04);stroke:#2d5e56;stroke-width:.85;vector-effect:non-scaling-stroke;cursor:pointer;transition:fill .16s,stroke-width .16s,stroke .16s}
    .nuts-region-layer path:hover{fill:rgba(255,255,255,.22);stroke:#123b37;stroke-width:1.8}
    .nuts-region-label{font-size:8px;font-weight:700;fill:#294f49;pointer-events:none;text-anchor:middle;paint-order:stroke;stroke:#f7faf8;stroke-width:3px;stroke-linejoin:round}
    .nuts-layer-note{position:absolute;right:16px;top:16px;padding:6px 9px;border:1px solid #d3e2dd;border-radius:999px;background:rgba(255,255,255,.92);font-size:10px;font-weight:700;letter-spacing:.06em;color:#315b54}
    .nuts-layer-warning{position:absolute;right:16px;bottom:16px;padding:7px 9px;border-radius:8px;background:rgba(255,248,239,.96);border:1px solid #ead5b3;color:#7a5a2b;font-size:10px;max-width:240px}
    #map{position:relative}
  `;
  const ensureStyles = () => {
    if (document.getElementById('nuts-region-layer-style')) return;
    const style = document.createElement('style');
    style.id = 'nuts-region-layer-style';
    style.textContent = styleText;
    document.head.appendChild(style);
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
  const featureCountry = (feature) => String(feature?.properties?.id || feature?.properties?.NUTS_ID || '').slice(0, 2);
  const featureCode = (feature) => String(feature?.properties?.id || feature?.properties?.NUTS_ID || '');
  const featureName = (feature) => feature?.properties?.na || feature?.properties?.NAME_LATN || feature?.properties?.NAME_ENGL || feature?.properties?.name || 'Region';
  const regionSubtitle = (code) => ({ ES:'Spain', PT:'Portugal', FR:'France', IT:'Italy', EL:'Greece', AL:'Albania', MT:'Malta' }[code] || code);
  const labelCandidates = new Set(['ES', 'PT', 'FR', 'IT', 'EL', 'AL', 'MT']);

  const draw = (geo, geo3) => {
    const map = document.querySelector('#map');
    const svg = map?.querySelector('svg.real-europe');
    if (!map || !svg) return false;
    const old = svg.querySelector('.nuts-region-layer');
    if (old) old.remove();
    const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    layer.setAttribute('class', 'nuts-region-layer');
    layer.setAttribute('aria-label', 'Eurostat NUTS regional boundaries');
    const source = [
      ...(geo?.features || []).filter((feature) => TARGET.has(featureCountry(feature))),
      ...(geo3?.features || []).filter((feature) => featureCountry(feature) === 'MT' && !featureCode(feature).startsWith('MT00'))
    ];
    source.forEach((feature) => {
      const d = geometryPath(feature.geometry);
      if (!d) return;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.dataset.nutsId = featureCode(feature);
      path.dataset.country = featureCountry(feature);
      path.dataset.regionName = featureName(feature);
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${featureName(feature)} · ${regionSubtitle(featureCountry(feature))} · NUTS`;
      path.appendChild(title);
      layer.appendChild(path);
    });
    svg.appendChild(layer);

    const note = map.querySelector('.nuts-layer-note') || document.createElement('div');
    note.className = 'nuts-layer-note';
    note.textContent = 'REGIONS · Eurostat NUTS 2';
    if (!note.parentElement) map.appendChild(note);
    return true;
  };

  const load = async () => {
    ensureStyles();
    try {
      const [nuts2Response, nuts3Response] = await Promise.all([
        fetch(NUTS2_URL, { cache: 'force-cache' }),
        fetch(NUTS3_URL, { cache: 'force-cache' })
      ]);
      if (!nuts2Response.ok) throw new Error(`NUTS 2 request failed (${nuts2Response.status})`);
      const nuts2 = await nuts2Response.json();
      const nuts3 = nuts3Response.ok ? await nuts3Response.json() : { features: [] };
      let tries = 0;
      const renderWhenReady = () => {
        if (draw(nuts2, nuts3)) return;
        tries += 1;
        if (tries < 30) window.setTimeout(renderWhenReady, 250);
      };
      renderWhenReady();
    } catch (error) {
      console.warn('Regional boundaries unavailable', error);
      const map = document.querySelector('#map');
      if (!map || map.querySelector('.nuts-layer-warning')) return;
      const warning = document.createElement('div');
      warning.className = 'nuts-layer-warning';
      warning.textContent = 'Regional boundaries could not be loaded. Country geography remains available.';
      map.appendChild(warning);
    }
  };

  load();
})();

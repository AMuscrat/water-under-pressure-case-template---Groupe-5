(() => {
  const URL = 'https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_60M_2024_4326_LEVL_2.geojson';
  const TARGET = new Set(['ES', 'PT', 'FR', 'IT', 'EL', 'AL', 'MT']);
  const VIEW = { minLon: -25, maxLon: 42, minLat: 35, maxLat: 72, width: 960, height: 520 };
  const project = (lon, lat) => [
    ((lon - VIEW.minLon) / (VIEW.maxLon - VIEW.minLon)) * VIEW.width,
    ((VIEW.maxLat - lat) / (VIEW.maxLat - VIEW.minLat)) * VIEW.height
  ];
  const ringPath = ring => ring.map((pt, i) => {
    const [x, y] = project(Number(pt[0]), Number(pt[1]));
    return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ') + ' Z';
  const geometryPath = g => {
    if (!g) return '';
    if (g.type === 'Polygon') return g.coordinates.map(ringPath).join(' ');
    if (g.type === 'MultiPolygon') return g.coordinates.flatMap(p => p.map(ringPath)).join(' ');
    return '';
  };
  const code = f => String(f?.properties?.id || f?.properties?.NUTS_ID || '');
  const country = f => code(f).slice(0, 2);
  const name = f => f?.properties?.na || f?.properties?.NAME_LATN || f?.properties?.NAME_ENGL || 'Region';
  const esc = s => String(s).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const addStyles = () => {
    if (document.getElementById('nuts-final-style')) return;
    const style = document.createElement('style');
    style.id = 'nuts-final-style';
    style.textContent = '.nuts-final path{fill:rgba(255,255,255,.03);stroke:#335f57;stroke-width:1;vector-effect:non-scaling-stroke;cursor:pointer;transition:fill .15s,stroke .15s}.nuts-final path:hover{fill:rgba(255,255,255,.2);stroke:#123b37;stroke-width:2}.nuts-final text{font-size:8px;font-weight:700;fill:#2d5750;pointer-events:none;text-anchor:middle;paint-order:stroke;stroke:#f7faf8;stroke-width:3px;stroke-linejoin:round}.nuts-final-note{position:absolute;right:16px;top:16px;padding:6px 10px;border:1px solid #d3e2dd;border-radius:999px;background:rgba(255,255,255,.94);font-size:10px;font-weight:700;color:#315b54;z-index:2}';
    document.head.appendChild(style);
  };
  const render = geo => {
    const map = document.getElementById('map');
    const svg = map?.querySelector('svg.real-europe');
    if (!map || !svg) return false;
    svg.querySelector('.nuts-final')?.remove();
    const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    layer.setAttribute('class', 'nuts-final');
    layer.setAttribute('aria-label', 'Southern Europe NUTS 2 regions');
    (geo.features || []).filter(f => TARGET.has(country(f))).forEach(f => {
      const d = geometryPath(f.geometry);
      if (!d) return;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      p.dataset.nutsId = code(f);
      p.dataset.country = country(f);
      p.dataset.regionName = name(f);
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${name(f)} · ${country(f)} · NUTS 2`;
      p.appendChild(title);
      layer.appendChild(p);
      const box = f.geometry?.coordinates?.[0]?.[0] || f.geometry?.coordinates?.[0]?.[0]?.[0];
      if (box && Array.isArray(box) && box.length >= 2) {
        const [x, y] = project(Number(box[0]), Number(box[1]));
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', x.toFixed(1));
        t.setAttribute('y', y.toFixed(1));
        t.textContent = esc(name(f));
        layer.appendChild(t);
      }
    });
    svg.appendChild(layer);
    const note = map.querySelector('.nuts-final-note') || document.createElement('div');
    note.className = 'nuts-final-note';
    note.textContent = 'REGIONS · NUTS 2';
    if (!note.parentElement) map.appendChild(note);
    return true;
  };
  const load = async () => {
    addStyles();
    try {
      const res = await fetch(URL, { cache: 'force-cache', headers: { Accept: 'application/geo+json, application/json' } });
      if (!res.ok) throw new Error(`Regional map request failed (${res.status})`);
      const geo = await res.json();
      let attempts = 0;
      const wait = () => {
        if (render(geo) || attempts++ > 20) return;
        setTimeout(wait, 200);
      };
      wait();
    } catch (err) {
      console.warn('NUTS region layer unavailable', err);
    }
  };
  load();
})();
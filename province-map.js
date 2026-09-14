const D = window.PROVINCE_MAP_DATA;
const $ = (s) => document.querySelector(s);

let active = 'wei';
let selected = null;
let history = [];
let europeFeatures = [];
let loading = true;

const meta = {
  wei: { title:'Water scarcity · WEI+', unit:'%', cuts:[20,40], labels:['Lower','Stressed','Severe'] },
  drought: { title:'Drought pressure', unit:'/100', cuts:[40,60], labels:['Lower','Watch','High'] },
  rain: { title:'Rainfall anomaly', unit:'%', cuts:[-10,-20], labels:['Near normal','Dry','Very dry'], reverse:true },
  irrigated: { title:'Irrigation exposure', unit:'%', cuts:[20,40], labels:['Lower','Medium','High'] }
};

const geoUrl = 'https://raw.githubusercontent.com/leakyMirror/map-of-europe/master/GeoJSON/europe.geojson';
const trackedIso = new Set(D.countries.map((c) => c.id));
const regionToIso = { ESP:'ESP', FRA:'FRA', PRT:'PRT', ITA:'ITA', MLT:'MLT', GRC:'GRC', ALB:'ALB' };
const isoToRegion = { ESP:'ESP', FRA:'FRA', PRT:'PRT', ITA:'ITA', MLT:'MLT', GRC:'GRC', ALB:'ALB' };

function obj(a, c) { return { id:a[0], name:a[1], country:c, wei:a[2], drought:a[3], rain:a[4], irrigated:a[5] }; }
function all() { return D.countries.flatMap((c) => (D.provinces[c.id] || []).map((a) => obj(a, c))); }
function sev(p) {
  const v = p[active], m = meta[active];
  return m.reverse ? (v <= m.cuts[1] ? 2 : v <= m.cuts[0] ? 1 : 0) : (v >= m.cuts[1] ? 2 : v >= m.cuts[0] ? 1 : 0);
}
function colorForClass(level) { return ['#9bc3aa','#e8be62','#cc6b53'][level]; }
function countryMock(iso) {
  const list = (D.provinces[iso] || []).map((a) => obj(a, D.countries.find((c) => c.id === iso)));
  if (!list.length) return null;
  return list.reduce((acc, p) => ({
    wei: acc.wei + p.wei / list.length,
    drought: acc.drought + p.drought / list.length,
    rain: acc.rain + p.rain / list.length,
    irrigated: acc.irrigated + p.irrigated / list.length,
  }), { wei:0, drought:0, rain:0, irrigated:0 });
}
function scoreOfCountry(iso) {
  const p = countryMock(iso); if (!p) return 0;
  const value = active === 'wei' ? p.wei : active === 'drought' ? p.drought : active === 'rain' ? p.rain : p.irrigated;
  const m = meta[active];
  return m.reverse ? (value <= m.cuts[1] ? 2 : value <= m.cuts[0] ? 1 : 0) : (value >= m.cuts[1] ? 2 : value >= m.cuts[0] ? 1 : 0);
}
function advice(p) {
  const score = p.wei * .8 + p.drought * .45 + Math.max(0, -p.rain) * .35 + p.irrigated * .2;
  if (score > 75) return ['Protect water first','Reduce high-water crop exposure, protect a larger reserve and prioritise irrigation on the highest-value blocks.'];
  if (score > 52) return ['Rebalance the crop plan','Keep drought-tolerant crops as the anchor, tighten irrigation scheduling and preserve a contingency buffer.'];
  return ['Maintain with monitoring','Current mock pressure is manageable. Keep a reserve, monitor rainfall and review the plan before peak summer demand.'];
}
function populateCountries() {
  $('#country').innerHTML = D.countries.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
  populateProvinces(D.countries[0].id);
}
function populateProvinces(cid) {
  $('#province').innerHTML = (D.provinces[cid] || []).map((a) => `<option value="${a[0]}">${a[1]}</option>`).join('');
}
function find(id) { return all().find((p) => p.id === id); }
function findCountryFromFeature(f) {
  const p = f.properties || {};
  const code = p.iso_a2 || p.ISO_A2 || p.ISO_A2_EH || p.iso2 || p.ISO2;
  if (code && isoToRegion[code]) return isoToRegion[code];
  const name = (p.name || p.NAME || p.NAME_EN || p.ADMIN || '').toLowerCase();
  return Object.entries({spain:'ESP', france:'FRA', portugal:'PRT', italy:'ITA', malta:'MLT', greece:'GRC', albania:'ALB'}).find(([n]) => name === n)?.[1] || null;
}
function select(id, add = true) {
  const p = find(id); if (!p) return;
  selected = p;
  $('#country').value = p.country.id;
  populateProvinces(p.country.id);
  $('#province').value = p.id;
  if (add) { history = history.filter((x) => x.id !== p.id); history.unshift(p); history = history.slice(0, 6); }
  renderDetail(); renderHistory(); renderMap();
}
function selectCountry(iso) {
  if (!trackedIso.has(iso)) { selected = null; renderDetail(); renderMap(); return; }
  const preferred = { ESP:'ES-AN', ITA:'IT-PUG', PRT:'PT-ALG', FRA:'FR-PACA', GRC:'GR-PEL', ALB:'AL-S', MLT:'MT-M' }[iso];
  const p = find(preferred) || all().find((x) => x.country.id === iso);
  if (p) select(p.id);
}
function renderDetail() {
  if (!selected) {
    $('#detail').innerHTML = '<span class="eyebrow">EUROPE CONTEXT</span><h2>Real country geography</h2><p>Select a mapped country to inspect the prototype water-pressure layer. Only the Southern European regions with mock indicators are scored.</p><div class="decision-box"><span>Map source</span><strong>Natural Earth-derived Europe boundaries</strong><p>Geographic context is real; prototype indicators remain clearly labelled as mock values.</p></div>';
    return;
  }
  const a = advice(selected), label = meta[active].labels[sev(selected)];
  $('#detail').innerHTML = `<span class="eyebrow">${selected.country.name} · REGION</span><h2>${selected.name}</h2><div class="region-country">Prototype decision evidence · mock indicators</div><span class="pressure-badge ${sev(selected)===2?'severe':sev(selected)===1?'high':'watch'}">${label}</span><div class="detail-grid"><div class="detail-metric"><span>WEI+</span><strong>${selected.wei}%</strong></div><div class="detail-metric"><span>Drought</span><strong>${selected.drought}/100</strong></div><div class="detail-metric"><span>Rain anomaly</span><strong>${selected.rain}%</strong></div><div class="detail-metric"><span>Irrigation exposure</span><strong>${selected.irrigated}%</strong></div></div><div class="decision-box"><span>Decision implication</span><strong>${a[0]}</strong><p>${a[1]}</p></div>`;
}
function renderHistory() {
  if (!history.length) { $('#history').innerHTML = '<div class="history-empty">Select Southern European regions to build a comparison log.</div>'; return; }
  $('#history').innerHTML = history.map((p) => `<button class="history-card" data-id="${p.id}"><span>${p.country.name}</span><strong>${p.name}</strong><small>WEI+ ${p.wei}% · Drought ${p.drought}/100 · Rain ${p.rain}%</small></button>`).join('');
  document.querySelectorAll('.history-card').forEach((b) => b.onclick = () => select(b.dataset.id, false));
}
function project([lon, lat], w, h) {
  const x = ((lon + 25) / 75) * w;
  const y = ((72 - lat) / 38) * h;
  return [x, y];
}
function ringPath(ring, w, h) {
  return ring.map((pt, i) => { const [x,y] = project(pt,w,h); return `${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`; }).join(' ') + ' Z';
}
function geometryPath(geometry, w, h) {
  if (!geometry) return '';
  if (geometry.type === 'Polygon') return geometry.coordinates.map((r) => ringPath(r,w,h)).join(' ');
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.map((poly) => poly.map((r) => ringPath(r,w,h)).join(' ')).join(' ');
  return '';
}
function featureName(f) { const p=f.properties||{}; return p.name || p.NAME || p.NAME_EN || p.ADMIN || 'Country'; }
function renderMap() {
  if (loading) { $('#map').innerHTML = '<div class="map-loading">Loading real Europe geography…</div>'; return; }
  const w = 960, h = 520;
  const selectedIso = selected ? selected.country.id : null;
  const paths = europeFeatures.map((f) => {
    const iso = findCountryFromFeature(f);
    const level = iso && trackedIso.has(iso) ? scoreOfCountry(iso) : -1;
    const selectedClass = iso && iso === selectedIso ? 'selected' : '';
    const fill = level < 0 ? '#e9efec' : colorForClass(level);
    const d = geometryPath(f.geometry, w, h);
    const safeName = featureName(f).replace(/"/g, '&quot;');
    return `<path class="country-shape ${selectedClass}" data-iso="${iso || ''}" d="${d}" fill="${fill}" fill-rule="evenodd"><title>${safeName}${iso ? ' · prototype indicator available' : ''}</title></path>`;
  }).join('');
  $('#map').innerHTML = `<svg class="province-europe real-europe" viewBox="0 0 ${w} ${h}" role="img" aria-label="Real geographic map of Europe with prototype water-pressure indicators"><rect x="0" y="0" width="${w}" height="${h}" rx="18" fill="#f7faf8"/><text x="34" y="40" class="map-title">EUROPE</text><text x="34" y="62" class="map-subtitle">Real country geography · prototype indicators for Southern Europe</text>${paths}</svg>`;
  document.querySelectorAll('.country-shape[data-iso]').forEach((el) => el.addEventListener('click', () => el.dataset.iso && selectCountry(el.dataset.iso)));
  $('#hero-layer').textContent = meta[active].title;
  const labels = meta[active].labels;
  $('#legend').innerHTML = ['#9bc3aa','#e8be62','#cc6b53'].map((c,i)=>`<span><i style="background:${c}"></i>${labels[i]}</span>`).join('') + '<span><i style="background:#e9efec"></i>Context only</span>';
}
async function loadGeography() {
  try {
    const res = await fetch(geoUrl, { headers: { Accept: 'application/geo+json, application/json' } });
    if (!res.ok) throw new Error(`Map data request failed (${res.status})`);
    const geo = await res.json();
    europeFeatures = Array.isArray(geo.features) ? geo.features : [];
    if (!europeFeatures.length) throw new Error('No Europe geometry found');
  } catch (err) {
    console.error(err);
    europeFeatures = [];
    $('#map').innerHTML = '<div class="map-loading">Real Europe geography could not be loaded. Check the map data connection and reload.</div>';
  } finally { loading = false; renderMap(); }
}

populateCountries();
renderDetail(); renderHistory();
$('#layer').onchange = (e) => { active = e.target.value; renderDetail(); renderMap(); };
$('#country').onchange = (e) => { populateProvinces(e.target.value); const first = D.provinces[e.target.value]?.[0]; if (first) select(first[0]); };
$('#province').onchange = (e) => select(e.target.value);

loadGeography();

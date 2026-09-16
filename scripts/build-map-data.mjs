import { mkdir, writeFile } from 'node:fs/promises';

const WIDTH = 960, HEIGHT = 520;
const VIEW = { minLon: -25, maxLon: 50, minLat: 34, maxLat: 72 };
const project = ([lon, lat]) => [
  ((lon - VIEW.minLon) / (VIEW.maxLon - VIEW.minLon)) * WIDTH,
  ((VIEW.maxLat - lat) / (VIEW.maxLat - VIEW.minLat)) * HEIGHT,
];

const REGION_URL = 'https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_60M_2024_4326_LEVL_2.geojson';
const regionCodes = {
  'ES-GA': ['ES11'], 'ES-CL': ['ES41'], 'ES-AR': ['ES24'], 'ES-CT': ['ES51'], 'ES-CM': ['ES42'], 'ES-EX': ['ES43'], 'ES-AN': ['ES61'], 'ES-MU': ['ES62'], 'ES-VC': ['ES52'],
  'FR-BR': ['FR52'], 'FR-NO': ['FR25'], 'FR-IDF': ['FR10'], 'FR-GE': ['FRF1','FRF2','FRF3','FRF4','FRF5'], 'FR-NA': ['FRI1','FRI2','FRI3'], 'FR-AURA': ['FRK1','FRK2'], 'FR-OCC': ['FRJ1','FRJ2','FRJ3'], 'FR-PACA': ['FRL0'],
  'PT-N': ['PT11'], 'PT-C': ['PT16'], 'PT-L': ['PT17'], 'PT-A': ['PT18'], 'PT-ALG': ['PT15'],
  'IT-PIE': ['ITC1'], 'IT-LOM': ['ITC4'], 'IT-VEN': ['ITH3'], 'IT-EMR': ['ITH5'], 'IT-TOS': ['ITI1'], 'IT-LAZ': ['ITI4'], 'IT-PUG': ['ITF4'], 'IT-CAL': ['ITF6'], 'IT-SIC': ['ITG1'], 'IT-SAR': ['ITG2'],
  'MT-M': ['MT00'], 'MT-G': ['MT00'],
  'GR-MAC': ['EL51'], 'GR-EPI': ['EL54'], 'GR-TH': ['EL61'], 'GR-ATT': ['EL30'], 'GR-WG': ['EL63'], 'GR-PEL': ['EL65'], 'GR-CR': ['EL43'],
  'AL-N': ['AL01'], 'AL-C': ['AL02'], 'AL-S': ['AL03'],
};
const id = (f) => String(f.properties?.NUTS_ID ?? f.properties?.id ?? f.properties?.CNTR_ID ?? f.properties?.ISO3 ?? '');
const geom = (g) => g?.type === 'Polygon' ? g.coordinates : g?.type === 'MultiPolygon' ? g.coordinates.flat() : [];
const path = (ring) => ring.map((p, i) => `${i ? 'L' : 'M'}${project(p).map(n => n.toFixed(2)).join(',')}`).join(' ') + ' Z';
const featurePaths = (f) => geom(f.geometry).map(path).filter(Boolean);
const name = (f) => f.properties?.NAME_LATN ?? f.properties?.NAME_ENGL ?? f.properties?.CNTR_NAME ?? f.properties?.name ?? 'Region';

const regions = await fetch(REGION_URL).then(r => r.json());
const regionFeatures = regions.features.filter(f => featurePaths(f).length);
const out = { width: WIDTH, height: HEIGHT, view: VIEW, countries: [], regions: {} };
const focusCodes = new Set(['ES','FR','PT','IT','MT','EL','AL']);
const iso3 = {ES:'ESP',FR:'FRA',PT:'PRT',IT:'ITA',MT:'MLT',EL:'GRC',AL:'ALB'};
for (const code of focusCodes) {
  const features = regionFeatures.filter(f => id(f).startsWith(code));
  if (features.length) out.countries.push({ id: iso3[code], name: {ES:'Spain',FR:'France',PT:'Portugal',IT:'Italy',MT:'Malta',EL:'Greece',AL:'Albania'}[code], paths: features.flatMap(featurePaths) });
}
for (const [mockId, codes] of Object.entries(regionCodes)) {
  const matches = regionFeatures.filter(f => codes.includes(id(f)));
  const paths = matches.flatMap(featurePaths);
  if (paths.length) out.regions[mockId] = { id: mockId, name: mockId, paths };
}
await mkdir('data', { recursive: true });
await writeFile('data/europe-geo-data.js', `window.EUROPE_GEO_DATA=${JSON.stringify(out)};\n`);
console.log(`Wrote ${out.countries.length} countries and ${Object.keys(out.regions).length} region records.`);

import { writeFile } from 'node:fs/promises';

// These are country-level observations deliberately attached to one flagship
// map region per country; the UI labels their geographic scope explicitly.
const flagship = { 'ES-AN':'ES','FR-OCC':'FR','PT-A':'PT','IT-PUG':'IT','MT-M':'MT','GR-ATT':'EL' };
const source = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
const get = async (dataset, geo) => (await (await fetch(`${source}${dataset}?format=JSON&lang=en&geo=${geo}&time=2020`)).json());
const out = {};
for (const [id, geo] of Object.entries(flagship)) {
  const [wei, irrigation] = await Promise.all([get('sdg_06_60', geo), get('tai03', geo)]);
  const weiValue = wei.value?.['1'];
  const irrigationValue = irrigation.value?.['1'];
  out[id] = { scope: `National (${geo})`, observationPeriod: '2020', source: { name: 'Eurostat / EEA SDG 06_60 and Eurostat tai03', url: 'https://ec.europa.eu/eurostat/databrowser/view/sdg_06_60/default/table', irrigationUrl: 'https://ec.europa.eu/eurostat/databrowser/view/tai03/default/table' }, ...(Number.isFinite(weiValue) ? { wei: weiValue } : {}), ...(Number.isFinite(irrigationValue) ? { irrigated: irrigationValue } : {}) };
}
await writeFile('data/region-water-scarcity.js', `window.REGION_WATER_SCARCITY=${JSON.stringify(out)};\n`);
console.log(`Wrote ${Object.keys(out).length} flagship region records with cited country-level observations.`);

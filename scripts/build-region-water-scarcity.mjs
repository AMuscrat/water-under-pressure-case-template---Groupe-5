import { writeFile } from 'node:fs/promises';

const regionsByCountry = {
  ES:['ES-GA','ES-CL','ES-AR','ES-CT','ES-CM','ES-EX','ES-AN','ES-MU','ES-VC'],
  FR:['FR-BR','FR-NO','FR-IDF','FR-GE','FR-NA','FR-AURA','FR-OCC','FR-PACA'],
  PT:['PT-N','PT-C','PT-L','PT-A','PT-ALG'],
  IT:['IT-PIE','IT-LOM','IT-VEN','IT-EMR','IT-TOS','IT-LAZ','IT-PUG','IT-CAL','IT-SIC','IT-SAR'],
  MT:['MT-M','MT-G'], EL:['GR-MAC','GR-EPI','GR-TH','GR-ATT','GR-WG','GR-PEL','GR-CR'],
  AL:['AL-N','AL-C','AL-S']
};
const source = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
const get = async (dataset, geo) => { const statinfo=dataset==='sdg_06_60'?'&statinfo=VAL_A':''; return (await (await fetch(`${source}${dataset}?format=JSON&lang=en&geo=${geo}&time=2020${statinfo}`)).json()); };
const firstValue = (json, label) => { const values=Object.values(json.value||{}); if(values.length!==1) { console.warn(`${label}: expected one value, received ${values.length}`); return null; } const value=Number(values[0]); return Number.isFinite(value)?value:null; };
const out = {};
let weiRegions=0, irrigationRegions=0;
for (const [geo, ids] of Object.entries(regionsByCountry)) {
  const [wei, irrigation] = await Promise.all([get('sdg_06_60', geo), get('tai03', geo)]);
  const weiValue = firstValue(wei, `sdg_06_60 ${geo}`);
  const irrigationValue = firstValue(irrigation, `tai03 ${geo}`);
  const record = { scope: `National (${geo})`, observationPeriod: '2020', source: { name: 'Eurostat / EEA SDG 06_60 (WEI+) and Eurostat tai03 (irrigated utilised agricultural area)', url: 'https://ec.europa.eu/eurostat/databrowser/view/sdg_06_60/default/table', irrigationUrl: 'https://ec.europa.eu/eurostat/databrowser/view/tai03/default/table' }, ...(Number.isFinite(weiValue) ? { wei: weiValue } : {}), ...(Number.isFinite(irrigationValue) ? { irrigated: irrigationValue } : {}) };
  for (const id of ids) { if(Number.isFinite(weiValue)||Number.isFinite(irrigationValue)) out[id]=record; if(Number.isFinite(weiValue)) weiRegions++; if(Number.isFinite(irrigationValue)) irrigationRegions++; }
}
await writeFile('data/region-water-scarcity.js', `window.REGION_WATER_SCARCITY=${JSON.stringify(out)};\n`);
console.log(`Wrote ${Object.keys(out).length} region records: ${weiRegions} with WEI+ and ${irrigationRegions} with irrigation exposure.`);

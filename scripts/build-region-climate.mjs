import { writeFile } from 'node:fs/promises';

const regions = [
  ['ES-GA','Galicia',42.8,-8.2],['ES-CL','Castilla y Leon',41.7,-4.8],['ES-AR','Aragon',41.5,-0.7],['ES-CT','Catalonia',41.8,1.7],['ES-CM','Castilla-La Mancha',39.4,-3],['ES-EX','Extremadura',39,-6.2],['ES-AN','Andalusia',37.5,-4.5],['ES-MU','Murcia',38,-1.4],['ES-VC','Valencia',39.5,-.5],
  ['FR-BR','Brittany',48.2,-3],['FR-NO','Normandy',49,0],['FR-IDF','Ile-de-France',48.7,2.4],['FR-GE','Grand Est',48.4,6.2],['FR-NA','Nouvelle-Aquitaine',45,-.5],['FR-AURA','Auvergne-Rhone-Alpes',45.4,4.7],['FR-OCC','Occitanie',43.8,2],['FR-PACA','Provence-Alpes-Cote d Azur',43.8,6.5],
  ['PT-N','Norte',41.5,-8],['PT-C','Centro',40.2,-8],['PT-L','Lisboa e Vale do Tejo',39,-8.7],['PT-A','Alentejo',38,-7.8],['PT-ALG','Algarve',37.2,-8],
  ['IT-PIE','Piemonte',45,7.5],['IT-LOM','Lombardia',45.5,9.8],['IT-VEN','Veneto',45.6,12.1],['IT-EMR','Emilia-Romagna',44.6,11],['IT-TOS','Toscana',43.3,11.2],['IT-LAZ','Lazio',41.9,12.5],['IT-PUG','Puglia',41,16.5],['IT-CAL','Calabria',39,16.5],['IT-SIC','Sicilia',37.5,14],['IT-SAR','Sardegna',40,9],
  ['MT-M','Malta',35.9,14.45],['MT-G','Gozo',36.05,14.25],['GR-MAC','Central Macedonia',40.6,23],['GR-EPI','Epirus',39.7,20.7],['GR-TH','Thessaly',39.5,22.2],['GR-ATT','Attica',38,23.7],['GR-WG','Western Greece',38.4,21.3],['GR-PEL','Peloponnese',37.3,22.3],['GR-CR','Crete',35.2,24.8],['AL-N','Northern Albania',42,19.8],['AL-C','Central Albania',41.2,19.8],['AL-S','Southern Albania',40.3,20.2]
];

const finiteMean = values => { const v = (values || []).filter(Number.isFinite); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; };
const sum = values => (values || []).filter(Number.isFinite).reduce((a,b)=>a+b,0);
const pressure = (et0,temp) => !Number.isFinite(et0)||!Number.isFinite(temp) ? null : (et0 >= 6 || temp >= 34 ? {label:'High',score:80} : et0 >= 4.5 || temp >= 28 ? {label:'Watch',score:55} : {label:'Lower',score:25});
const asOf = new Date().toISOString();
const output = {};
let succeeded = 0;
for (const [id,name,lat,lon] of regions) {
  try {
    const query = new URLSearchParams({latitude:lat,longitude:lon,daily:'et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max',hourly:'soil_moisture_0_to_7cm',forecast_days:7,timezone:'auto'});
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const daily = data.daily || {};
    const et0 = finiteMean(daily.et0_fao_evapotranspiration);
    const maxTemp = Math.max(...(daily.temperature_2m_max || []).filter(Number.isFinite));
    const p = pressure(et0,maxTemp);
    if (!p) throw new Error('missing ET0 or temperature');
    output[id] = {name,lat,lon,rainfallMm:Number(sum(daily.precipitation_sum).toFixed(1)),et0MmPerDay:Number(et0.toFixed(2)),maxTempC:Number(maxTemp.toFixed(1)),droughtScore:p.score,droughtLabel:p.label,asOf};
    succeeded++;
  } catch (error) {
    output[id] = {name,lat,lon,available:false,error:String(error.message),asOf};
    console.warn(`${id}: unavailable (${error.message})`);
  }
}
await writeFile('data/region-climate-live.js', `window.REGION_CLIMATE_LIVE=${JSON.stringify(output)};\n`);
console.log(`Wrote climate snapshot for ${succeeded}/${regions.length} regions (${regions.length-succeeded} unavailable).`);

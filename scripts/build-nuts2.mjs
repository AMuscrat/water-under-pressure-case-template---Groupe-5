import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE_URL = 'https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/v2/2024/4326/60M/nutsrg_2.json';
const TARGET_COUNTRIES = new Set(['ES', 'PT', 'FR', 'IT', 'EL', 'AL', 'MT']);
const OUTPUT = 'data/nuts2-southern-europe.json';

const response = await fetch(SOURCE_URL, {
  headers: { 'User-Agent': 'AquaCrop-Decision-Lab-build/1.0' }
});

if (!response.ok) {
  throw new Error(`Eurostat NUTS source failed: HTTP ${response.status}`);
}

const source = await response.json();
const features = (source.features || []).filter((feature) => {
  const id = String(feature?.properties?.id || feature?.properties?.NUTS_ID || '');
  return TARGET_COUNTRIES.has(id.slice(0, 2));
});

if (!features.length) {
  throw new Error('No Southern European NUTS 2 features found in source data');
}

await mkdir('data', { recursive: true });
await writeFile(OUTPUT, JSON.stringify({ type: 'FeatureCollection', features }));
console.log(`Generated ${OUTPUT} with ${features.length} NUTS 2 features.`);

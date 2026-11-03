/**
 * Ergänzt `gemeindeId` im echten Schulverzeichnis und seiner Kompaktform. Synthetische Schulen bekommen
 * ihre Gemeinde direkt vom Generator (`npm run data:schools`).
 * Usage: npm run data:gemeinden   (nach `npm run geo:build` bzw. `npm run data:schools:real`)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { DirectorySchool } from '../src/types/domain.ts';
import { assignGemeinden, type GemeindeFeature } from './lib/gemeinden.ts';
import { serializeMinifiedSchools, serializeSchools } from './lib/schools.ts';

const dir = new URL('../public/geo/gemeinden/', import.meta.url);
const byKreis = new Map<string, GemeindeFeature[]>();
for (const file of readdirSync(dir).filter((f) => f.endsWith('.geojson'))) {
  const collection = JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as { features: GemeindeFeature[] };
  byKreis.set(file.slice(0, 5), collection.features);
}

const path = (name: string) => new URL(`../public/data/${name}`, import.meta.url);
const real = assignGemeinden(
  JSON.parse(readFileSync(path('schools.real.json'), 'utf8')) as DirectorySchool[],
  byKreis,
);
writeFileSync(path('schools.real.json'), serializeSchools(real));
writeFileSync(path('schools.min.json'), serializeMinifiedSchools(real));
const missing = real.filter((s) => !s.gemeindeId).length;
console.log(`Gemeinden zugeordnet: ${real.length} Schulen, ohne Zuordnung: ${missing}`);

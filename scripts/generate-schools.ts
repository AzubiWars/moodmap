/**
 * Writes public/data/schools.json – ~300 synthetic schools as fallback until the real
 * Schulverzeichnis is imported (#7, later #33). Offline and deterministic.
 *
 * Inputs (both from `npm run geo:build`): public/geo/nrw-kreise.geojson, scripts/data/nrw-gemeinden.json
 * Usage: npm run data:schools
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { KreisCollection } from './lib/geo.ts';
import { generateSchools, serializeSchools, type Gemeinde } from './lib/schools.ts';

const path = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));
const readJson = <T>(relative: string) => JSON.parse(readFileSync(path(relative), 'utf8')) as T;

const schools = generateSchools(
  readJson<Gemeinde[]>('scripts/data/nrw-gemeinden.json'),
  readJson<KreisCollection>('public/geo/nrw-kreise.geojson'),
);

mkdirSync(path('public/data'), { recursive: true });
writeFileSync(path('public/data/schools.json'), serializeSchools(schools));
console.log(`public/data/schools.json: ${schools.length} schools`);

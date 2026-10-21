/**
 * Generates public/data/seed.json – deterministic survey seed data (#8).
 * Adheres to docs/ARCHITECTURE.md §7 and docs/SCIENTIFIC_FOUNDATION.md.
 *
 * Usage: npm run seed:build (or node scripts/generate-seed.ts)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { School } from '../src/types/domain.ts';
import { generateSeedData } from './lib/seed.ts';

const path = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));
const readJson = <T>(relative: string) => JSON.parse(readFileSync(path(relative), 'utf8')) as T;

console.log('Generating deterministic seed data...');
const schools = readJson<School[]>('public/data/schools.json');

const startTime = Date.now();
const seedData = generateSeedData(schools);
const elapsed = Date.now() - startTime;

mkdirSync(path('public/data'), { recursive: true });
const targetFile = path('public/data/seed.json');

writeFileSync(targetFile, JSON.stringify(seedData));

const sizeMb = (Buffer.byteLength(JSON.stringify(seedData)) / (1024 * 1024)).toFixed(2);
console.log(`Wrote ${targetFile}`);
console.log(`Generated ${seedData.responses.length} responses across ${seedData.waves.length} waves for ${schools.length} schools in ${elapsed}ms (${sizeMb} MB).`);

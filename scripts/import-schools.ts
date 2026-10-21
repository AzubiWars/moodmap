/**
 * Importiert die offiziellen Schulstandorte NRW (#33).
 *
 * Quelle: INSPIRE Schulstandorte NRW, OGC API Features
 *   https://ogc-api.nrw.de/inspire-us-schule/v1/collections/governmentalservice/items
 * Lizenz: Datenlizenz Deutschland – Namensnennung 2.0 (dl-de/by-2-0)
 *
 * Output: public/data/schools.real.json (Array von School)
 * Usage:  npm run data:schools:real
 *
 * Die synthetische public/data/schools.json bleibt vorerst für #8/#9 erhalten.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { School, SchoolForm } from '../src/types/domain.ts';
import { featureContains, type KreisCollection } from './lib/geo.ts';
import { createRandom, serializeSchools } from './lib/schools.ts';

const API_URL =
  'https://ogc-api.nrw.de/inspire-us-schule/v1/collections/governmentalservice/items?f=json&limit=10000';
const KREISE_PATH = new URL('../public/geo/nrw-kreise.geojson', import.meta.url);
const OUT_PATH = new URL('../public/data/schools.real.json', import.meta.url);
const META_PATH = new URL('../public/data/schools.real.meta.json', import.meta.url);

// DEMO42 gehört der synthetischen Demo-Schule (schools.json) und wird hier nie vergeben (ADR-012).
const RESERVED_JOIN_CODE = 'DEMO42';
const JOIN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const JOIN_LENGTH = 6;

const FORM_MAP: Record<string, SchoolForm> = {
  Grundschule: 'grundschule',
  Hauptschule: 'hauptschule',
  Realschule: 'realschule',
  Sekundarschule: 'sekundarschule',
  Gesamtschule: 'gesamtschule',
  Gymnasium: 'gymnasium',
  Förderschule: 'foerderschule',
  Berufskolleg: 'berufskolleg',
};

interface OgcFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] } | null;
  properties: Record<string, unknown>;
}

interface OgcCollection {
  type: 'FeatureCollection';
  features: OgcFeature[];
  numberReturned?: number;
  numberMatched?: number;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

function schoolId(feature: OgcFeature): string | undefined {
  const inspireId = text(feature.properties.inspireId);
  const id = inspireId?.split('/').pop();
  return id && /^\d+$/.test(id) ? id : undefined;
}

function makeJoinCode(schoolIdValue: string, used: Set<string>): string {
  const random = createRandom(Number(schoolIdValue) || 20261021);
  for (;;) {
    const code = Array.from(
      { length: JOIN_LENGTH },
      () => JOIN_ALPHABET[Math.floor(random() * JOIN_ALPHABET.length)],
    ).join('');
    if (!used.has(code)) {
      used.add(code);
      return code;
    }
  }
}

async function main(): Promise<void> {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`OGC-API-Download fehlgeschlagen: ${response.status} ${response.statusText}`);
  }
  const collection = (await response.json()) as OgcCollection;
  const kreise = JSON.parse(readFileSync(KREISE_PATH, 'utf8')) as KreisCollection;

  const schools: School[] = [];
  const usedCodes = new Set<string>([RESERVED_JOIN_CODE]);
  const skippedForms = new Map<string, number>();
  let skippedWithoutKreis = 0;
  let skippedWithoutGeometry = 0;
  let skippedWithoutId = 0;

  for (const feature of collection.features) {
    const id = schoolId(feature);
    if (!id) {
      skippedWithoutId += 1;
      continue;
    }

    const formLabel = text(feature.properties.schulform);
    const schoolForm = formLabel ? FORM_MAP[formLabel] : undefined;
    if (!schoolForm) {
      const key = formLabel ?? 'unbekannt';
      skippedForms.set(key, (skippedForms.get(key) ?? 0) + 1);
      continue;
    }

    const point = feature.geometry?.type === 'Point' ? feature.geometry.coordinates : undefined;
    if (!point) {
      skippedWithoutGeometry += 1;
      continue;
    }

    const kreis = kreise.features.find((candidate) => featureContains(candidate, point));
    if (!kreis) {
      skippedWithoutKreis += 1;
      continue;
    }

    const name = text(feature.properties.name) ?? text(feature.properties.shortName) ?? `Schule ${id}`;
    const city =
      text(feature.properties['pointOfContact.address.adminUnit']) ??
      text(feature.properties['pointOfContact.address.locatorDesignator']) ??
      '';

    schools.push({
      id,
      name,
      schoolForm,
      kreisId: kreis.properties.id,
      city,
      lat: point[1],
      lon: point[0],
      studentCount: numberOrNull(feature.properties.occupancy),
      joinCode: makeJoinCode(id, usedCodes),
    });
  }

  schools.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(OUT_PATH, serializeSchools(schools));
  writeFileSync(
    META_PATH,
    `${JSON.stringify(
      {
        source: API_URL,
        license: 'dl-de/by-2-0',
        attribution: 'Schuldaten: Ministerium für Schule und Bildung NRW, dl-de/by-2-0',
        retrievedAt: new Date().toISOString().slice(0, 10),
        count: schools.length,
        usage:
          'Nur Standorte/Stammdaten. Keine synthetischen Stimmungswerte an echte Schulnamen hängen (ADR-012).',
      },
      null,
      2,
    )}\n`,
  );

  console.log(`OGC API: ${collection.numberReturned ?? collection.features.length} Features`);
  console.log(`geschrieben: ${schools.length} Schulen → public/data/schools.real.json`);
  console.log(
    `übersprungen: ${skippedWithoutId} ohne ID, ${skippedWithoutGeometry} ohne Geometrie, ${skippedWithoutKreis} ohne Kreis`,
  );
  if (skippedForms.size > 0) {
    console.log(
      `übersprungene Schulformen: ${[...skippedForms.entries()]
        .map(([form, count]) => `${form} (${count})`)
        .join(', ')}`,
    );
  }
}

await main();

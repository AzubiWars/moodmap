// @vitest-environment node
// Guards public/data/schools.json (#7) – mock source, seed generator and /s/:code rely on it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SCHOOL_FORMS, type School } from '../src/types/domain.ts';
import { featureContains, type KreisCollection } from './lib/geo.ts';
import {
  DEMO_JOIN_CODE,
  DEMO_SCHOOL_ID,
  MIN_SCHOOLS_PER_KREIS,
  SCHOOL_COUNT,
  allocateByPopulation,
  createRandom,
  generateSchools,
  serializeSchools,
  type Gemeinde,
} from './lib/schools.ts';

const path = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));
const readText = (relative: string) => readFileSync(path(relative), 'utf8');

const committed = readText('public/data/schools.json');
const schools = JSON.parse(committed) as School[];
const kreise = JSON.parse(readText('public/geo/nrw-kreise.geojson')) as KreisCollection;
const gemeinden = JSON.parse(readText('scripts/data/nrw-gemeinden.json')) as Gemeinde[];
const kreisById = new Map(kreise.features.map((f) => [f.properties.id, f]));

describe('public/data/schools.json', () => {
  it('is up to date with the generator (run `npm run data:schools`)', () => {
    // Normalise line endings: Windows checkouts may use CRLF.
    expect(committed.replace(/\r\n/g, '\n')).toBe(serializeSchools(generateSchools(gemeinden, kreise)));
  });

  it(`contains ${SCHOOL_COUNT} schools with unique ids, names and join codes`, () => {
    expect(schools).toHaveLength(SCHOOL_COUNT);
    for (const key of ['id', 'name', 'joinCode'] as const) {
      expect(new Set(schools.map((s) => s[key])).size).toBe(SCHOOL_COUNT);
    }
  });

  it('matches the School type', () => {
    for (const s of schools) {
      expect(Object.keys(s).sort()).toEqual(
        ['city', 'id', 'joinCode', 'kreisId', 'lat', 'lon', 'name', 'schoolForm', 'studentCount'].sort(),
      );
      expect(s.id).toMatch(/^9\d{5}$/);
      expect(SCHOOL_FORMS).toContain(s.schoolForm);
      expect(s.joinCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(s.studentCount).toBeGreaterThan(0);
      expect(s.name).toContain(s.city);
    }
  });

  it('places every school inside its own Kreis', () => {
    for (const s of schools) {
      const kreis = kreisById.get(s.kreisId);
      expect(kreis, s.kreisId).toBeDefined();
      expect(featureContains(kreis!, [s.lon, s.lat]), `${s.name} (${s.kreisId})`).toBe(true);
    }
  });

  it(`covers all school forms and gives every Kreis at least ${MIN_SCHOOLS_PER_KREIS} schools`, () => {
    for (const form of SCHOOL_FORMS)
      expect(
        schools.some((s) => s.schoolForm === form),
        form,
      ).toBe(true);
    for (const id of kreisById.keys()) {
      expect(schools.filter((s) => s.kreisId === id).length, id).toBeGreaterThanOrEqual(
        MIN_SCHOOLS_PER_KREIS,
      );
    }
  });

  it('has more schools in big cities than in small Kreise', () => {
    const count = (kreisId: string) => schools.filter((s) => s.kreisId === kreisId).length;
    expect(count('05315')).toBeGreaterThan(count('05762')); // Köln vs. Kreis Höxter
  });

  it(`has the demo school with join code ${DEMO_JOIN_CODE}`, () => {
    const demo = schools.find((s) => s.joinCode === DEMO_JOIN_CODE);
    expect(demo).toMatchObject({ id: DEMO_SCHOOL_ID, kreisId: '05111', schoolForm: 'gesamtschule' });
  });
});

describe('generator helpers', () => {
  it('createRandom is deterministic per seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(createRandom(1)()).not.toBe(createRandom(2)());
  });

  it('allocateByPopulation hands out exactly the requested count', () => {
    const allocation = allocateByPopulation(
      new Map([
        ['a', 1_000_000],
        ['b', 100_000],
        ['c', 10_000],
      ]),
      20,
    );
    expect([...allocation.values()].reduce((x, y) => x + y, 0)).toBe(20);
    expect(allocation.get('c')).toBe(MIN_SCHOOLS_PER_KREIS);
    expect(allocation.get('a')).toBeGreaterThan(allocation.get('b')!);
  });

  it('featureContains respects holes', () => {
    const square = (min: number, max: number) => [
      [min, min],
      [max, min],
      [max, max],
      [min, max],
      [min, min],
    ];
    const donut = {
      type: 'Feature',
      properties: { id: 'x', name: 'x', regbez_id: 'x', type: 'kreis' },
      geometry: { type: 'Polygon', coordinates: [square(0, 10), square(4, 6)] },
    } as KreisCollection['features'][number];
    expect(featureContains(donut, [2, 2])).toBe(true);
    expect(featureContains(donut, [5, 5])).toBe(false);
    expect(featureContains(donut, [11, 5])).toBe(false);
  });
});

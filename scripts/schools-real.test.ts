// @vitest-environment node
// Guards public/data/schools.real.json (#33) – imported from the official INSPIRE OGC API.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SCHOOL_FORMS, type DirectorySchool } from '../src/types/domain.ts';
import type { KreisCollection } from './lib/geo.ts';

const readJson = <T>(name: string): T =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../public/data/${name}`, import.meta.url)), 'utf8')) as T;

const schools = readJson<DirectorySchool[]>('schools.real.json');
const meta = readJson<{ license: string; count: number; source: string; usage: string }>(
  'schools.real.meta.json',
);
const kreise = readJson<KreisCollection>('../geo/nrw-kreise.geojson');
const min = readJson<{
  ids: string[];
  names: string[];
  forms: string[];
  kreisIds: string[];
  cities: string[];
  lats: number[];
  lons: number[];
  studentCounts: (number | null)[];
}>('schools.min.json');

describe('public/data/schools.real.json', () => {
  it('contains the expected number of officially imported schools', () => {
    expect(schools.length).toBeGreaterThanOrEqual(5000);
    expect(schools.length).toBeLessThanOrEqual(6000);
    expect(meta.count).toBe(schools.length);
    expect(meta.license).toBe('dl-de/by-2-0');
    expect(meta.source).toContain('ogc-api.nrw.de');
  });

  it('has a compact map file with the same schools and no join codes', () => {
    expect(min.ids).toHaveLength(schools.length);
    expect(min.names).toHaveLength(schools.length);
    expect(min.forms).toHaveLength(schools.length);
    expect(min.kreisIds).toHaveLength(schools.length);
    expect(min.cities).toHaveLength(schools.length);
    expect(min.lats).toHaveLength(schools.length);
    expect(min.lons).toHaveLength(schools.length);
    expect(min.studentCounts).toHaveLength(schools.length);
    expect(JSON.stringify(min)).not.toContain('joinCode');
  });

  it('has unique school numbers', () => {
    expect(new Set(schools.map((school) => school.id)).size).toBe(schools.length);
  });

  it('covers all supported school forms', () => {
    const forms = new Set(schools.map((school) => school.schoolForm));
    for (const form of SCHOOL_FORMS) expect(forms, form).toContain(form);
  });

  it('has plausible NRW coordinates and a valid Kreis for every school', () => {
    const kreisIds = new Set(kreise.features.map((feature) => feature.properties.id));
    for (const school of schools) {
      expect(school.lat, school.id).toBeGreaterThan(50.3);
      expect(school.lat, school.id).toBeLessThan(52.6);
      expect(school.lon, school.id).toBeGreaterThan(5.8);
      expect(school.lon, school.id).toBeLessThan(9.5);
      expect(kreisIds, school.id).toContain(school.kreisId);
      expect(school.name.length, school.id).toBeGreaterThan(0);
      expect(school.city.length, school.id).toBeGreaterThan(0);
      if (school.studentCount !== null) {
        expect(school.studentCount, school.id).toBeGreaterThan(0);
      }
    }
  });

  it('never publishes join codes – the database draws them (#257)', () => {
    const raw = readFileSync(
      fileURLToPath(new URL('../public/data/schools.real.json', import.meta.url)),
      'utf8',
    );
    expect(raw).not.toMatch(/joinCode|join_code/);
    expect(meta.usage).toContain('ADR-012');
  });
});

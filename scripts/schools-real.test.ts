// @vitest-environment node
// Guards public/data/schools.real.json (#33) – imported from the official INSPIRE OGC API.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SCHOOL_FORMS, type School } from '../src/types/domain.ts';
import type { KreisCollection } from './lib/geo.ts';

const readJson = <T>(name: string): T =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../public/data/${name}`, import.meta.url)), 'utf8')) as T;

const schools = readJson<School[]>('schools.real.json');
const meta = readJson<{ license: string; count: number; source: string }>('schools.real.meta.json');
const kreise = readJson<KreisCollection>('../geo/nrw-kreise.geojson');

describe('public/data/schools.real.json', () => {
  it('contains the expected number of officially imported schools', () => {
    expect(schools.length).toBeGreaterThanOrEqual(5000);
    expect(schools.length).toBeLessThanOrEqual(6000);
    expect(meta.count).toBe(schools.length);
    expect(meta.license).toBe('dl-de/by-2-0');
    expect(meta.source).toContain('ogc-api.nrw.de');
  });

  it('has unique school numbers and join codes', () => {
    expect(new Set(schools.map((school) => school.id)).size).toBe(schools.length);
    expect(new Set(schools.map((school) => school.joinCode)).size).toBe(schools.length);
    for (const school of schools) {
      if (school.joinCode !== 'DEMO42') {
        expect(school.joinCode, school.id).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
      }
    }
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

  it('uses the real Düsseldorf Gesamtschule as demo school', () => {
    const demo = schools.find((school) => school.joinCode === 'DEMO42');
    expect(demo).toEqual(
      expect.objectContaining({
        id: '199916',
        schoolForm: 'gesamtschule',
        city: 'Düsseldorf',
        kreisId: '05111',
      }),
    );
  });
});

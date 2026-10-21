// @vitest-environment node
// Guards the committed output of scripts/simplify-geo.ts (#6) – the map and seed rely on these IDs.
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type Position = [number, number];
interface Feature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry:
    { type: 'Polygon'; coordinates: Position[][] } | { type: 'MultiPolygon'; coordinates: Position[][][] };
}
interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

const geoFile = (name: string) => fileURLToPath(new URL(`../public/geo/${name}`, import.meta.url));
const load = (name: string) => JSON.parse(readFileSync(geoFile(name), 'utf8')) as FeatureCollection;

const kreise = load('nrw-kreise.geojson');
const regbez = load('nrw-regbez.geojson');
const germany = load('germany.geojson');
const mask = load('non-germany-mask.geojson');

const REGBEZ = { '051': 'Düsseldorf', '053': 'Köln', '055': 'Münster', '057': 'Detmold', '059': 'Arnsberg' };

function positions(feature: Feature): Position[] {
  const g = feature.geometry;
  return g.type === 'Polygon' ? g.coordinates.flat() : g.coordinates.flat(2);
}

describe('public/geo', () => {
  it('stays below 1 MB in total', () => {
    const bytes = statSync(geoFile('nrw-kreise.geojson')).size + statSync(geoFile('nrw-regbez.geojson')).size;
    expect(bytes).toBeLessThan(1024 * 1024);
  });

  it('contains the 5 Regierungsbezirke with id and name', () => {
    expect(regbez.type).toBe('FeatureCollection');
    const props = Object.fromEntries(regbez.features.map((f) => [f.properties.id, f.properties.name]));
    expect(props).toEqual(REGBEZ);
  });

  it('contains all 53 Kreise & kreisfreie Städte with unique AGS ids', () => {
    expect(kreise.type).toBe('FeatureCollection');
    expect(kreise.features).toHaveLength(53);
    const ids = kreise.features.map((f) => f.properties.id);
    expect(new Set(ids).size).toBe(53);
    for (const { properties: p } of kreise.features) {
      expect(p.id).toMatch(/^05\d{3}$/);
      expect(p.regbez_id).toBe(String(p.id).slice(0, 3));
      expect(Object.keys(REGBEZ)).toContain(p.regbez_id);
      expect(['kreis', 'kreisfreie_stadt']).toContain(p.type);
      expect(typeof p.name).toBe('string');
    }
  });

  it('uses WGS84 coordinates inside NRW', () => {
    for (const feature of [...kreise.features, ...regbez.features]) {
      for (const [lon, lat] of positions(feature)) {
        expect(lon).toBeGreaterThan(5.8);
        expect(lon).toBeLessThan(9.5);
        expect(lat).toBeGreaterThan(50.3);
        expect(lat).toBeLessThan(52.6);
      }
    }
  });

  it('contains the Germany boundary and a world mask with Germany as a hole', () => {
    expect(germany.features).toHaveLength(1);
    expect(germany.features[0]?.geometry.type).toBe('MultiPolygon');

    expect(mask.features).toHaveLength(1);
    const geometry = mask.features[0]?.geometry;
    expect(geometry?.type).toBe('Polygon');
    if (geometry?.type !== 'Polygon') return;

    expect(geometry.coordinates.length).toBeGreaterThan(1);
    expect(geometry.coordinates[0]?.[0]).toEqual([-180, -85]);
    expect(statSync(geoFile('non-germany-mask.geojson')).size).toBeLessThan(1024 * 1024);
  });
});

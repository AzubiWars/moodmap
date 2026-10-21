import { readFileSync } from 'node:fs';
import type { FeatureCollection } from 'geojson';
import { featureBounds, GERMANY_MAX_BOUNDS, NRW_BOUNDS } from './geo';

describe('GERMANY_MAX_BOUNDS (#132)', () => {
  const [west, south, east, north] = GERMANY_MAX_BOUNDS;
  const inside = ([lon, lat]: [number, number]) => lon > west && lon < east && lat > south && lat < north;

  it('contains all of Germany and the NRW start view', () => {
    const germany = JSON.parse(readFileSync('public/geo/germany.geojson', 'utf8')) as FeatureCollection;
    for (const feature of germany.features) {
      const [min, max] = featureBounds(feature)!;
      expect(inside(min)).toBe(true);
      expect(inside(max)).toBe(true);
    }
    expect(inside(NRW_BOUNDS[0]) && inside(NRW_BOUNDS[1])).toBe(true);
  });

  it('stays a frame around Germany instead of Europe', () => {
    expect(east - west).toBeLessThan(25);
    expect(north - south).toBeLessThan(12);
  });
});

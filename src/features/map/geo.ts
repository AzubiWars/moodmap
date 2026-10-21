import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

/** Properties der Verwaltungsgrenzen in public/geo/*.geojson (Vertrag mit #6). */
export interface RegionProperties {
  id: string;
  name: string;
  regbez_id?: string;
  type?: 'kreis' | 'kreisfreie_stadt';
}

export type RegionFeature = Feature<Geometry, RegionProperties>;
export type RegionCollection = FeatureCollection<Geometry, RegionProperties>;

export type Bounds = [[number, number], [number, number]];

/** NRW grob, für die Startansicht */
export const NRW_BOUNDS: Bounds = [
  [5.85, 50.32],
  [9.47, 52.54],
];

export const GEO_URLS = {
  regbez: '/geo/nrw-regbez.geojson',
  kreis: '/geo/nrw-kreise.geojson',
} as const;

export async function loadRegions(url: string): Promise<RegionCollection> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GeoJSON ${url}: HTTP ${res.status}`);
  return (await res.json()) as RegionCollection;
}

function collectPositions(geometry: Geometry, out: Position[]) {
  switch (geometry.type) {
    case 'Point':
      out.push(geometry.coordinates);
      break;
    case 'MultiPoint':
    case 'LineString':
      out.push(...geometry.coordinates);
      break;
    case 'MultiLineString':
    case 'Polygon':
      geometry.coordinates.forEach((ring) => out.push(...ring));
      break;
    case 'MultiPolygon':
      geometry.coordinates.forEach((poly) => poly.forEach((ring) => out.push(...ring)));
      break;
    case 'GeometryCollection':
      geometry.geometries.forEach((g) => collectPositions(g, out));
      break;
  }
}

export function featureBounds(feature: Feature): Bounds | null {
  if (!feature.geometry) return null;
  const positions: Position[] = [];
  collectPositions(feature.geometry, positions);
  if (positions.length === 0) return null;
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of positions) {
    if (x === undefined || y === undefined) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

/** Hängt Scores als Property `score` an (-1 = zu wenige Daten), damit MapLibre sie färben kann. */
export function withScores(
  regions: RegionCollection,
  scores: ReadonlyMap<string, { score: number | null; n: number }>,
): FeatureCollection<Geometry, RegionProperties & { score: number; n: number }> {
  return {
    type: 'FeatureCollection',
    features: regions.features.map((f) => {
      const s = scores.get(f.properties.id);
      return {
        ...f,
        properties: { ...f.properties, score: s?.score ?? -1, n: s?.n ?? 0 },
      };
    }),
  };
}

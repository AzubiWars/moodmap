/** Minimal GeoJSON helpers for the data scripts (no dependency needed for 53 polygons). */

export type Position = [number, number];
export type PolygonCoords = Position[][];

export interface KreisFeature {
  type: 'Feature';
  properties: { id: string; name: string; regbez_id: string; type: string };
  geometry:
    { type: 'Polygon'; coordinates: PolygonCoords } | { type: 'MultiPolygon'; coordinates: PolygonCoords[] };
}

export interface KreisCollection {
  type: 'FeatureCollection';
  features: KreisFeature[];
}

/** Ray casting on one ring. */
function inRing([x, y]: Position, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Inside the outer ring and outside all holes. */
function inPolygon(point: Position, [outer, ...holes]: PolygonCoords): boolean {
  return !!outer && inRing(point, outer) && !holes.some((hole) => inRing(point, hole));
}

export function featureContains(feature: KreisFeature, point: Position): boolean {
  const g = feature.geometry;
  return g.type === 'Polygon'
    ? inPolygon(point, g.coordinates)
    : g.coordinates.some((p) => inPolygon(point, p));
}

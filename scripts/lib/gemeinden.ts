/**
 * Ordnet Schulen ihrer Gemeinde zu (Ebene „Stadt“ nach dem Kreis): Punkt-in-Polygon auf den amtlichen
 * Gemeindegrenzen des Kreises (public/geo/gemeinden/<kreis>.geojson). Liegt ein Punkt wegen der
 * vereinfachten Grenzen knapp außerhalb, gewinnt die Gemeinde mit dem nächsten Rand-Punkt im selben Kreis.
 */
import { featureContains, type KreisFeature, type Position } from './geo.ts';

export interface GemeindeFeature extends Omit<KreisFeature, 'properties'> {
  properties: { id: string; name: string; kreis_id: string };
}

function nearestVertexDistance(feature: GemeindeFeature, [x, y]: Position): number {
  const polygons =
    feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  let best = Infinity;
  for (const polygon of polygons)
    for (const ring of polygon)
      for (const [px, py] of ring) best = Math.min(best, (px - x) ** 2 + ((py - y) * 1.6) ** 2);
  return best;
}

export function gemeindeOf(
  school: { kreisId: string; lon: number; lat: number },
  byKreis: ReadonlyMap<string, readonly GemeindeFeature[]>,
): string | undefined {
  const candidates = byKreis.get(school.kreisId) ?? [];
  if (candidates.length === 1) return candidates[0]!.properties.id;
  const point: Position = [school.lon, school.lat];
  const inside = candidates.find((feature) => featureContains(feature as unknown as KreisFeature, point));
  if (inside) return inside.properties.id;
  let best: GemeindeFeature | undefined;
  let distance = Infinity;
  for (const feature of candidates) {
    const d = nearestVertexDistance(feature, point);
    if (d < distance) [best, distance] = [feature, d];
  }
  return best?.properties.id;
}

export function assignGemeinden<S extends { kreisId: string; lon: number; lat: number; gemeindeId?: string }>(
  schools: readonly S[],
  byKreis: ReadonlyMap<string, readonly GemeindeFeature[]>,
): S[] {
  return schools.map((school) => {
    const gemeindeId = gemeindeOf(school, byKreis);
    // Feld direkt hinter kreisId, damit Diffs der Datendateien lesbar bleiben.
    const { gemeindeId: _old, ...rest } = school;
    void _old;
    const entries = Object.entries(rest);
    const at = entries.findIndex(([key]) => key === 'kreisId') + 1;
    if (gemeindeId) entries.splice(at, 0, ['gemeindeId', gemeindeId]);
    return Object.fromEntries(entries) as S;
  });
}

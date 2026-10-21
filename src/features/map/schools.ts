import type { FeatureCollection, Point } from 'geojson';
import type { School, SchoolForm } from '@/types';

/** Synthetischer Fallback-Datensatz aus #7 (erzeugt von scripts/generate-schools.ts). */
export const SCHOOLS_URL = '/data/schools.json';

// TODO(#68): durch getDataSource().getSchools() ersetzen, sobald die MockDataSource (#9) registriert ist
export async function loadSchools(url: string = SCHOOLS_URL): Promise<School[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Schulen ${url}: HTTP ${res.status}`);
  return (await res.json()) as School[];
}

export const SCHOOL_FORM_LABELS: Record<SchoolForm, string> = {
  grundschule: 'Grundschule',
  hauptschule: 'Hauptschule',
  realschule: 'Realschule',
  sekundarschule: 'Sekundarschule',
  gesamtschule: 'Gesamtschule',
  gymnasium: 'Gymnasium',
  foerderschule: 'Förderschule',
  berufskolleg: 'Berufskolleg',
};

/** Properties eines Schul-Markers; `score` -1 = zu wenige Daten (wie bei den Flächen). */
export interface SchoolPointProperties {
  id: string;
  name: string;
  form: string;
  city: string;
  score: number;
  n: number;
  /** Für Cluster-Ø: score × n, 0 bei zu wenigen Daten */
  weighted: number;
  /** n nur der Schulen mit Score, für Cluster-Ø */
  scoredN: number;
}

export type SchoolCollection = FeatureCollection<Point, SchoolPointProperties>;

export function schoolsToGeoJSON(
  schools: readonly School[],
  scores: ReadonlyMap<string, { score: number | null; n: number }>,
): SchoolCollection {
  return {
    type: 'FeatureCollection',
    features: schools.map((school) => {
      const s = scores.get(school.id);
      const score = s?.score ?? null;
      const n = s?.n ?? 0;
      return {
        type: 'Feature',
        id: school.id,
        geometry: { type: 'Point', coordinates: [school.lon, school.lat] },
        properties: {
          id: school.id,
          name: school.name,
          form: SCHOOL_FORM_LABELS[school.schoolForm],
          city: school.city,
          score: score ?? -1,
          n,
          weighted: score == null ? 0 : score * n,
          scoredN: score == null ? 0 : n,
        },
      };
    }),
  };
}

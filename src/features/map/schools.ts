import type { FeatureCollection, Point } from 'geojson';
import { getDataSource } from '@/data';
import type { School, SchoolForm } from '@/types';

/**
 * Schulen mit Stimmungswerten. Im Mock-Modus nur die synthetischen Schulen aus #7 –
 * das echte Verzeichnis (#100) bekommt keine erfundenen Werte (ADR-012).
 */
export function loadSchools(): Promise<School[]> {
  return getDataSource().getSchools();
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

/** Neutraler Standort aus dem offiziellen NRW-Schulverzeichnis – ohne Stimmungswerte (ADR-012). */
export interface DirectoryPointProperties {
  id: string;
  name: string;
  form: string;
  city: string;
}

export type SchoolDirectoryCollection = FeatureCollection<Point, DirectoryPointProperties>;

interface MinifiedSchools {
  ids: string[];
  names: string[];
  forms: School['schoolForm'][];
  kreisIds: string[];
  cities: string[];
  lats: number[];
  lons: number[];
  studentCounts: (number | null)[];
}

/** Lädt das offizielle, bereits importierte Schulverzeichnis NRW (5.327 Standorte). */
export async function loadSchoolDirectory(): Promise<School[]> {
  try {
    const response = await fetch('/data/schools.min.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const min = (await response.json()) as MinifiedSchools;
    return min.ids.map((id, index) => ({
      id,
      name: min.names[index]!,
      schoolForm: min.forms[index]!,
      kreisId: min.kreisIds[index]!,
      city: min.cities[index]!,
      lat: min.lats[index]!,
      lon: min.lons[index]!,
      studentCount: min.studentCounts[index] ?? null,
      joinCode: '',
    }));
  } catch {
    // Fallback für ältere Deployments/Caches ohne kompakte Datei.
    const response = await fetch('/data/schools.real.json');
    if (!response.ok) throw new Error(`Schulverzeichnis: HTTP ${response.status}`);
    return (await response.json()) as School[];
  }
}

export function directoryToGeoJSON(schools: readonly School[]): SchoolDirectoryCollection {
  return {
    type: 'FeatureCollection',
    features: schools.map((school) => ({
      type: 'Feature',
      id: school.id,
      geometry: { type: 'Point', coordinates: [school.lon, school.lat] },
      properties: {
        id: school.id,
        name: school.name,
        form: SCHOOL_FORM_LABELS[school.schoolForm],
        city: school.city,
      },
    })),
  };
}

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

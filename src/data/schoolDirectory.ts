import type { School } from '@/types';

/**
 * Column-oriented format of `public/data/schools.min.json` (5.327 real NRW schools).
 * Kept in one place so the map directory and the Supabase source decode it identically.
 */
export interface MinifiedSchools {
  ids: string[];
  names: string[];
  forms: School['schoolForm'][];
  kreisIds: string[];
  cities: string[];
  lats: number[];
  lons: number[];
  studentCounts: (number | null)[];
}

/** Expands the compact directory file into `School` objects without a join code (#257). */
export function expandMinifiedSchools(min: MinifiedSchools): School[] {
  const length = min.ids.length;
  const columns = [min.names, min.forms, min.kreisIds, min.cities, min.lats, min.lons, min.studentCounts];
  if (columns.some((column) => column.length !== length)) {
    throw new Error('Schulverzeichnis ist unvollständig.');
  }
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
}

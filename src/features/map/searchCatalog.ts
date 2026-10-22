import type { School } from '@/types';
import { kreisLabel, regbezLabel } from './drilldown';
import type { RegionCollection, RegionFeature } from './geo';
import { SCHOOL_FORM_LABELS } from './schools';

export type MapSearchKind = 'school' | 'city' | 'kreis' | 'regbez';

export interface MapSearchResult {
  /** Eindeutiger Schlüssel für React-Listen. */
  key: string;
  kind: MapSearchKind;
  label: string;
  detail: string;
  /** Nur bei `kind === 'school'`. */
  school?: School;
  /** Treffer aus dem offiziellen NRW-Schulverzeichnis (ohne Stimmungswerte). */
  directory?: boolean;
  /** Nur bei `kind === 'kreis'` oder `kind === 'regbez'`. */
  region?: RegionFeature;
  /** Nur bei `kind === 'city'`. */
  city?: string;
}

export interface MapSearchInput {
  schools?: readonly School[];
  directorySchools?: readonly School[];
  kreise?: RegionCollection;
  regbez?: RegionCollection;
}

export const MIN_SEARCH_LENGTH = 2;

/** Groß-/Kleinschreibung, Umlaute und Satzzeichen sind für die Suche egal. */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ä', 'a')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ß', 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function words(value: string): string[] {
  return normalizeSearch(value).split(' ').filter(Boolean);
}

function matches(haystack: string, queryWords: readonly string[]): boolean {
  const normalized = normalizeSearch(haystack);
  return queryWords.every((word) => normalized.includes(word));
}

/** Exakter Treffer zuerst, dann Präfix, dann Teilstring. */
function matchRank(value: string, query: string): number {
  const normalized = normalizeSearch(value);
  if (normalized === query) return 0;
  if (normalized.startsWith(query)) return 1;
  if (normalized.split(' ').some((word) => word.startsWith(query))) return 2;
  return 3;
}

function byRankAndLabel(query: string) {
  return (a: { label: string }, b: { label: string }) =>
    matchRank(a.label, query) - matchRank(b.label, query) || a.label.localeCompare(b.label, 'de');
}

/**
 * Durchsucht Schulen, Städte (aus den Schulstandorten) sowie Kreise und Regierungsbezirke.
 * Bewusst ohne externe Geocoding-API: alle Treffer kommen aus den bereits geladenen Kartendaten.
 */
export function searchMap(query: string, input: MapSearchInput, limit = 12): MapSearchResult[] {
  const normalizedQuery = normalizeSearch(query);
  if (normalizedQuery.length < MIN_SEARCH_LENGTH) return [];
  const queryWords = words(query);
  const results: MapSearchResult[] = [];
  const liveSchoolIds = new Set((input.schools ?? []).map((school) => school.id));

  // 1. Schulen: Name, Stadt, Schulnummer und Schulform.
  const schoolResults = (input.schools ?? [])
    .filter((school) =>
      matches(
        `${school.name} ${school.city} ${school.id} ${SCHOOL_FORM_LABELS[school.schoolForm]}`,
        queryWords,
      ),
    )
    .map<MapSearchResult>((school) => ({
      key: `school:${school.id}`,
      kind: 'school',
      label: school.name,
      detail: `${SCHOOL_FORM_LABELS[school.schoolForm]} · ${school.city}`,
      school,
    }))
    .sort(byRankAndLabel(normalizedQuery))
    .slice(0, 4);
  results.push(...schoolResults);

  // 1b. Offizielles NRW-Schulverzeichnis: alle 5.327 Standorte durchsuchbar.
  const directoryResults = (input.directorySchools ?? [])
    // Live-Schulen stehen bereits oben; keine doppelten Suchtreffer.
    .filter((school) => !liveSchoolIds.has(school.id))
    .filter((school) =>
      matches(
        `${school.name} ${school.city} ${school.id} ${SCHOOL_FORM_LABELS[school.schoolForm]}`,
        queryWords,
      ),
    )
    .map<MapSearchResult>((school) => ({
      key: `directory:${school.id}`,
      kind: 'school',
      label: school.name,
      detail: `${SCHOOL_FORM_LABELS[school.schoolForm]} · ${school.city} · Schulverzeichnis`,
      school,
      directory: true,
    }))
    .sort(byRankAndLabel(normalizedQuery))
    .slice(0, 8);
  results.push(...directoryResults);

  // 2. Städte aus den Schulstandorten. Kreisfreie Städte kommen bereits als Kreis-Treffer.
  const independentCities = new Set(
    (input.kreise?.features ?? [])
      .filter((feature) => feature.properties.type === 'kreisfreie_stadt')
      .map((feature) => normalizeSearch(feature.properties.name)),
  );
  const cities = new Map<string, number>();
  for (const school of input.schools ?? []) {
    if (!school.city || independentCities.has(normalizeSearch(school.city))) continue;
    cities.set(school.city, (cities.get(school.city) ?? 0) + 1);
  }
  const cityResults = [...cities.entries()]
    .filter(([city]) => matches(city, queryWords))
    .sort(([a, aCount], [b, bCount]) => bCount - aCount || a.localeCompare(b, 'de'))
    .slice(0, 6)
    .map<MapSearchResult>(([city, count]) => ({
      key: `city:${city}`,
      kind: 'city',
      label: city,
      detail: `${count} ${count === 1 ? 'Schule' : 'Schulen'}`,
      city,
    }));
  results.push(...cityResults);

  // 3. Kreise und Regierungsbezirke.
  const regionResults = [...(input.kreise?.features ?? []), ...(input.regbez?.features ?? [])]
    .filter((feature) => matches(feature.properties.name, queryWords))
    .map<MapSearchResult>((feature) => {
      const isKreis = feature.properties.type != null;
      return {
        key: `${isKreis ? 'kreis' : 'regbez'}:${feature.properties.id}`,
        kind: isKreis ? 'kreis' : 'regbez',
        label: isKreis ? kreisLabel(feature) : regbezLabel(feature),
        detail: isKreis ? 'Kreis / Stadt' : 'Regierungsbezirk',
        region: feature,
      };
    })
    .sort(byRankAndLabel(normalizedQuery))
    .slice(0, 6);
  results.push(...regionResults);

  return results.slice(0, limit);
}

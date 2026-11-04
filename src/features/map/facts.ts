import { useQuery } from '@tanstack/react-query';
import { NO_DATA } from '@/lib/colors';
import type { FactLevel, FactsFile, UntstatHours } from '@/types/facts';
import type { ScaleStep } from './modes';

/** Amtliche Kennzahlen (#297), einmal geladen und dann gecacht. */
export function useFacts(enabled = true) {
  return useQuery({
    queryKey: ['facts'],
    queryFn: async (): Promise<FactsFile> => {
      const response = await fetch('/data/facts.json');
      if (!response.ok) throw new Error(`facts.json: ${response.status}`);
      return (await response.json()) as FactsFile;
    },
    enabled,
    staleTime: Infinity,
    retry: false,
  });
}

/** Kartenebene → Ebene der Faktendatei (`school` hat eigene Werte). */
export type FactArea = { level: FactLevel; id: string };

const pct = (part: number, whole: number) => (whole > 0 ? (100 * part) / whole : null);

export interface AreaFacts {
  /** Anteil ersatzlos ausgefallener Stunden in % */
  ausfall: number | null;
  /** Anteil Unterricht nach Stundenplan in % */
  regular: number | null;
  /** Schulen mit Unterrichtsstatistik */
  untstatSchools: number;
  /** Ø Sozialindexstufe 1–9 */
  sozial: number | null;
  sozialSchools: number;
  /** Ø Schüler:innen je Klasse (allgemeinbildende Schulen; nur bis Kreisebene) */
  klassen: number | null;
  /** Schüler:innen je Lehrkraft (Personen, inkl. Teilzeit) */
  proLehrkraft: number | null;
}

export function areaFacts(facts: FactsFile | undefined, area: FactArea): AreaFacts {
  const cell = facts?.untstat.areas[area.level]?.[area.id];
  const soz = facts?.sozialindex.areas[area.level]?.[area.id];
  const eck = area.level === 'gemeinde' ? undefined : facts?.eckdaten?.areas[area.level]?.[area.id];
  return {
    klassen: eck && eck[1] > 0 ? eck[0] / eck[1] : null,
    proLehrkraft: eck && eck[2] > 0 ? eck[0] / eck[2] : null,
    ausfall: cell ? pct(cell[1], cell[0]) : null,
    regular: cell ? pct(cell[2], cell[0]) : null,
    untstatSchools: cell?.[3] ?? 0,
    sozial: soz && soz[1] > 0 ? soz[0] / soz[1] : null,
    sozialSchools: soz?.[1] ?? 0,
  };
}

export const STAGE_LABELS = {
  primar: 'Primarstufe',
  sek1: 'Sekundarstufe I',
  sek2: 'Sekundarstufe II',
} as const;

export interface SchoolStageFacts {
  stage: keyof typeof STAGE_LABELS;
  ausfall: number;
  /** Landeswert derselben Schulform und Stufe */
  state: number | null;
}

export function schoolFacts(
  facts: FactsFile | undefined,
  schoolId: string,
  schoolForm: string,
): { total: number | null; stages: SchoolStageFacts[] } {
  const entry = facts?.untstat.schools[schoolId];
  if (!entry) return { total: null, stages: [] };
  const stages = (Object.keys(STAGE_LABELS) as (keyof typeof STAGE_LABELS)[]).flatMap((stage) => {
    const hours: UntstatHours | undefined = entry[stage];
    if (!hours) return [];
    const state = facts.untstat.stateByForm[`${schoolForm}:${stage}`];
    return [{ stage, ausfall: pct(hours[1], hours[0])!, state: state ? pct(state[1], state[0]) : null }];
  });
  const all = Object.values(entry);
  const total = pct(
    all.reduce((sum, h) => sum + h![1], 0),
    all.reduce((sum, h) => sum + h![0], 0),
  );
  return { total, stages };
}

/** Ersatzloser Ausfall: wenig = blau, viel = rot (gleiche Farbwelt wie die Stimmung, umgekehrt gelesen). */
export const AUSFALL_STEPS: readonly ScaleStep[] = [
  { min: -Infinity, color: '#2B78B8', label: 'unter 3 %' },
  { min: 3, color: '#7FC4DE', label: '3–4 %' },
  { min: 4, color: '#F6D365', label: '4–5 %' },
  { min: 5, color: '#F07B4F', label: '5–6 %' },
  { min: 6, color: '#C2263C', label: 'ab 6 %' },
];

/**
 * Sozialindex: neutrale Blaugrün-Skala, bewusst ohne Ampelfarben – der Index beschreibt die Lage der
 * Schülerschaft, er bewertet keine Schule.
 */
export const SOZIAL_STEPS: readonly ScaleStep[] = [
  { min: -Infinity, color: '#E0F2F1', label: 'Ø unter 3' },
  { min: 3, color: '#A7D8D3', label: 'Ø 3–4' },
  { min: 4, color: '#5FB3AB', label: 'Ø 4–5' },
  { min: 5, color: '#2A8178', label: 'Ø 5–6' },
  { min: 6, color: '#134E48', label: 'Ø ab 6' },
];

/** Klassengröße: neutrale Bernstein-Skala – größere Klassen sind Kontext, kein Urteil über Schulen. */
export const KLASSEN_STEPS: readonly ScaleStep[] = [
  { min: -Infinity, color: '#FEF3C7', label: 'unter 24,5' },
  { min: 24.5, color: '#FCD34D', label: '24,5–25,5' },
  { min: 25.5, color: '#F59E0B', label: '25,5–26,5' },
  { min: 26.5, color: '#B45309', label: '26,5–27,5' },
  { min: 27.5, color: '#78350F', label: 'ab 27,5' },
];

function stepExpression(property: string, steps: readonly ScaleStep[]) {
  return [
    'case',
    ['<', ['get', property], 0],
    NO_DATA.color,
    ['step', ['get', property], steps[0]!.color, ...steps.slice(1).flatMap((s) => [s.min, s.color])],
  ] as const;
}

export const AUSFALL_FILL_EXPRESSION = stepExpression('ausfall', AUSFALL_STEPS);
export const SOZIAL_FILL_EXPRESSION = stepExpression('sozial', SOZIAL_STEPS);
export const KLASSEN_FILL_EXPRESSION = stepExpression('klassen', KLASSEN_STEPS);

export const formatPct = (value: number) =>
  `${value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
export const formatSozial = (value: number) =>
  value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

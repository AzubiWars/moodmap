import { GRADE_BANDS, type GradeBand, SCHOOL_FORMS, type SchoolForm, type WaveId } from '@/types';

/** Weitere Kartenfilter (#20, PRODUCT_SPEC §3.4): Schulform, Stufe, Zeitraum – alles in der URL. */
export type Period = 'week' | 'month' | 'year';

export interface MapFilters {
  schoolForm: SchoolForm[];
  gradeBand: GradeBand[];
  period: Period;
}

export const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Diese Woche' },
  { value: 'month', label: 'Letzte 4 Wochen' },
  { value: 'year', label: 'Schuljahr' },
];

export const GRADE_LABELS: Record<GradeBand, string> = {
  '5-7': 'Klasse 5–7',
  '8-10': 'Klasse 8–10',
  oberstufe: 'Oberstufe',
  berufskolleg: 'Berufskolleg',
};

export const FILTER_PARAMS = ['form', 'grade', 'period'] as const;

function parseList<T extends string>(value: string | null, allowed: readonly T[]): T[] {
  if (!value) return [];
  return [...new Set(value.split(','))].filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export function parseFilters(params: URLSearchParams): MapFilters {
  const period = params.get('period');
  return {
    schoolForm: parseList(params.get('form'), SCHOOL_FORMS),
    gradeBand: parseList(params.get('grade'), GRADE_BANDS),
    period: period === 'month' || period === 'year' ? period : 'week',
  };
}

/** Schreibt die Filter in die URL; Standardwerte fallen weg, andere Parameter bleiben. */
export function filterParams(previous: URLSearchParams, filters: MapFilters): URLSearchParams {
  const next = new URLSearchParams(previous);
  const set = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
  set('form', filters.schoolForm.join(','));
  set('grade', filters.gradeBand.join(','));
  set('period', filters.period === 'week' ? '' : filters.period);
  return next;
}

export function activeFilterCount(filters: MapFilters): number {
  return filters.schoolForm.length + filters.gradeBand.length + (filters.period === 'week' ? 0 : 1);
}

/** Montag (UTC) der ISO-Woche, z. B. `2026-W43`. */
export function isoWeekMonday(id: WaveId): Date | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(id);
  if (!match) return null;
  const [, year, week] = match.map(Number) as [number, number, number];
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (week - 1) * 7);
  return monday;
}

export function isoWeekId(date: Date): WaveId {
  // Die ISO-Woche gehört zum Jahr ihres Donnerstags; Woche 1 enthält den 4. Januar.
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7));
  const year = thursday.getUTCFullYear();
  const week =
    1 +
    Math.round((thursday.getTime() - isoWeekMonday(`${year}-W01`)!.getTime() - 3 * 86_400_000) / 604_800_000);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Schuljahr NRW beginnt Ende August – grob ab KW 35. */
const SCHOOL_YEAR_START_WEEK = 35;

/**
 * Wellen für den Zeitraum, ausgehend von der aktuellen Welle. `undefined` = nur aktuelle Woche
 * (Standard der DataSource). Wellen ohne Daten liefern einfach keine Antworten.
 */
export function periodWaveIds(period: Period, currentWaveId: WaveId | undefined): WaveId[] | undefined {
  if (period === 'week' || !currentWaveId) return undefined;
  const monday = isoWeekMonday(currentWaveId);
  if (!monday) return undefined;
  const weeks: WaveId[] = [];
  const count = period === 'month' ? 4 : schoolYearWeeks(currentWaveId);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() - i * 7);
    weeks.push(isoWeekId(d));
  }
  return weeks;
}

function schoolYearWeeks(currentWaveId: WaveId): number {
  const [year, week] = currentWaveId.split('-W').map(Number) as [number, number];
  const startYear = week >= SCHOOL_YEAR_START_WEEK ? year : year - 1;
  const start = isoWeekMonday(`${startYear}-W${SCHOOL_YEAR_START_WEEK}`)!;
  const current = isoWeekMonday(currentWaveId)!;
  return Math.round((current.getTime() - start.getTime()) / 604_800_000) + 1;
}

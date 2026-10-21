import { NO_DATA } from '@/lib/colors';

/** Kartenmodi (PRODUCT_SPEC §3.4 „Kartenmodus“, #21, #42). */
export type MapMode = 'mood' | 'trend' | 'participation' | 'radar';

export const MAP_MODES: { value: MapMode; label: string }[] = [
  { value: 'mood', label: 'Stimmung' },
  { value: 'trend', label: 'Trend' },
  { value: 'participation', label: 'Beteiligung' },
  { value: 'radar', label: 'Frühwarn-Radar' },
];

export function parseMapMode(value: string | null): MapMode {
  return MAP_MODES.some((m) => m.value === value) ? (value as MapMode) : 'mood';
}

/** Nutzt der Modus das gewählte Thema? Radar hat feste Themen, Beteiligung zählt alle Stimmen. */
export function modeUsesTopic(mode: MapMode): boolean {
  return mode === 'mood' || mode === 'trend';
}

export interface ScaleStep {
  /** Untergrenze (inklusiv); die erste Stufe gilt nach unten offen */
  min: number;
  color: string;
  label: string;
}

/**
 * Trend = Δ Score zur Vorwoche (DESIGN §2): Verschlechterung (Orange/Rot) ↔ unverändert (Grau) ↔ Verbesserung (Blau), mit ▲▼.
 * Property `tdelta`; −999 = nicht berechenbar (eine der beiden Wochen unter K_MIN).
 */
export const TREND_STEPS: readonly ScaleStep[] = [
  { min: -Infinity, color: '#C2263C', label: '▼▼ deutlich schlechter (≤ −5)' },
  { min: -5, color: '#F07B4F', label: '▼ schlechter (−5 bis −2)' },
  { min: -2, color: '#CBD5E1', label: '● unverändert (±2)' },
  { min: 2, color: '#7FC4DE', label: '▲ besser (2 bis 5)' },
  { min: 5, color: '#2B78B8', label: '▲▲ deutlich besser (≥ 5)' },
];

/**
 * Beteiligung = Stimmen dieser Woche ÷ Schülerzahl der Schulen der Einheit, in %.
 * Eigene violette Skala, damit sie nicht mit der Stimmungsfarbe verwechselt wird. Property `rate`; −1 = unbekannt.
 */
export const PARTICIPATION_STEPS: readonly ScaleStep[] = [
  { min: -Infinity, color: '#EDE9FE', label: 'unter 1 %' },
  { min: 1, color: '#C4B5FD', label: '1–2 %' },
  { min: 2, color: '#A78BFA', label: '2–5 %' },
  { min: 5, color: '#7C3AED', label: '5–10 %' },
  { min: 10, color: '#4C1D95', label: 'ab 10 %' },
];

const NO_TREND = -999;

function stepExpression(property: string, steps: readonly ScaleStep[], noDataBelow: number) {
  return [
    'case',
    ['<', ['get', property], noDataBelow],
    NO_DATA.color,
    ['step', ['get', property], steps[0]!.color, ...steps.slice(1).flatMap((s) => [s.min, s.color])],
  ] as const;
}

export const TREND_FILL_EXPRESSION = stepExpression('tdelta', TREND_STEPS, NO_TREND + 1);
export const PARTICIPATION_FILL_EXPRESSION = stepExpression('rate', PARTICIPATION_STEPS, 0);

export const trendValue = (delta: number | null | undefined) => delta ?? NO_TREND;
export const hasTrend = (value: number | undefined) => value != null && value > NO_TREND;

export function formatTrend(delta: number): string {
  const rounded = Math.round(delta);
  const arrow = rounded > 0 ? '▲' : rounded < 0 ? '▼' : '●';
  return `${arrow} ${rounded > 0 ? '+' : rounded < 0 ? '−' : '±'}${Math.abs(rounded)} Pkt. zur Vorwoche`;
}

export function formatRate(rate: number): string {
  return `${rate.toLocaleString('de-DE', { maximumFractionDigits: rate < 10 ? 1 : 0 })} % Beteiligung`;
}

/** Schülerzahl je Einheit aus den Schulen; Grundlage der Beteiligungsquote. */
export function studentsBy(
  schools: readonly { id: string; kreisId: string; studentCount: number | null }[],
  level: 'regbez' | 'kreis' | 'school',
): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of schools) {
    if (!s.studentCount) continue;
    const id = level === 'school' ? s.id : level === 'kreis' ? s.kreisId : s.kreisId.slice(0, 3);
    out.set(id, (out.get(id) ?? 0) + s.studentCount);
  }
  return out;
}

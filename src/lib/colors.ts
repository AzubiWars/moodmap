/**
 * Stimmungs-Skala (docs/DESIGN.md §2). Einzige Quelle für Score → Stufe/Farbe/Wetter.
 * Die Hex-Werte müssen mit den Tokens in src/index.css übereinstimmen.
 */

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface MoodLevelInfo {
  level: MoodLevel;
  /** Untergrenze des Score-Bereichs (inklusiv) */
  min: number;
  color: string;
  /** Lesbare Textfarbe auf `color` (WCAG-Kontrast) */
  textColor: string;
  weather: string;
  /** Emoji für die Antwortskala im Mood-Check */
  face: string;
  label: string;
}

export const MOOD_LEVELS: readonly MoodLevelInfo[] = [
  {
    level: 1,
    min: 0,
    color: '#C2263C',
    textColor: '#FFFFFF',
    weather: '⛈️',
    face: '😫',
    label: 'sehr schlecht',
  },
  { level: 2, min: 20, color: '#F07B4F', textColor: '#0F172A', weather: '🌧️', face: '😕', label: 'schlecht' },
  { level: 3, min: 40, color: '#F6D365', textColor: '#0F172A', weather: '⛅', face: '😐', label: 'gemischt' },
  { level: 4, min: 60, color: '#7FC4DE', textColor: '#0F172A', weather: '🌤️', face: '🙂', label: 'gut' },
  { level: 5, min: 80, color: '#2B78B8', textColor: '#FFFFFF', weather: '☀️', face: '🤩', label: 'sehr gut' },
];

export const NO_DATA = { color: '#B8BCC6', weather: '░', label: 'zu wenige Daten' } as const;

/** Score 0–100 → Stufe; `null` (unter K_MIN) → `null`. */
export function scoreToLevel(score: number | null | undefined): MoodLevelInfo | null {
  if (score == null || Number.isNaN(score)) return null;
  const clamped = Math.min(100, Math.max(0, score));
  return [...MOOD_LEVELS].reverse().find((l) => clamped >= l.min) ?? MOOD_LEVELS[0]!;
}

/** Farbe für einen Score, inkl. „zu wenige Daten“. */
export function scoreToColor(score: number | null | undefined): string {
  return scoreToLevel(score)?.color ?? NO_DATA.color;
}

/**
 * MapLibre-Expression: Feature-Property `score` (0–100, -1 = zu wenige Daten) → Farbe.
 * Bewusst diskrete Stufen statt Interpolation: Gelb↔Blau gemischt ergäbe Grüntöne, die nicht in der Legende stehen.
 */
export const MOOD_FILL_EXPRESSION = [
  'case',
  ['<', ['get', 'score'], 0],
  NO_DATA.color,
  ['step', ['get', 'score'], MOOD_LEVELS[0]!.color, ...MOOD_LEVELS.slice(1).flatMap((l) => [l.min, l.color])],
] as const;

/**
 * Wie `MOOD_FILL_EXPRESSION`, aber für eine beliebige Score-Expression
 * (z. B. Ø-Score eines Schul-Clusters, #18). Negativ = zu wenige Daten.
 */
export function moodColorExpression(score: unknown): unknown[] {
  return [
    'case',
    ['<', score, 0],
    NO_DATA.color,
    ['step', score, MOOD_LEVELS[0]!.color, ...MOOD_LEVELS.slice(1).flatMap((l) => [l.min, l.color])],
  ];
}

import type { TensionLevel, TopicSlug } from '@/types';

/**
 * Score- und Aggregationslogik – reine Funktionen, identisch zur SQL-Seite
 * (docs/ARCHITECTURE.md §5). Keine UI-, Env- oder DataSource-Abhängigkeit.
 */

export const DEFAULT_K_MIN = 10;

/** Gewichte des Spannungs-Index (ARCHITECTURE §5.8). */
export const TENSION_WEIGHTS = {
  voice: 0.3,
  safety: 0.2,
  community: 0.15,
  wellbeing: 0.15,
  participation: 0.1,
  teachers: 0.1,
} as const;

export type TensionTopicSlug = keyof typeof TENSION_WEIGHTS;

/** Stufen: < 45 stable · 45–59,9 watch · ≥ 60 talk. */
export const TENSION_THRESHOLDS = { watch: 45, talk: 60 } as const;

/** Hotspot: score < 40 oder delta ≤ -10, jeweils n ≥ 30. */
export const HOTSPOT = { scoreBelow: 40, deltaAtMost: -10, minN: 30 } as const;

/** Zuschlag, wenn voice oder safety in 3 Wellen fällt. */
export const TENSION_TREND_BONUS = 10;

export type AnswerType = 'mood5' | 'swipe' | 'choice';

export interface AnswerScoreInput {
  /** ID der Teilnahme; mehrere Fragen derselben Person/Welle teilen diese ID. */
  responseId: string;
  topicSlug: TopicSlug;
  type: AnswerType;
  /** mood5: 1–5; swipe: 1 = stimme zu, 0 = stimme nicht zu; choice: ignoriert. */
  value?: number | null;
  /** Kernfrage 1.0, Swipe 0.5, Verteilung 0. Default je nach `type`. */
  weight?: number;
  /** `true` dreht den Score: `100 - punkte`. */
  invert?: boolean;
}

export interface TopicScore {
  /** Unterschiedliche Teilnahmen mit mindestens einer gewerteten Antwort (Gewicht > 0). */
  n: number;
  /** 0–100 oder `null`, wenn `n < kMin`. */
  score: number | null;
}

export interface HotspotInput {
  score: number | null;
  delta: number | null;
  n: number;
}

export interface TensionTrend {
  voiceDeclining3Waves?: boolean;
  safetyDeclining3Waves?: boolean;
}

export interface TensionResult {
  index: number | null;
  level: TensionLevel | null;
  /** Die 2 Themen mit dem größten Beitrag zur Spannung. */
  drivers: TopicSlug[];
}

export interface Resonance {
  n: number;
  score: number | null;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Standardgewicht: Kernfrage 1.0, Swipe 0.5, Verteilung 0. */
export function defaultWeight(type: AnswerType): number {
  switch (type) {
    case 'mood5':
      return 1;
    case 'swipe':
      return 0.5;
    default:
      return 0;
  }
}

/**
 * Antwort → Punkte (0–100).
 * `mood5`: `(value - 1) * 25`; `swipe`: Zustimmung 100 / Ablehnung 0.
 * „Weiß nicht", `choice` und ungültige Werte werden nicht gewertet (`null`).
 */
export function scoreAnswer(input: AnswerScoreInput): number | null {
  if (input.type === 'choice' || input.value === null || input.value === undefined) {
    return null;
  }

  let points: number;
  if (input.type === 'mood5') {
    if (!Number.isInteger(input.value) || input.value < 1 || input.value > 5) return null;
    points = (input.value - 1) * 25;
  } else {
    if (input.value === 1) points = 100;
    else if (input.value === 0) points = 0;
    else return null;
  }

  return input.invert ? 100 - points : points;
}

/**
 * Themen-Score einer Einheit: gewichteter Mittelwert aller gewerteten
 * Antworten zu diesem Thema. Unter `kMin` unterschiedlichen Teilnahmen ist der Score `null`.
 */
export function topicScore(
  answers: readonly AnswerScoreInput[],
  topicSlug: TopicSlug,
  kMin = DEFAULT_K_MIN,
): TopicScore {
  const responseIds = new Set<string>();
  let weightedSum = 0;
  let weightSum = 0;

  for (const answer of answers) {
    if (answer.topicSlug !== topicSlug) continue;
    if (!answer.responseId?.trim()) continue;
    const points = scoreAnswer(answer);
    if (points === null) continue;

    const weight = answer.weight ?? defaultWeight(answer.type);
    if (weight <= 0) continue;

    responseIds.add(answer.responseId);
    weightedSum += points * weight;
    weightSum += weight;
  }

  const n = responseIds.size;
  if (n < kMin || weightSum === 0) return { n, score: null };
  return { n, score: round1(weightedSum / weightSum) };
}

/** Themen-Scores für alle Themen, die in den Antworten vorkommen. */
export function topicScores(
  answers: readonly AnswerScoreInput[],
  kMin = DEFAULT_K_MIN,
): Record<TopicSlug, TopicScore> {
  const slugs = new Set(answers.map((answer) => answer.topicSlug));
  const scores: Record<TopicSlug, TopicScore> = {};
  for (const slug of slugs) scores[slug] = topicScore(answers, slug, kMin);
  return scores;
}

/**
 * Gesamt-Mood: Mittelwert der Themen-Scores mit ausreichend n.
 * `overall` zählt dabei als eigenes Thema; Themen unter K_MIN verzerren nicht.
 */
export function overallScore(scores: Readonly<Record<TopicSlug, TopicScore>>): number | null {
  const values = Object.values(scores)
    .map((entry) => entry.score)
    .filter((score): score is number => score !== null);

  if (values.length === 0) return null;
  return round1(values.reduce((sum, score) => sum + score, 0) / values.length);
}

/** Δ zur Vorperiode – nur wenn beide Perioden ≥ `kMin` und einen Score haben. */
export function delta(current: TopicScore, previous: TopicScore, kMin = DEFAULT_K_MIN): number | null {
  if (current.n < kMin || previous.n < kMin || current.score === null || previous.score === null) {
    return null;
  }
  return round1(current.score - previous.score);
}

/** Hotspot-Regel für das Dashboard (ARCHITECTURE §5.7). */
export function isHotspot(input: HotspotInput): boolean {
  if (input.n < HOTSPOT.minN || input.score === null) return false;
  if (input.score < HOTSPOT.scoreBelow) return true;
  return input.delta !== null && input.delta <= HOTSPOT.deltaAtMost;
}

export function tensionLevel(index: number | null): TensionLevel | null {
  if (index === null) return null;
  if (index < TENSION_THRESHOLDS.watch) return 'stable';
  if (index < TENSION_THRESHOLDS.talk) return 'watch';
  return 'talk';
}

/**
 * Spannungs-Index 0–100 (hoch = mehr Spannung).
 * Voraussetzung: `voice` + mindestens 2 weitere Themen mit n ≥ K_MIN.
 * Fehlende Themen werden über die Gewichte der vorhandenen normiert.
 */
export function tensionIndex(
  scores: Readonly<Record<TopicSlug, TopicScore>>,
  trend: TensionTrend = {},
): TensionResult {
  const present = (Object.keys(TENSION_WEIGHTS) as TensionTopicSlug[])
    .map((slug) => ({
      slug,
      weight: TENSION_WEIGHTS[slug] as number,
      score: scores[slug]?.score ?? null,
    }))
    .filter(
      (entry): entry is { slug: TensionTopicSlug; weight: number; score: number } => entry.score !== null,
    );

  const hasVoice = present.some((entry) => entry.slug === 'voice');
  if (!hasVoice || present.length < 3) {
    return { index: null, level: null, drivers: [] };
  }

  const totalWeight = present.reduce((sum, entry) => sum + entry.weight, 0);
  const weightedMean = present.reduce((sum, entry) => sum + entry.score * entry.weight, 0) / totalWeight;

  let index = 100 - weightedMean;
  if (trend.voiceDeclining3Waves || trend.safetyDeclining3Waves) {
    index += TENSION_TREND_BONUS;
  }
  index = clamp(round1(index), 0, 100);

  const drivers = [...present]
    .map((entry) => ({
      slug: entry.slug,
      contribution: (100 - entry.score) * entry.weight,
    }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
    .map((entry) => entry.slug);

  return { index, level: tensionLevel(index), drivers };
}

/** Resonanz einer Politik-Antwort: mood5-Bewertungen → 0–100, ab `kMin`. */
export function resonance(ratings: readonly number[], kMin = DEFAULT_K_MIN): Resonance {
  const valid = ratings.filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);
  const n = valid.length;
  if (n < kMin) return { n, score: null };

  const sum = valid.reduce((total, value) => total + (value - 1) * 25, 0);
  return { n, score: round1(sum / n) };
}

/** Wirkung einer Politik-Antwort: Score nach Veröffentlichung minus Welle davor. */
export function topicDeltaSincePublished(
  after: TopicScore,
  before: TopicScore,
  kMin = DEFAULT_K_MIN,
): number | null {
  return delta(after, before, kMin);
}

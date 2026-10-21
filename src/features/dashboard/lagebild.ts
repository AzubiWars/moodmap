import type { AggregateRow, MoodDistribution, SchoolForm, Topic, TopicSlug } from '@/types';

/** Die fünf Regierungsbezirke NRW (Präfix des Kreis-AGS). */
export const REGBEZ_NAMES: Readonly<Record<string, string>> = {
  '051': 'Düsseldorf',
  '053': 'Köln',
  '055': 'Münster',
  '057': 'Detmold',
  '059': 'Arnsberg',
};

export const SCHOOL_FORM_LABELS: Readonly<Record<SchoolForm, string>> = {
  grundschule: 'Grundschule',
  hauptschule: 'Hauptschule',
  realschule: 'Realschule',
  sekundarschule: 'Sekundarschule',
  gesamtschule: 'Gesamtschule',
  gymnasium: 'Gymnasium',
  foerderschule: 'Förderschule',
  berufskolleg: 'Berufskolleg',
};

/** Eine zusammengefasste Einheit (NRW, Schulform …) aus mehreren Aggregat-Zeilen. */
export interface Combined {
  n: number;
  score: number | null;
  delta: number | null;
  distribution: MoodDistribution | null;
}

const LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * Demo-Fallback für Supabase: `get_aggregates` liefert dort (noch) keine Verteilung.
 * Aus Score und n wird eine plausible 5er-Verteilung erzeugt, damit die Pitch-Demo
 * Prozentbalken und Brennpunkte zeigt. Mock-Daten nutzen weiterhin die echte Verteilung.
 */
function demoDistribution(score: number, n: number): MoodDistribution {
  const centers = [10, 30, 50, 70, 90];
  const weights = centers.map((center) => Math.exp(-((center - score) ** 2) / (2 * 20 ** 2)));
  const total = weights.reduce((sum, value) => sum + value, 0);
  const exact = weights.map((weight) => (weight / total) * n);
  const counts = exact.map(Math.floor);
  let missing = n - counts.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((_, i) => i)
    .sort((a, b) => exact[b]! - counts[b]! - (exact[a]! - counts[a]!) || a - b);
  for (const i of order) {
    if (missing-- <= 0) break;
    counts[i]! += 1;
  }
  return { 1: counts[0]!, 2: counts[1]!, 3: counts[2]!, 4: counts[3]!, 5: counts[4]! };
}

/**
 * Fasst Zeilen zusammen. n und Verteilungen addieren sich exakt (jede Teilnahme gehört zu genau einer Zeile);
 * Score und Δ sind nach n gewichtet. Bei einer einzelnen Zeile (`level: 'nrw'`) werden die Werte
 * unverändert übernommen.
 */
export function combineRows(rows: readonly AggregateRow[], kMin: number): Combined {
  const n = rows.reduce((sum, row) => sum + row.n, 0);
  const weighted = (pick: (row: AggregateRow) => number | null | undefined) => {
    let sum = 0;
    let weight = 0;
    for (const row of rows) {
      const value = pick(row);
      if (value == null) continue;
      sum += value * row.n;
      weight += row.n;
    }
    return weight > 0 ? Math.round((sum / weight) * 10) / 10 : null;
  };
  let distribution: MoodDistribution | null = null;
  for (const row of rows) {
    if (!row.distribution) continue;
    distribution ??= { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const level of LEVELS) distribution[level] += row.distribution[level];
  }
  if (n < kMin) return { n, score: null, delta: null, distribution: null };
  const score = weighted((row) => row.score);
  // Supabase liefert derzeit keine Rohverteilung – für den Pitch aus dem Score ableiten.
  if (!distribution && score != null) distribution = demoDistribution(score, n);
  return { n, score, delta: weighted((row) => row.delta), distribution };
}

export interface Sentiment {
  /** 😫 + 😕 in Prozent */
  negative: number;
  /** 😐 in Prozent */
  neutral: number;
  /** 🙂 + 🤩 in Prozent */
  positive: number;
  /** Ganze Prozent je Stufe (1–5), Summe exakt 100. */
  levels: MoodDistribution;
  /** Anzahl unzufriedener Stimmen (absolut) */
  negativeVotes: number;
  /** Gezählte Stimmen (ohne „Weiß nicht") */
  votes: number;
}

/**
 * Verteilung → ganze Prozent je Stufe nach dem Hare-Niemeyer-Verfahren (größter Rest), damit die Summe
 * immer genau 100 ist. Unter `kMin` Stimmen → `null`.
 */
export function toSentiment(
  distribution: MoodDistribution | null | undefined,
  kMin: number,
): Sentiment | null {
  if (!distribution) return null;
  const votes = LEVELS.reduce((sum, level) => sum + distribution[level], 0);
  if (votes < kMin) return null;
  const exact = LEVELS.map((level) => (distribution[level] * 100) / votes);
  const floors = exact.map(Math.floor);
  let missing = 100 - floors.reduce((sum, value) => sum + value, 0);
  const byRemainder = LEVELS.map((_, i) => i).sort(
    (a, b) => exact[b]! - floors[b]! - (exact[a]! - floors[a]!) || a - b,
  );
  for (const i of byRemainder) {
    if (missing-- <= 0) break;
    floors[i]! += 1;
  }
  const [l1, l2, l3, l4, l5] = floors as [number, number, number, number, number];
  return {
    negative: l1 + l2,
    neutral: l3,
    positive: l4 + l5,
    levels: { 1: l1, 2: l2, 3: l3, 4: l4, 5: l5 },
    negativeVotes: distribution[1] + distribution[2],
    votes,
  };
}

/** Ausdehnung links/rechts der Mittelachse in Prozentpunkten – für alle Balken einer Liste gleich. */
export interface DivergingDomain {
  left: number;
  right: number;
}

/** Linke/rechte Ausdehnung: unzufrieden + halbe Mitte | zufrieden + halbe Mitte; mindestens 50/50. */
export function divergingDomain(sentiments: ReadonlyArray<Sentiment | null>): DivergingDomain {
  let left = 50;
  let right = 50;
  for (const s of sentiments) {
    if (!s) continue;
    left = Math.max(left, s.negative + s.neutral / 2);
    right = Math.max(right, s.positive + s.neutral / 2);
  }
  return { left, right };
}

export interface TopicStat {
  slug: TopicSlug;
  title: string;
  icon: string;
  n: number;
  score: number | null;
  delta: number | null;
  sentiment: Sentiment | null;
}

export function topicStat(topic: Topic, rows: readonly AggregateRow[], kMin: number): TopicStat {
  const combined = combineRows(rows, kMin);
  return {
    slug: topic.slug,
    title: topic.title,
    icon: topic.icon,
    n: combined.n,
    score: combined.score,
    delta: combined.delta,
    sentiment: toSentiment(combined.distribution, kMin),
  };
}

export type TopicSort = 'negative' | 'score';

/** Standard: höchster Anteil unzufrieden zuerst; `score`: schlechtester Score zuerst. „Zu wenige Daten" immer ans Ende. */
export function sortTopics(stats: readonly TopicStat[], by: TopicSort): TopicStat[] {
  const key = (stat: TopicStat) => (by === 'negative' ? stat.sentiment?.negative : stat.score);
  return [...stats].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka == null || kb == null) return ka == null ? (kb == null ? 0 : 1) : -1;
    return by === 'negative' ? kb - ka : ka - kb;
  });
}

/**
 * Brennpunkt-Themen: die meisten unzufriedenen Stimmen (absolut). So schlagen viele Stimmen + schlechte
 * Bewertung ein Thema mit hohem Anteil, aber wenigen Stimmen.
 */
export function hotspotTopics(stats: readonly TopicStat[], limit = 5): TopicStat[] {
  return stats
    .filter((stat) => stat.sentiment && stat.slug !== 'overall')
    .sort((a, b) => b.sentiment!.negativeVotes - a.sentiment!.negativeVotes)
    .slice(0, limit);
}

/** Bestes Thema zuerst (Platz 1 = beste Stimmung). */
export function rankTopics(stats: readonly TopicStat[]): TopicStat[] {
  const scored = stats.filter((stat) => stat.score != null).sort((a, b) => b.score! - a.score!);
  return [...scored, ...stats.filter((stat) => stat.score == null)];
}

export interface GroupStat {
  id: string;
  label: string;
  n: number;
  score: number | null;
  sentiment: Sentiment | null;
}

/** Vergleich je Regierungsbezirk aus den RegBez-Zeilen eines Themas. */
export function regbezComparison(rows: readonly AggregateRow[], kMin: number): GroupStat[] {
  return rows.map((row) => {
    const combined = combineRows([row], kMin);
    return {
      id: row.id,
      label: REGBEZ_NAMES[row.id] ?? row.id,
      n: combined.n,
      score: combined.score,
      sentiment: toSentiment(combined.distribution, kMin),
    };
  });
}

/** Vergleich je Schulform; Schulformen ohne Teilnahmen fallen weg. */
export function schoolFormComparison(
  rowsByForm: ReadonlyArray<readonly [SchoolForm, readonly AggregateRow[]]>,
  kMin: number,
): GroupStat[] {
  return rowsByForm
    .map(([form, rows]) => {
      const combined = combineRows(rows, kMin);
      return {
        id: form,
        label: SCHOOL_FORM_LABELS[form],
        n: combined.n,
        score: combined.score,
        sentiment: toSentiment(combined.distribution, kMin),
      };
    })
    .filter((group) => group.n > 0);
}

/** Δ als Text mit Pfeil, z. B. „▲ 3,2" / „▼ 1,0" / „± 0". Farbe ist nie der einzige Hinweis. */
export function formatTrend(delta: number | null): { symbol: string; text: string; label: string } | null {
  if (delta == null) return null;
  const abs = Math.abs(delta).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  if (Math.abs(delta) < 0.5) return { symbol: '▬', text: '± 0', label: 'unverändert zur Vorwoche' };
  return delta > 0
    ? { symbol: '▲', text: abs, label: `${abs} Punkte besser als in der Vorwoche` }
    : { symbol: '▼', text: abs, label: `${abs} Punkte schlechter als in der Vorwoche` };
}

import type { AggregateRow, Topic, TopicSlug } from '@/types';

/** Ab hier gilt ein Thema unabhängig vom NRW-Vergleich als Baustelle (Stufe „schlecht“, docs/DESIGN.md §2). */
const WEAK_SCORE = 40;

/** Die direkte Frage „Schule insgesamt“ ist kein Handlungsfeld – nur in der Themenliste, nicht in den Top 3. */
const NOT_ACTIONABLE = new Set<string>(['overall']);

/** NRW-Vergleichswert: die eine Zeile von `getAggregates({ level: 'nrw' })` (#140), direkt über alle Antworten. */
export interface NrwReference {
  score: number | null;
  topicScores: Partial<Record<TopicSlug, number | null>>;
}

export function nrwReference(nrwRows: readonly AggregateRow[] | undefined): NrwReference {
  const row = nrwRows?.find((r) => r.id === 'nrw');
  return { score: row?.score ?? null, topicScores: row?.topicScores ?? {} };
}

export interface TopicGap {
  slug: TopicSlug;
  title: string;
  icon: string;
  /** `null` = zu wenige Daten (K_MIN) – dann gibt es auch kein Delta */
  score: number | null;
  nrw: number | null;
  delta: number | null;
}

export interface GapAnalysis {
  topics: TopicGap[];
  /** Top 3: stärkstes Defizit – Δ zu NRW oder Abstand unter 40, je nachdem was größer ist */
  weaknesses: TopicGap[];
  /** Top 3: größtes positives Δ zu NRW */
  strengths: TopicGap[];
}

/** Gap-Analyse Einheit vs. NRW (Methodik: Kommentar von deepseek-maxamor in #19, docs/SCIENTIFIC_FOUNDATION.md). */
export function gapAnalysis(
  topics: readonly Topic[],
  unitScores: Partial<Record<TopicSlug, number | null>> | undefined,
  nrw: NrwReference,
): GapAnalysis {
  const rows: TopicGap[] = [...topics]
    .sort((a, b) => a.sort - b.sort)
    .map((topic) => {
      const score = unitScores?.[topic.slug] ?? null;
      const ref = nrw.topicScores[topic.slug] ?? null;
      return {
        slug: topic.slug,
        title: topic.title,
        icon: topic.icon,
        score,
        nrw: ref,
        delta: score != null && ref != null ? score - ref : null,
      };
    });
  const rated = rows.filter(
    (row): row is TopicGap & { score: number; delta: number } =>
      row.delta != null && !NOT_ACTIONABLE.has(row.slug),
  );
  const deficit = (row: { score: number; delta: number }) => Math.min(row.delta, row.score - WEAK_SCORE);
  const weaknesses = rated
    .filter((row) => deficit(row) < 0)
    .sort((a, b) => deficit(a) - deficit(b))
    .slice(0, 3);
  const strengths = rated
    .filter((row) => row.delta > 0 && row.score >= WEAK_SCORE)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);
  return { topics: rows, weaknesses, strengths };
}

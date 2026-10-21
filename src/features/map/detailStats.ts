import type { AggregateRow, Topic, TopicSlug } from '@/types';

/** Ab hier gilt ein Thema unabhängig vom NRW-Vergleich als Baustelle (Stufe „schlecht“, docs/DESIGN.md §2). */
const WEAK_SCORE = 40;

/** Die direkte Frage „Schule insgesamt“ ist kein Handlungsfeld – nur in der Themenliste, nicht in den Top 3. */
const NOT_ACTIONABLE = new Set<string>(['overall']);

export interface NrwReference {
  score: number | null;
  n: number;
  topicScores: Partial<Record<TopicSlug, number | null>>;
}

/**
 * NRW-Vergleichswert aus den fünf Regierungsbezirks-Zeilen, gewichtet nach n.
 * NÄHERUNG: Die API kennt noch kein `level: 'nrw'` (Frage an den Lead in #19). Sobald es das gibt,
 * nur diese Funktion durch die direkte NRW-Zeile ersetzen.
 */
export function nrwReference(regbezRows: readonly AggregateRow[] | undefined): NrwReference {
  const rows = regbezRows ?? [];
  const weighted = (pick: (row: AggregateRow) => number | null | undefined) => {
    let sum = 0;
    let weight = 0;
    for (const row of rows) {
      const value = pick(row);
      if (value == null) continue;
      sum += value * row.n;
      weight += row.n;
    }
    return weight > 0 ? sum / weight : null;
  };
  const slugs = new Set(rows.flatMap((row) => Object.keys(row.topicScores ?? {}))) as Set<TopicSlug>;
  return {
    score: weighted((row) => row.score),
    n: rows.reduce((acc, row) => acc + row.n, 0),
    topicScores: Object.fromEntries(
      [...slugs].map((slug) => [slug, weighted((row) => row.topicScores?.[slug])]),
    ),
  };
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

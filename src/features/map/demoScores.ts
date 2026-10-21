/**
 * ÜBERGANGSLÖSUNG bis #9 (MockDataSource) gemerged ist: deterministische Pseudo-Scores pro Region,
 * damit die Karte schon gefärbt ist. Wird durch getDataSource().getAggregates() ersetzt.
 */
export function demoScores(ids: string[], topic: string): Map<string, { score: number | null; n: number }> {
  const out = new Map<string, { score: number | null; n: number }>();
  for (const id of ids) {
    const h = hash(`${id}:${topic}`);
    const n = 5 + (h % 400);
    out.set(id, { score: n < 10 ? null : 25 + (h % 60), n });
  }
  return out;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

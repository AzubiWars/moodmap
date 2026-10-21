import type { AggregateRow, MoodDistribution } from '@/types';
import {
  combineRows,
  formatTrend,
  hotspotTopics,
  rankTopics,
  sortTopics,
  toSentiment,
  type TopicStat,
} from './lagebild';

const dist = (a: number, b: number, c: number, d: number, e: number): MoodDistribution => ({
  1: a,
  2: b,
  3: c,
  4: d,
  5: e,
});

const stat = (slug: string, distribution: MoodDistribution | null, score: number | null = 50): TopicStat => ({
  slug,
  title: slug,
  icon: '•',
  n: 0,
  score,
  delta: null,
  sentiment: toSentiment(distribution, 10),
});

describe('toSentiment', () => {
  it('rundet so, dass die Prozentwerte immer genau 100 ergeben', () => {
    for (const d of [dist(1, 1, 1, 0, 0), dist(7, 7, 7, 7, 1), dist(3, 3, 3, 3, 3), dist(10, 0, 0, 0, 1)]) {
      const s = toSentiment(d, 1)!;
      expect(s.negative + s.neutral + s.positive).toBe(100);
      expect(Object.values(s.levels).reduce((a, b) => a + b, 0)).toBe(100);
    }
    expect(toSentiment(dist(5, 5, 5, 0, 0), 1)).toMatchObject({ negative: 67, neutral: 33, positive: 0 });
  });

  it('zeigt unter K_MIN keine Werte', () => {
    expect(toSentiment(dist(3, 3, 3, 0, 0), 10)).toBeNull();
    expect(toSentiment(null, 10)).toBeNull();
    expect(toSentiment(dist(3, 3, 3, 1, 0), 10)).toMatchObject({ votes: 10, negativeVotes: 6 });
  });
});

describe('combineRows', () => {
  const row = (n: number, score: number | null, distribution: MoodDistribution | null): AggregateRow => ({
    id: String(n),
    n,
    score,
    delta: score === null ? null : 2,
    distribution,
  });

  it('summiert Zählwerte exakt und gewichtet den Score nach n', () => {
    expect(combineRows([row(30, 40, dist(10, 10, 5, 5, 0)), row(10, 80, dist(0, 0, 0, 5, 5))], 10)).toEqual({
      n: 40,
      score: 50,
      delta: 2,
      distribution: dist(10, 10, 5, 10, 5),
    });
  });

  it('unterdrückt alles, wenn die Summe unter K_MIN bleibt', () => {
    expect(combineRows([row(4, null, null), row(5, null, null)], 10)).toEqual({
      n: 9,
      score: null,
      delta: null,
      distribution: null,
    });
  });
});

describe('Themen sortieren', () => {
  it('Brennpunkte zählen unzufriedene Stimmen absolut, nicht den Anteil', () => {
    const few = stat('few', dist(10, 1, 0, 0, 1)); // 92 % unzufrieden, 11 Stimmen
    const many = stat('many', dist(1200, 1200, 800, 400, 400)); // 60 %, 2.400 Stimmen
    const none = stat('none', null);
    expect(hotspotTopics([few, many, none]).map((t) => t.slug)).toEqual(['many', 'few']);
    expect(sortTopics([many, none, few], 'negative').map((t) => t.slug)).toEqual(['few', 'many', 'none']);
  });

  it('Score-Sortierung: schlechtestes zuerst, Ranking: bestes zuerst, ohne Daten am Ende', () => {
    const topics = [stat('a', null, 60), stat('b', null, null), stat('c', null, 30)];
    expect(sortTopics(topics, 'score').map((t) => t.slug)).toEqual(['c', 'a', 'b']);
    expect(rankTopics(topics).map((t) => t.slug)).toEqual(['a', 'c', 'b']);
  });
});

it('formatTrend nutzt Pfeil und Text statt nur Farbe', () => {
  expect(formatTrend(3.24)).toMatchObject({ symbol: '▲', text: '3,2' });
  expect(formatTrend(-1)).toMatchObject({ symbol: '▼', text: '1' });
  expect(formatTrend(0.2)).toMatchObject({ symbol: '▬' });
  expect(formatTrend(null)).toBeNull();
});

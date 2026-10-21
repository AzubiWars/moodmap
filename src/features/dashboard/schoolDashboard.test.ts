import { describe, expect, it } from 'vitest';
import type { DataSource } from '@/data/api';
import type { AggregateQuery, AggregateRow, School, Topic, TrendQuery } from '@/types';
import { loadSchoolDashboard, recentWaveIds, sortByGap, type SchoolTopicRow } from './schoolDashboard';

describe('recentWaveIds', () => {
  it('counts back week by week, oldest first, ending with the current wave', () => {
    expect(recentWaveIds('2026-W43', 3)).toEqual(['2026-W41', '2026-W42', '2026-W43']);
  });

  it('crosses the year boundary with 52- and 53-week years', () => {
    expect(recentWaveIds('2026-W02', 4)).toEqual(['2025-W51', '2025-W52', '2026-W01', '2026-W02']);
    expect(recentWaveIds('2021-W01', 2)).toEqual(['2020-W53', '2021-W01']);
  });

  it('falls back to the given id for an unknown format', () => {
    expect(recentWaveIds('demo')).toEqual(['demo']);
  });
});

describe('sortByGap', () => {
  const row = (slug: string, diff: number | null): SchoolTopicRow => ({
    slug,
    title: slug,
    icon: '',
    score: null,
    formScore: null,
    diff,
  });

  it('puts the biggest shortfall first and rows without comparison last', () => {
    expect(sortByGap([row('a', 3), row('b', null), row('c', -8), row('d', -1)]).map((r) => r.slug)).toEqual([
      'c',
      'd',
      'a',
      'b',
    ]);
  });
});

const school = {
  id: '111',
  name: 'Testschule',
  city: 'Köln',
  schoolForm: 'gymnasium',
  kreisId: '05315',
  joinCode: 'ABC123',
} as School;

const topic = (slug: string, sort: number, audience: Topic['audience'] = ['student']): Topic => ({
  slug,
  title: slug,
  icon: '🙂',
  audience,
  mandatory: false,
  sort,
  priority: 'P0',
});

function fakeSource(own: Partial<AggregateRow> = {}) {
  const queries: AggregateQuery[] = [];
  const source = {
    getCurrentWave: async () => ({ id: '2026-W43', startsAt: '2026-10-19', endsAt: '2026-10-25' }),
    getTopics: async () => [topic('stress', 2), topic('ai', 1), topic('t_ai', 3, ['teacher'])],
    getAggregates: async (query: AggregateQuery): Promise<AggregateRow[]> => {
      queries.push(query);
      if (query.level === 'nrw') {
        return [{ id: 'nrw', n: 400, score: 60, delta: 1, topicScores: { ai: 50, stress: 70 } }];
      }
      return [
        { id: '999', n: 30, score: 10, delta: 0, topicScores: { ai: 10, stress: 10 } },
        { id: '111', n: 25, score: 65, delta: 2, topicScores: { ai: 40, stress: 72.5 }, ...own },
      ];
    },
    getTrend: async (query: TrendQuery) => [
      { id: '999', waveId: '2026-W43', n: 30, score: 10 },
      { id: '111', waveId: '2026-W42', n: 25, score: 60 },
      { id: '111', waveId: '2026-W43', n: 25, score: 65 },
      ...(query.waveIds.length ? [] : []),
    ],
  } as unknown as DataSource;
  return { source, queries };
}

describe('loadSchoolDashboard', () => {
  it('compares the own school with the average of its school form, per topic', async () => {
    const { source, queries } = fakeSource();
    const data = await loadSchoolDashboard(source, school, 10);

    expect(data).toMatchObject({ n: 25, score: 65, delta: 2, form: { n: 400, score: 60 } });
    expect(queries).toContainEqual({ level: 'nrw', topic: 'all', schoolForm: ['gymnasium'] });
    expect(queries).toContainEqual({ level: 'school', topic: 'all', parentId: '05315' });
    // Nur Schüler:innen-Themen, nach Katalogreihenfolge.
    expect(data.topics.map((t) => [t.slug, t.score, t.formScore, t.diff])).toEqual([
      ['ai', 40, 50, -10],
      ['stress', 72.5, 70, 2.5],
    ]);
  });

  it('only returns the own school, never other schools from the same Kreis', async () => {
    const { source } = fakeSource();
    const data = await loadSchoolDashboard(source, school, 10);
    expect(JSON.stringify(data)).not.toContain('"999"');
    expect(data.trend.filter((p) => p.score != null)).toEqual([
      { waveId: '2026-W42', score: 60 },
      { waveId: '2026-W43', score: 65 },
    ]);
    expect(data.trend).toHaveLength(8);
  });

  it('keeps suppressed values suppressed (below K_MIN)', async () => {
    const { source } = fakeSource({
      n: 4,
      score: null,
      delta: null,
      topicScores: { ai: null, stress: null },
    });
    const data = await loadSchoolDashboard(source, school, 10);
    expect(data.score).toBeNull();
    expect(data.topics.every((t) => t.score === null && t.diff === null)).toBe(true);
  });
});

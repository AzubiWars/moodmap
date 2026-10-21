import type { AggregateRow, Topic, TopicSlug } from '@/types';
import { gapAnalysis, nrwReference } from './detailStats';

const topic = (slug: string, sort: number): Topic => ({
  slug: slug as TopicSlug,
  title: slug,
  icon: '•',
  audience: ['student'],
  mandatory: false,
  sort,
  priority: 'core' as Topic['priority'],
});

const TOPICS = [
  topic('overall', 0),
  topic('stress', 1),
  topic('ai', 2),
  topic('digital', 3),
  topic('food', 4),
];

const row = (
  id: string,
  n: number,
  score: number | null,
  topicScores: Record<string, number | null>,
): AggregateRow => ({
  id,
  n,
  score,
  delta: null,
  topicScores: topicScores as AggregateRow['topicScores'],
});

describe('nrwReference', () => {
  it('takes the single NRW row from getAggregates({ level: "nrw" })', () => {
    const ref = nrwReference([row('nrw', 400, 55, { stress: 50, ai: null })]);
    expect(ref).toEqual({ score: 55, topicScores: { stress: 50, ai: null } });
  });

  it('returns null without data', () => {
    expect(nrwReference(undefined)).toEqual({ score: null, topicScores: {} });
  });
});

describe('gapAnalysis', () => {
  const nrw = nrwReference([row('nrw', 100, 55, { overall: 50, stress: 50, ai: 40, digital: 50, food: 50 })]);

  it('ranks weaknesses by the larger deficit (delta to NRW or distance below 40)', () => {
    const gaps = gapAnalysis(TOPICS, { overall: 20, stress: 45, ai: 35, digital: 70, food: null }, nrw);
    // stress: Δ −5 · ai: Δ −5, aber 5 unter 40 → gleich; overall ist kein Handlungsfeld
    expect(gaps.weaknesses.map((g) => g.slug)).toEqual(['stress', 'ai']);
    expect(gaps.strengths.map((g) => g.slug)).toEqual(['digital']);
  });

  it('puts a low absolute score first even with a small delta', () => {
    const gaps = gapAnalysis(
      TOPICS,
      { stress: 48, ai: 30, digital: 50 },
      nrwReference([row('nrw', 1, 50, { stress: 50, ai: 31, digital: 50 })]),
    );
    expect(gaps.weaknesses.map((g) => g.slug)).toEqual(['ai', 'stress']);
  });

  it('marks topics under K_MIN without delta and keeps topic order', () => {
    const gaps = gapAnalysis(TOPICS, { stress: 45, food: null }, nrw);
    expect(gaps.topics.map((g) => g.slug)).toEqual(['overall', 'stress', 'ai', 'digital', 'food']);
    expect(gaps.topics.find((g) => g.slug === 'food')).toMatchObject({ score: null, delta: null, nrw: 50 });
  });
});

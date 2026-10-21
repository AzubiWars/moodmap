import { aggregateRows } from './mockAggregates';
import type { MockDataset } from './mockRecords';
import type { School } from '@/types';

const school = (id: string): School => ({
  id,
  name: `Demo ${id}`,
  kreisId: '05111',
  city: 'Düsseldorf',
  schoolForm: 'gesamtschule',
  lat: 51.2,
  lon: 6.8,
  studentCount: 100,
  joinCode: id,
});

function cohort(
  count: number,
  schoolId: string,
  value: number,
  waveId = 'current',
): Pick<MockDataset, 'responses' | 'answers'> {
  const responses = Array.from({ length: count }, (_, i) => ({
    id: `${schoolId}-${waveId}-${i}`,
    schoolId,
    waveId,
    role: 'student' as const,
    gradeBand: '8-10' as const,
    createdAt: '2026-10-21',
  }));
  return {
    responses,
    answers: responses.map((response) => ({ responseId: response.id, questionId: 'ai.core', value })),
  };
}

function dataset(...parts: Pick<MockDataset, 'responses' | 'answers'>[]): MockDataset {
  return {
    schools: [school('a'), school('b')],
    waves: [],
    responses: parts.flatMap((part) => part.responses),
    answers: parts.flatMap((part) => part.answers),
  };
}

describe('mock aggregates', () => {
  it('aggregates raw answers across schools instead of averaging school scores', () => {
    const data = dataset(cohort(9, 'a', 1), cohort(11, 'b', 5));
    expect(aggregateRows(data, { level: 'kreis', topic: 'ai' }, ['current'], [], 10)[0]).toMatchObject({
      n: 20,
      score: 55,
      delta: null,
    });
    expect(aggregateRows(data, { level: 'school', topic: 'ai' }, ['current'], [], 10)).toMatchObject([
      { id: 'a', n: 9, score: null },
      { id: 'b', n: 11, score: 100 },
    ]);
  });

  it('suppresses multiple answers by fewer than ten participants', () => {
    const part = cohort(4, 'a', 5);
    part.answers.push(
      ...part.responses.flatMap((response) => [
        { responseId: response.id, questionId: 'ai.swipe.explain', value: 1 },
        { responseId: response.id, questionId: 'ai.swipe.rules', value: 1 },
      ]),
    );
    expect(
      aggregateRows(dataset(part), { level: 'kreis', topic: 'ai' }, ['current'], [], 10)[0],
    ).toMatchObject({ n: 4, score: null, topicScores: { ai: null } });
  });

  it('applies every filter before K_MIN and keeps empty units grey', () => {
    const data = dataset(cohort(10, 'a', 5));
    expect(
      aggregateRows(data, { level: 'school', topic: 'ai', gradeBand: ['oberstufe'] }, ['current'], [], 10),
    ).toMatchObject([
      { id: 'a', n: 0, score: null },
      { id: 'b', n: 0, score: null },
    ]);
    expect(
      aggregateRows(data, { level: 'kreis', topic: 'ai', role: 'teacher' }, ['current'], [], 10)[0]?.score,
    ).toBeNull();
    expect(
      aggregateRows(data, { level: 'school', topic: 'ai', parentId: '05315' }, ['current'], [], 10),
    ).toEqual([]);
  });

  it('only computes a delta if both periods pass K_MIN', () => {
    const data = dataset(cohort(10, 'a', 5), cohort(10, 'a', 3, 'previous'));
    expect(
      aggregateRows(data, { level: 'kreis', topic: 'ai' }, ['current'], ['previous'], 10)[0]?.delta,
    ).toBe(50);
    data.responses.pop();
    expect(
      aggregateRows(data, { level: 'kreis', topic: 'ai' }, ['current'], ['previous'], 10)[0]?.delta,
    ).toBeNull();
  });
});

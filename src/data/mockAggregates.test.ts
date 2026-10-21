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
  it('counts real (non-seed) submissions as liveN and suppresses them under K_MIN (#160)', () => {
    const seed = cohort(20, 'a', 3);
    const live = cohort(12, 'b', 4);
    const fewLive = cohort(3, 'a', 4, 'current');
    const data: MockDataset = {
      schools: [school('a'), school('b')],
      waves: [],
      responses: [
        ...seed.responses,
        ...live.responses.map((r) => ({ ...r, live: true })),
        ...fewLive.responses.map((r) => ({ ...r, id: `${r.id}-few`, live: true })),
      ],
      answers: [
        ...seed.answers,
        ...live.answers,
        ...fewLive.answers.map((a) => ({ ...a, responseId: `${a.responseId}-few` })),
      ],
    };
    const rows = aggregateRows(data, { level: 'school', topic: 'ai' }, ['current'], [], 10);
    expect(rows.find((r) => r.id === 'b')?.liveN).toBe(12);
    // Schule a: 20 Seed + 3 echte → 3 < K_MIN → unterdrückt
    expect(rows.find((r) => r.id === 'a')?.liveN).toBeUndefined();
  });

  it('aggregates NRW directly over all answers, not as a mean of the regbez rows (#140)', () => {
    // RegBez 051: 30 × KI sehr schlecht · RegBez 053: 10 × KI und Digital sehr gut
    const a = cohort(30, 'a', 1);
    const b = cohort(10, 'b', 5);
    const data: MockDataset = {
      schools: [school('a'), { ...school('b'), kreisId: '05315' }],
      waves: [],
      responses: [...a.responses, ...b.responses],
      answers: [
        ...a.answers,
        ...b.answers,
        ...b.responses.map((r) => ({ responseId: r.id, questionId: 'digital.core', value: 5 })),
      ],
    };
    const [nrw, ...rest] = aggregateRows(data, { level: 'nrw', topic: 'all' }, ['current'], [], 10);
    expect(rest).toEqual([]);
    expect(nrw).toMatchObject({ id: 'nrw', n: 40 });
    // KI über alle 40 Antworten = 25, Digital = 100 → Gesamt-Mood = Ø der Themen = 62,5
    expect(nrw!.topicScores?.ai).toBe(25);
    expect(nrw!.topicScores?.digital).toBe(100);
    expect(nrw!.score).toBe(62.5);
    // Das n-gewichtete Mittel der Bezirke (0 × 30 + 100 × 10) / 40 = 25 wäre falsch
    const regbez = aggregateRows(data, { level: 'regbez', topic: 'all' }, ['current'], [], 10);
    const weighted = regbez.reduce((sum, r) => sum + (r.score ?? 0) * r.n, 0) / 40;
    expect(weighted).not.toBe(nrw!.score);
  });

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

  it('applies every filter before K_MIN, omits empty school rows and keeps empty districts grey', () => {
    const data = dataset(cohort(10, 'a', 5));
    expect(
      aggregateRows(data, { level: 'school', topic: 'ai', gradeBand: ['oberstufe'] }, ['current'], [], 10),
    ).toEqual([]);
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

  it('counts mood5 answers per level and hides the distribution below K_MIN', () => {
    const part = cohort(12, 'a', 1);
    part.answers[0]!.value = 3;
    // Swipe- und Choice-Antworten gehören nicht in die Verteilung.
    part.answers.push({ responseId: part.responses[1]!.id, questionId: 'ai.swipe.rules', value: 1 });
    // Doppelte Antwort derselben Teilnahme auf dieselbe Frage zählt nur einmal.
    part.answers.push({ responseId: part.responses[2]!.id, questionId: 'ai.core', value: 5 });
    const data = dataset(part, cohort(4, 'b', 5));
    expect(aggregateRows(data, { level: 'kreis', topic: 'ai' }, ['current'], [], 10)[0]).toMatchObject({
      n: 16,
      distribution: { 1: 11, 2: 0, 3: 1, 4: 0, 5: 4 },
    });
    expect(
      aggregateRows(data, { level: 'school', topic: 'ai' }, ['current'], [], 10).map(
        (row) => row.distribution,
      ),
    ).toEqual([{ 1: 11, 2: 0, 3: 1, 4: 0, 5: 0 }, null]);
    expect(aggregateRows(data, { level: 'kreis', topic: 'all' }, ['current'], [], 10)[0]).not.toHaveProperty(
      'distribution',
    );
  });
});

// @vitest-environment node
// get_aggregates (#79): SQL must compute exactly what the MockDataSource computes (ADR-003).
import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMockSource } from '../../src/data/mockSource.ts';
import { QUESTIONS } from '../../src/data/topics.ts';
import type { AggregateQuery, AggregateRow } from '../../src/types/index.ts';
import { loadSeedSources } from '../../scripts/lib/supabase-seed.ts';
import {
  buildAggregateFixture,
  insertAggregateFixture,
  KREIS_AT_K_MIN,
  mockDatasetFrom,
  SCHOOL_AT_K_MIN,
} from './fixtures.ts';
import { asRole, createTestDb } from './harness.ts';

const seedSql = readFileSync(fileURLToPath(new URL('../seed.sql', import.meta.url)), 'utf8');
const { schools } = loadSeedSources();

let db: PGlite;
let mock: ReturnType<typeof createMockSource>;

beforeAll(async () => {
  db = await createTestDb();
  await db.exec(seedSql);
  const fixture = buildAggregateFixture(schools, QUESTIONS);
  await insertAggregateFixture(db, fixture);
  const dataset = await mockDatasetFrom(db, schools, fixture);
  mock = createMockSource({
    loadData: async () => dataset,
    storage: null,
    channel: null,
    now: () => new Date('2026-10-21T10:00:00Z'),
  });
});

afterAll(() => mock?.dispose());

const sqlAggregates = async (query: unknown): Promise<AggregateRow[]> => {
  const { rows } = await asRole(db, 'anon', () =>
    db.query<{ result: AggregateRow[] }>('select public.get_aggregates($1::jsonb) as result', [
      JSON.stringify(query),
    ]),
  );
  return rows[0]!.result;
};

const row = (rows: AggregateRow[], id: string) => rows.find((r) => r.id === id)!;

describe('parity with the MockDataSource', () => {
  const WAVE_SETS = [
    ['2026-W43'],
    ['2026-W42', '2026-W43'],
    ['2026-W41'],
    ['2026-W40'],
    ['2026-W43', '2026-W40'],
  ];
  const TOPICS = ['all', 'stress', 'voice', 'overall', 'ai', 'digital'];
  const FILTERS: Partial<AggregateQuery>[] = [
    {},
    { schoolForm: ['gymnasium', 'gesamtschule'] },
    { gradeBand: ['8-10', 'oberstufe'] },
    { role: 'teacher' },
    { role: 'student', gradeBand: ['5-7'] },
  ];
  const SCOPES: Partial<AggregateQuery>[] = [
    { level: 'nrw' },
    { level: 'nrw', parentId: '053' }, // parentId is ignored for nrw (#147)
    { level: 'regbez' },
    { level: 'kreis' },
    { level: 'kreis', parentId: '053' },
    { level: 'school', parentId: '05111' },
    { level: 'school', parentId: KREIS_AT_K_MIN },
  ];
  // Every scope × topic × wave set; the filters rotate through them (PGlite is too slow for the full
  // cross product within the CI budget from #76).
  const queries = SCOPES.flatMap((scope) =>
    TOPICS.flatMap((topic) => WAVE_SETS.map((waveIds) => ({ ...scope, topic, waveIds }) as AggregateQuery)),
  ).map((query, i) => ({ ...query, ...FILTERS[i % FILTERS.length] }));

  it(`returns identical rows for ${queries.length} queries`, async () => {
    let compared = 0;
    let withScore = 0;
    let withDelta = 0;
    for (const query of queries) {
      const [sql, ts] = [await sqlAggregates(query), await mock.getAggregates(query)];
      expect(sql, JSON.stringify(query)).toEqual(ts);
      compared += sql.length;
      withScore += sql.filter((r) => r.score !== null).length;
      withDelta += sql.filter((r) => r.delta !== null).length;
    }
    // Guard against a vacuous pass: the fixture must produce real scores and deltas.
    expect(compared).toBeGreaterThan(500);
    expect(withScore).toBeGreaterThan(100);
    expect(withDelta).toBeGreaterThan(20);
  }, 60_000);
});

describe('K_MIN on the server', () => {
  it('hides a school score at n = 9 and shows it at n = 10', async () => {
    const rows = await sqlAggregates({
      level: 'school',
      topic: 'stress',
      parentId: '05111',
      waveIds: ['2026-W43'],
    });
    const atKMin = row(rows, SCHOOL_AT_K_MIN);
    const below = rows.find((r) => r.id !== SCHOOL_AT_K_MIN && r.n === 9)!;
    expect(atKMin).toMatchObject({ n: 10, score: expect.any(Number) });
    expect(below).toMatchObject({ n: 9, score: null, delta: null });
  });

  it('counts distinct responses, not answers, and ignores choice-only responses', async () => {
    const all = (waveIds: string[]) => sqlAggregates({ level: 'kreis', topic: 'all', waveIds });
    expect(row(await all(['2026-W43']), KREIS_AT_K_MIN)).toMatchObject({ n: 9, score: null });
    // 11 responses, 1 of them only answered choice questions → n = 10.
    expect(row(await all(['2026-W41']), KREIS_AT_K_MIN)).toMatchObject({ n: 10, score: expect.any(Number) });
  });

  it('reports a delta only when both periods reach K_MIN', async () => {
    const rows = await sqlAggregates({ level: 'kreis', topic: 'stress', waveIds: ['2026-W42'] });
    // W42: 10 stress answers, previous wave W41: 10 → delta; W43 vs W42: 9 → none.
    expect(row(rows, KREIS_AT_K_MIN).delta).not.toBeNull();
    const w43 = await sqlAggregates({ level: 'kreis', topic: 'stress', waveIds: ['2026-W43'] });
    expect(row(w43, KREIS_AT_K_MIN).delta).toBeNull();
  });
});

describe('score arithmetic (hand-calculated)', () => {
  let small: PGlite;

  beforeAll(async () => {
    small = await createTestDb();
    await small.exec(seedSql);
    // 10 responses: stress core = 4 (75 points); 5 of them also swipe "yes" (100 points, weight 0.5).
    const values = Array.from({ length: 10 }, (_, i) => i);
    await small.exec(`
      insert into public.responses (id, school_id, wave_id, role, device_hash)
      select ('00000000-0000-4000-9000-' || lpad(i::text, 12, '0'))::uuid, '900000', '2026-W43', 'student', lpad(to_hex(i + 1), 64, '0')
      from unnest(array[${values.join(',')}]) i;
      insert into public.answers (response_id, question_id, value)
      select ('00000000-0000-4000-9000-' || lpad(i::text, 12, '0'))::uuid, 'stress.core', 4 from unnest(array[${values.join(',')}]) i;
      insert into public.answers (response_id, question_id, value)
      select ('00000000-0000-4000-9000-' || lpad(i::text, 12, '0'))::uuid, q.id, 1
      from unnest(array[0, 1, 2, 3, 4]) i, (select id from public.questions where topic_slug = 'stress' and type = 'swipe' limit 1) q;
    `);
  });

  it('weights core and swipe answers: (10·75 + 5·100·0.5) / (10 + 5·0.5) = 80', async () => {
    const { rows } = await small.query<{ result: AggregateRow[] }>(
      `select public.get_aggregates('{"level":"school","topic":"stress","parentId":"05111","waveIds":["2026-W43"]}') as result`,
    );
    expect(row(rows[0]!.result, '900000')).toMatchObject({ n: 10, score: 80, topicScores: { stress: 80 } });
  });

  it('rounds like Math.round, also for negative values', async () => {
    const { rows } = await small.query<{ a: number; b: number; c: number }>(
      'select public.round1(-1.25) as a, public.round1(62.35) as b, public.round1(0.05) as c',
    );
    expect(rows[0]).toEqual({
      a: Math.round(-12.5) / 10,
      b: Math.round(623.5) / 10,
      c: Math.round(0.5) / 10,
    });
  });

  it('scores answers like scoreAnswer, including invert', async () => {
    const { rows } = await small.query<{ p: (number | null)[] }>(`
      select array[
        public.answer_points('mood5', 1::smallint, false), public.answer_points('mood5', 5::smallint, false),
        public.answer_points('mood5', 4::smallint, true), public.answer_points('swipe', 1::smallint, false),
        public.answer_points('swipe', 0::smallint, true), public.answer_points('choice', 1::smallint, false),
        public.answer_points('mood5', 0::smallint, false)
      ] as p`);
    expect(rows[0]!.p).toEqual([0, 100, 25, 100, 100, null, null]);
  });

  it('uses the current wave when no waveIds are given', async () => {
    const { rows } = await small.query<{ same: boolean }>(`
      select public.get_aggregates('{"level":"school","topic":"stress","parentId":"05111"}')
        = public.get_aggregates(jsonb_build_object('level', 'school', 'topic', 'stress', 'parentId', '05111',
            'waveIds', jsonb_build_array(public.current_wave_id()))) as same`);
    expect(rows[0]!.same).toBe(true);
  });
});

describe('input validation and exposure', () => {
  it.each([
    ['not an object', '[]', /must be an object/],
    ['missing level', { topic: 'all' }, /level must be/],
    ['invalid level', { level: 'planet', topic: 'all' }, /level must be/],
    ['missing topic', { level: 'kreis' }, /topic is required/],
    ['invalid role', { level: 'kreis', topic: 'all', role: 'admin' }, /invalid role/],
    [
      'schoolForm not an array',
      { level: 'kreis', topic: 'all', schoolForm: 'gymnasium' },
      /must be an array/,
    ],
  ])('rejects %s', async (_, query, message) => {
    await expect(sqlAggregates(typeof query === 'string' ? JSON.parse(query) : query)).rejects.toThrow(
      message,
    );
  });

  it('exposes only get_aggregates, not the internal helpers', async () => {
    for (const sql of [
      `select public.aggregate_rows('{}', '{}', '{}')`,
      'select public.k_min()',
      'select public.round1(1)',
      `select public.previous_wave_ids('{}')`,
    ]) {
      await expect(asRole(db, 'anon', () => db.query(sql))).rejects.toThrow(/permission denied/);
    }
  });
});

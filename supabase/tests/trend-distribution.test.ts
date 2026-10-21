// @vitest-environment node
// get_trend + get_choice_distribution (#80): parity with the MockDataSource on the #79 fixtures.
import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMockSource } from '../../src/data/mockSource.ts';
import { QUESTIONS } from '../../src/data/topics.ts';
import type { AggregateQuery, Distribution, Scope, TrendPoint, TrendQuery } from '../../src/types/index.ts';
import { loadSeedSources } from '../../scripts/lib/supabase-seed.ts';
import {
  buildAggregateFixture,
  insertAggregateFixture,
  KREIS_AT_K_MIN,
  mockDatasetFrom,
} from './fixtures.ts';
import { asRole, createTestDb } from './harness.ts';

const seedSql = readFileSync(fileURLToPath(new URL('../seed.sql', import.meta.url)), 'utf8');
const { schools } = loadSeedSources();
/** The mock's clock; the SQL side gets the same wave explicitly, so the tests do not depend on the date. */
const CURRENT = '2026-W43';

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

async function select<T>(sql: string, params: unknown[], role?: 'anon'): Promise<T> {
  const run = () => db.query<{ result: T }>(`select ${sql} as result`, params);
  const { rows } = role ? await asRole(db, role, run) : await run();
  return rows[0]!.result;
}

const sqlTrend = (query: unknown) =>
  select<TrendPoint[]>('public.get_trend($1::jsonb)', [JSON.stringify(query)], 'anon');
const sqlDistribution = (questionId: string, scope: unknown) =>
  select<Distribution | null>('public.choice_distribution($1, $2::jsonb, $3)', [
    questionId,
    JSON.stringify(scope),
    CURRENT,
  ]);

describe('get_trend', () => {
  const SCOPES: Partial<AggregateQuery>[] = [
    { level: 'nrw' },
    { level: 'regbez' },
    { level: 'kreis' },
    { level: 'school', parentId: '05111' },
    { level: 'school', parentId: KREIS_AT_K_MIN },
  ];
  const FILTERS: Partial<AggregateQuery>[] = [
    {},
    { schoolForm: ['gymnasium'] },
    { gradeBand: ['8-10'] },
    { role: 'student' },
  ];
  const WAVE_SETS = [
    ['2026-W40', '2026-W41', '2026-W42', '2026-W43'],
    ['2026-W43', '2026-W41', '2030-W01'], // unordered + unknown wave
  ];
  const queries = SCOPES.flatMap((scope) =>
    ['all', 'stress', 'voice'].flatMap((topic) => WAVE_SETS.map((waveIds) => ({ ...scope, topic, waveIds }))),
  ).map((query, i) => ({ ...query, ...FILTERS[i % FILTERS.length] }) as TrendQuery);

  it(`matches the MockDataSource for ${queries.length} trend queries`, async () => {
    let points = 0;
    let withScore = 0;
    for (const query of queries) {
      const [sql, ts] = [await sqlTrend(query), await mock.getTrend(query)];
      expect(sql, JSON.stringify(query)).toEqual(ts);
      points += sql.length;
      withScore += sql.filter((p) => p.score !== null).length;
    }
    expect(points).toBeGreaterThan(200);
    expect(withScore).toBeGreaterThan(30);
  }, 60_000);

  it('orders points by wave and skips unknown waves', async () => {
    const points = await sqlTrend({
      level: 'regbez',
      topic: 'all',
      waveIds: ['2026-W43', '2030-W01', '2026-W40'],
    });
    expect([...new Set(points.map((p) => p.waveId))]).toEqual(['2026-W40', '2026-W43']);
  });

  it('requires waveIds', async () => {
    await expect(sqlTrend({ level: 'kreis', topic: 'all' })).rejects.toThrow(/waveIds is required/);
  });
});

describe('get_choice_distribution', () => {
  const choiceQuestions = QUESTIONS.filter((q) => q.type === 'choice').map((q) => q.id);
  const SCOPES: Scope[] = [
    { level: 'nrw', id: null },
    { level: 'nrw', id: 'x' }, // NRW only with id = null, like schoolInScope()
    { level: 'regbez', id: '051' },
    { level: 'regbez', id: '057' },
    { level: 'kreis', id: '05111' },
    { level: 'kreis', id: KREIS_AT_K_MIN },
    { level: 'school', id: '900000' },
  ];

  it(`matches the MockDataSource for ${choiceQuestions.length} questions × ${SCOPES.length} scopes`, async () => {
    let shown = 0;
    let hidden = 0;
    let masked = 0;
    for (const questionId of choiceQuestions) {
      for (const scope of SCOPES) {
        const [sql, ts] = [
          await sqlDistribution(questionId, scope),
          await mock.getChoiceDistribution(questionId, scope),
        ];
        expect(sql, `${questionId} ${JSON.stringify(scope)}`).toEqual(ts);
        if (sql) shown++;
        else hidden++;
        masked += sql?.options.filter((o) => o.count === null).length ?? 0;
      }
    }
    // Non-vacuous: shown, hidden (< K_MIN) and masked (< 3) cases all occur.
    expect(shown).toBeGreaterThan(5);
    expect(hidden).toBeGreaterThan(5);
    expect(masked).toBeGreaterThan(0);
  });

  it('never reveals counts below 3 and never answers below K_MIN', async () => {
    for (const questionId of choiceQuestions) {
      const d = await sqlDistribution(questionId, { level: 'nrw', id: null });
      if (!d) continue;
      expect(d.n).toBeGreaterThanOrEqual(10);
      for (const o of d.options) expect(o.count === null || o.count >= 3).toBe(true);
    }
  });

  it('returns null for unknown and non-choice questions', async () => {
    await expect(sqlDistribution('nope', { level: 'nrw', id: null })).resolves.toBeNull();
    await expect(sqlDistribution('stress.core', { level: 'nrw', id: null })).resolves.toBeNull();
  });

  it('rejects an invalid scope', async () => {
    await expect(sqlDistribution(choiceQuestions[0]!, { level: 'planet', id: null })).rejects.toThrow(
      /scope.level/,
    );
  });

  it('uses the current wave and exposes only the public function', async () => {
    const scope = JSON.stringify({ level: 'nrw', id: null });
    const [publicResult, internal] = [
      await select('public.get_choice_distribution($1, $2::jsonb)', [choiceQuestions[0], scope], 'anon'),
      await select('public.choice_distribution($1, $2::jsonb, public.current_wave_id())', [
        choiceQuestions[0],
        scope,
      ]),
    ];
    expect(publicResult).toEqual(internal);
    await expect(
      select('public.choice_distribution($1, $2::jsonb, $3)', [choiceQuestions[0], scope, CURRENT], 'anon'),
    ).rejects.toThrow(/permission denied/);
  });
});

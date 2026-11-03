// @vitest-environment node
// Rollup aggregation (ADR-019) + source filter (#270): the rollup always equals a rebuild from raw
// answers, and two sources aggregate independently, identical to the MockDataSource.
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMockSource } from '../../src/data/mockSource.ts';
import { QUESTIONS } from '../../src/data/topics.ts';
import type { AggregateQuery, AggregateRow, Scope, TensionRow } from '../../src/types/index.ts';
import { buildSeedSql, loadSeedSources } from '../../scripts/lib/supabase-seed.ts';
import { buildAggregateFixture, insertAggregateFixture, mockDatasetFrom } from './fixtures.ts';
import { asRole, createTestDb } from './harness.ts';

const seedSources = loadSeedSources({ synthetic: true });
const seedSql = buildSeedSql(seedSources);
const { schools } = seedSources;

let db: PGlite;
let mock: ReturnType<typeof createMockSource>;

// Two independent fixtures: one in `live` (default), one in `demo-seed`.
const live = buildAggregateFixture(schools, QUESTIONS, 79);
const demo = buildAggregateFixture(schools, QUESTIONS, 270);
const prefix = (id: string) => `d${id.slice(1)}`;
const demoFixture = {
  responses: demo.responses.map((r) => ({ ...r, id: prefix(r.id), sourceId: 'demo-seed' })),
  answers: demo.answers.map((a) => ({ ...a, responseId: prefix(a.responseId) })),
};

beforeAll(async () => {
  db = await createTestDb();
  await db.exec(seedSql);
  await insertAggregateFixture(db, live);
  await insertAggregateFixture(db, demoFixture, 1_000_000);
  const dataset = await mockDatasetFrom(db, schools, {
    responses: [...live.responses, ...demoFixture.responses],
    answers: [...live.answers, ...demoFixture.answers],
  });
  mock = createMockSource({
    loadData: async () => dataset,
    storage: null,
    channel: null,
    now: () => new Date('2026-10-21T10:00:00Z'),
  });
});

afterAll(async () => {
  mock?.dispose();
  await db.close();
});

const call = async <T>(fn: string, arg: unknown): Promise<T> => {
  const { rows } = await asRole(db, 'anon', () =>
    db.query<{ result: T }>(`select public.${fn}($1::jsonb) as result`, [JSON.stringify(arg)]),
  );
  return rows[0]!.result;
};

/** Non-zero rollup rows in a stable order. */
const rollup = async () =>
  (
    await db.query(
      `select * from private.response_rollup
       where answered <> 0 or counted <> 0 or sum_pw <> 0 or sum_w <> 0 or d1 + d2 + d3 + d4 + d5 <> 0
       order by source_id, wave_id, school_id, role, grade_band, topic_slug`,
    )
  ).rows;

const expectRollupConsistent = async () => {
  const incremental = await rollup();
  await db.query('select private.rebuild_response_rollup()');
  expect(incremental).toEqual(await rollup());
};

describe('source filter (#270)', () => {
  const QUERIES: AggregateQuery[] = [
    { level: 'nrw', topic: 'all', waveIds: ['2026-W43'] },
    { level: 'regbez', topic: 'stress', waveIds: ['2026-W42', '2026-W43'] },
    { level: 'kreis', topic: 'all', waveIds: ['2026-W41'] },
    { level: 'school', topic: 'voice', waveIds: ['2026-W43'], parentId: '05111' },
    { level: 'kreis', topic: 'all', waveIds: ['2026-W43'], role: 'student', gradeBand: ['8-10'] },
  ];

  it('aggregates each source on its own, identical to the mock', async () => {
    for (const base of QUERIES) {
      for (const sourceId of [undefined, 'live', 'demo-seed']) {
        const query = sourceId ? { ...base, sourceId } : base;
        expect(await call<AggregateRow[]>('get_aggregates', query), JSON.stringify(query)).toEqual(
          await mock.getAggregates(query),
        );
      }
    }
  });

  it('keeps trend and tension index per source, identical to the mock', async () => {
    for (const sourceId of ['live', 'demo-seed']) {
      const trend = {
        level: 'regbez' as const,
        topic: 'all',
        waveIds: ['2026-W41', '2026-W42', '2026-W43'],
        sourceId,
      };
      expect(await call('get_trend', trend)).toEqual(await mock.getTrend(trend));
      const tension = { level: 'kreis' as const, topic: 'all', waveIds: ['2026-W43'], sourceId };
      expect(await call<TensionRow[]>('get_tension_index', tension)).toEqual(
        await mock.getTensionIndex(tension),
      );
    }
  });

  it('the two sources really differ', async () => {
    const query = { level: 'nrw' as const, topic: 'all', waveIds: ['2026-W43'] };
    const [a, b] = await Promise.all([
      call<AggregateRow[]>('get_aggregates', { ...query, sourceId: 'live' }),
      call<AggregateRow[]>('get_aggregates', { ...query, sourceId: 'demo-seed' }),
    ]);
    expect(a[0]!.n).not.toBe(b[0]!.n);
  });

  it('rejects unknown sources in every RPC and in the mock, instead of falling back', async () => {
    const query = { level: 'nrw', topic: 'all', sourceId: 'nope' };
    for (const fn of ['get_aggregates', 'get_tension_index']) {
      await expect(call(fn, query)).rejects.toThrow(/unknown data source/);
    }
    await expect(call('get_trend', { ...query, waveIds: ['2026-W43'] })).rejects.toThrow(
      /unknown data source/,
    );
    const scope: Scope = { level: 'nrw', id: null, sourceId: 'nope' };
    await expect(
      asRole(db, 'anon', () =>
        db.query('select public.get_choice_distribution($1, $2::jsonb)', [
          'stress.deep',
          JSON.stringify(scope),
        ]),
      ),
    ).rejects.toThrow(/unknown data source/);
    await expect(mock.getAggregates(query as AggregateQuery)).rejects.toThrow(/Unbekannte Datenquelle/);
  });

  it('lists both sources with their sizes, like the mock', async () => {
    const sql = await asRole(db, 'anon', () =>
      db.query<{ result: unknown }>('select public.get_data_sources() as result'),
    );
    expect(sql.rows[0]!.result).toEqual(await mock.getDataSources());
  });
});

// Runs after the parity block: these tests mutate the database.
describe('rollup stays exact', () => {
  it('after bulk inserts of two sources', async () => {
    await expectRollupConsistent();
  });

  it('after deleting responses, single answers, updating answers and re-keying responses', async () => {
    await db.exec(`
      delete from public.responses where id in (select id from public.responses where source_id = 'live' order by id limit 25);
      delete from public.answers where (response_id, question_id) in (
        select response_id, question_id from public.answers order by response_id, question_id limit 40);
      update public.answers set value = 6 - value
        where question_id like '%.core' and value between 1 and 5
          and response_id in (select id from public.responses order by id limit 30);
      update public.responses set wave_id = '2026-W41'
        where id in (select id from public.responses where wave_id = '2026-W43' order by id limit 5);
      update public.responses set grade_band = null
        where id in (select id from public.responses where grade_band is not null order by id limit 5);
    `);
    await expectRollupConsistent();
  });

  it('ignores rows skipped by ON CONFLICT DO NOTHING', async () => {
    await db.exec(`
      insert into public.answers (response_id, question_id, value, choice)
      select response_id, question_id, value, choice from public.answers limit 50
      on conflict do nothing;
    `);
    await expectRollupConsistent();
  });

  it('after app submissions and own deletion through the RPCs', async () => {
    const school = schools.find((s) => s.id.startsWith('9'))!;
    const wave = (await call<{ id: string } | null>('get_current_wave', {}).catch(() => null)) ?? null;
    if (wave) {
      for (let i = 0; i < 3; i += 1) {
        await call('submit_response', {
          schoolId: school.id,
          waveId: wave.id,
          role: 'student',
          deviceToken: `rollup-device-token-${i}`,
          answers: [{ questionId: 'stress.core', value: 2 }],
        });
      }
      await call('delete_own_response', { waveId: wave.id, deviceToken: 'rollup-device-token-1' });
    }
    await expectRollupConsistent();
  });
});

describe('scale (ADR-019)', () => {
  it('answers aggregate queries from a rollup that is much smaller than the raw data', async () => {
    const big = await createTestDb();
    await big.exec(seedSql);
    // ~20 000 responses × 8 answers in the current wave, spread over all synthetic schools.
    await big.exec(`
      insert into public.responses (id, school_id, wave_id, role, grade_band, device_hash, created_at)
      select gen_random_uuid(), s.id, '2026-W43', case when g % 9 = 0 then 'teacher' else 'student' end,
        (array['5-7', '8-10', 'oberstufe', null])[1 + g % 4], encode(sha256((g::text)::bytea), 'hex'), '2026-10-20'
      from generate_series(1, 20000) g
      join lateral (select id from public.schools where id like '9%' and not is_test order by id
        offset g % (select count(*) from public.schools where id like '9%' and not is_test) limit 1) s on true;
      insert into public.answers (response_id, question_id, value)
      select r.id, q.id, case when q.type = 'mood5' then 1 + (abs(hashtext(r.id::text || q.id)) % 5)
        else abs(hashtext(r.id::text || q.id)) % 2 end
      from public.responses r
      cross join (select id, type from public.questions where type in ('mood5', 'swipe')
        and (audience is null or audience = 'student') order by id limit 8) q;
    `);
    const counts = await big.query<{ answers: number; rollup: number }>(`select
      (select count(*)::int from public.answers) as answers,
      (select count(*)::int from private.response_rollup) as rollup`);
    expect(counts.rows[0]!.rollup * 5).toBeLessThan(counts.rows[0]!.answers);

    const started = performance.now();
    const { rows } = await asRole(big, 'anon', () =>
      big.query<{ result: AggregateRow[] }>('select public.get_aggregates($1::jsonb) as result', [
        JSON.stringify({ level: 'kreis', topic: 'all', waveIds: ['2026-W43'] }),
      ]),
    );
    const elapsed = performance.now() - started;
    const total = rows[0]!.result.reduce((sum, row) => sum + row.n, 0);
    expect(total).toBeGreaterThan(19_000);
    console.info(`get_aggregates(kreis) over ${counts.rows[0]!.answers} answers: ${elapsed.toFixed(0)} ms`);
    await big.close();
  }, 120_000);
});

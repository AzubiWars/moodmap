// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { buildSyntheticAnswerSql } from '../../scripts/lib/synthetic-answer-seed.ts';
import { buildSeedSql, loadSeedSources } from '../../scripts/lib/supabase-seed.ts';
import { generateSeedData } from '../../src/data/seed/generateSeed.ts';
import { adaptSeed } from '../../src/data/mockBootstrap.ts';
import { createMockSource } from '../../src/data/mockSource.ts';
import { asRole, createTestDb } from './harness.ts';

const sources = loadSeedSources();
const schools = [...sources.schools.slice(0, 2)];
const seed = generateSeedData(schools, { waveCount: 2 });
const sql = buildSyntheticAnswerSql(seed, schools);
let db: PGlite;
beforeAll(async () => {
  db = await createTestDb();
  await db.exec(buildSeedSql(sources));
});
afterAll(async () => {
  await db.close();
});

describe('synthetic demo answer import', () => {
  it('produces a repeatable artifact with no raw tokens, free text or deletes', () => {
    expect(sql).toBe(buildSyntheticAnswerSql(seed, schools));
    for (const response of seed.responses) expect(sql).not.toContain(response.deviceToken);
    expect(sql).not.toMatch(/\bdelete\b|freetext_entries|policy_answer_ratings/i);
    expect(() => buildSyntheticAnswerSql(seed, [{ ...schools[0]!, id: '123456' }])).toThrow(/synthetische/);
    expect(() =>
      buildSyntheticAnswerSql(
        { ...seed, responses: [{ ...seed.responses[0]!, schoolId: 'pitch-test' }] },
        schools,
      ),
    ).toThrow(/Unbekannte/);
  });

  it('imports history once, keeps day precision and matches the browser mock aggregates', async () => {
    await db.exec(sql);
    await db.exec(sql);
    const count = await db.query<{ responses: number; answers: number; waves: number }>(`select
      (select count(*)::int from public.responses) as responses,
      (select count(*)::int from public.answers) as answers,
      (select count(distinct wave_id)::int from public.responses) as waves`);
    expect(count.rows[0]).toEqual({
      responses: seed.responses.length,
      answers: seed.responses.reduce((n, r) => n + r.answers.length, 0),
      waves: 2,
    });
    const dates = await db.query<{ day: string }>(
      "select to_char(created_at, 'YYYY-MM-DD') as day from public.responses",
    );
    expect(new Set(dates.rows.map((r) => r.day))).toEqual(new Set(seed.responses.map((r) => r.submittedAt)));
    const query = { level: 'school' as const, topic: 'all', waveIds: ['2026-W42', '2026-W43'] };
    const mock = createMockSource({
      loadData: async () => adaptSeed([...sources.schools], seed),
      storage: null,
      channel: null,
    });
    const actual = await asRole(db, 'anon', () =>
      db.query<{ result: unknown }>('select public.get_aggregates($1::jsonb) as result', [
        JSON.stringify(query),
      ]),
    );
    expect(actual.rows[0]!.result).toEqual(await mock.getAggregates(query));
    await expect(asRole(db, 'anon', () => db.query('select * from public.responses'))).rejects.toThrow(
      /permission denied/,
    );
    mock.dispose();
  });

  it('aborts if a school name does not match the expected synthetic catalog', async () => {
    const mismatched = buildSyntheticAnswerSql(
      seed,
      schools.map((school) => ({ ...school, name: 'Different catalog' })),
    );
    await expect(db.exec(mismatched)).rejects.toThrow(/catalog does not match/);
    await db.exec('rollback');
  });
});

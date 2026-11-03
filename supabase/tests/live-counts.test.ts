// @vitest-environment node
// Live delta poll (#253) and the active-school counter (#252).
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AggregateRow, LiveCounts } from '../../src/types/index.ts';
import { asRole, createTestDb, CURRENT_WAVE, insertFixtures } from './harness.ts';

let db: PGlite;
beforeAll(async () => {
  db = await createTestDb();
  await insertFixtures(db);
});
afterAll(async () => {
  await db.close();
});

const call = async <T>(fn: string, arg: unknown): Promise<T> =>
  (
    await asRole(db, 'anon', () =>
      db.query<{ result: T }>(`select public.${fn}($1::jsonb) as result`, [JSON.stringify(arg)]),
    )
  ).rows[0]!.result;

let token = 0;
const submit = (schoolId = '900000', answers = [{ questionId: 'stress.core', value: 3 }]) =>
  call('submit_response', {
    schoolId,
    waveId: CURRENT_WAVE,
    role: 'student',
    deviceToken: `live-count-token-${(token += 1)}`,
    answers,
  });

describe('get_live_counts (#253)', () => {
  it('returns counts per school with a version, and nothing when the version is known', async () => {
    await submit();
    await submit();
    // Choice-only answers count for nothing, like n in get_aggregates.
    await submit('900000', [{ questionId: 'stress.deep', choice: ['exams'] } as never]);
    await submit('pitch-test');
    const first = await call<LiveCounts>('get_live_counts', {});
    expect(first.rows).toEqual([{ id: '900000', n: 2 }]);
    const school = await call<AggregateRow[]>('get_aggregates', { level: 'school', topic: 'all' });
    expect(school.map(({ id, n }) => ({ id, n }))).toEqual(first.rows);

    const idle = await call<LiveCounts>('get_live_counts', { knownVersion: first.version });
    expect(idle).toEqual({ version: first.version, rows: null });

    await submit();
    const next = await call<LiveCounts>('get_live_counts', { knownVersion: first.version });
    expect(next.version).not.toBe(first.version);
    expect(next.rows).toEqual([{ id: '900000', n: 3 }]);
  });

  it('respects the source filter', async () => {
    expect(await call<LiveCounts>('get_live_counts', { sourceId: 'demo-seed' })).toMatchObject({ rows: [] });
    await expect(call('get_live_counts', { sourceId: 'nope' })).rejects.toThrow(/unknown data source/);
  });
});

describe('count_active_schools (#252)', () => {
  it('counts schools with scored answers in the current wave, never the test site', async () => {
    expect(await call<number>('count_active_schools', {})).toBe(1);
    expect(await call<number>('count_active_schools', { sourceId: 'demo-seed' })).toBe(0);
  });
});

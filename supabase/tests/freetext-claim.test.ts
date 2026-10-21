// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, createTestDb, CURRENT_WAVE, PREVIOUS_WAVE, insertFixtures } from './harness.ts';

let db: PGlite;
let counter = 0;
beforeAll(async () => {
  db = await createTestDb();
  await insertFixtures(db);
});
afterAll(async () => {
  await db.close();
});
const claim = async (id: string) =>
  (
    await asRole(db, 'service_role', () =>
      db.query<{ used: boolean }>('select public.claim_freetext_moderation($1::uuid) as used', [id]),
    )
  ).rows[0]!.used;
const register = async (schoolId = '900000', token = `claim-device-token-${counter++}`) => {
  const input = {
    schoolId,
    waveId: CURRENT_WAVE,
    deviceToken: token,
    role: 'student',
    answers: [{ questionId: 'stress.core', value: 3 }],
  };
  await asRole(db, 'anon', () =>
    db.query('select public.submit_response($1::jsonb)', [JSON.stringify(input)]),
  );
  const hash = createHash('sha256')
    .update(`${token}:${CURRENT_WAVE}${schoolId === 'pitch-test' ? ':pitch' : ''}`)
    .digest('hex');
  const { rows } = await db.query<{ id: string }>(
    'select id from public.responses where device_hash = $1 and wave_id = $2',
    [hash, CURRENT_WAVE],
  );
  return { id: rows[0]!.id, token, schoolId };
};

describe('atomic moderation allowance', () => {
  it('reserves exactly once, remains private and stores only the response ID', async () => {
    const response = await register();
    for (const role of ['anon', 'authenticated'] as const) {
      await expect(
        asRole(db, role, () => db.query('select public.claim_freetext_moderation($1)', [response.id])),
      ).rejects.toThrow(/permission denied/);
      await expect(
        asRole(db, role, () => db.query('select * from public.freetext_moderation_claims')),
      ).rejects.toThrow(/permission denied/);
    }
    expect(await claim(response.id)).toBe(true);
    expect(await claim(response.id)).toBe(false);
    const columns = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'freetext_moderation_claims'",
    );
    expect(columns.rows.map((row) => row.column_name)).toEqual(['response_id']);
    expect(await claim('00000000-0000-0000-0000-000000000000')).toBe(false);
  });

  it('does not reserve another attempt for an already stored text', async () => {
    const response = await register();
    await asRole(db, 'service_role', () =>
      db.query('select public.record_freetext($1::jsonb)', [
        JSON.stringify({
          schoolId: response.schoolId,
          waveId: CURRENT_WAVE,
          deviceToken: response.token,
          cleaned: 'Mehr Pausen.',
          topics: ['stress'],
          cluster: 'Pausen',
          concern: false,
        }),
      ]),
    );
    expect(await claim(response.id)).toBe(false);
  });

  it('does not reserve a moderation attempt for a previous wave', async () => {
    const response = await register();
    await db.query('update public.responses set wave_id = $1 where id = $2', [PREVIOUS_WAVE, response.id]);
    expect(await claim(response.id)).toBe(false);
    expect(
      (
        await db.query('select 1 from public.freetext_moderation_claims where response_id = $1', [
          response.id,
        ])
      ).rows,
    ).toEqual([]);
  });

  it('cascades pitch reset and own withdrawal without removing other reservations', async () => {
    const normal = await register();
    const test = await register('pitch-test', 'pitch-repeat-claim-token');
    expect(await claim(normal.id)).toBe(true);
    expect(await claim(test.id)).toBe(true);
    await asRole(db, 'service_role', () => db.query('select public.reset_pitch_test()'));
    const claims = await db.query<{ response_id: string }>(
      'select response_id from public.freetext_moderation_claims',
    );
    expect(claims.rows).toContainEqual({ response_id: normal.id });
    expect(claims.rows).not.toContainEqual({ response_id: test.id });
    const again = await register('pitch-test', test.token);
    expect(again.id).not.toBe(test.id);
    expect(await claim(again.id)).toBe(true);
    await asRole(db, 'anon', () =>
      db.query('select public.delete_own_response($1::jsonb)', [
        JSON.stringify({ waveId: CURRENT_WAVE, deviceToken: normal.token }),
      ]),
    );
    expect(
      (
        await db.query('select response_id from public.freetext_moderation_claims where response_id = $1', [
          normal.id,
        ])
      ).rows,
    ).toEqual([]);
  });
});

// @vitest-environment node
// Survey RPCs (#78): submit_response, get_school_by_code, get_current_wave – called as anon like the app.
import type { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { DeleteResult, ResponseInput, SubmitResult } from '../../src/types/index.ts';
import { asRole, createTestDb, CURRENT_WAVE, insertFixtures, PREVIOUS_WAVE, type DbRole } from './harness.ts';

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
  await insertFixtures(db);
});

async function rpc<T>(sql: string, params: unknown[] = [], role: DbRole = 'anon'): Promise<T> {
  const { rows } = await asRole(db, role, () => db.query<{ result: T }>(`select ${sql} as result`, params));
  return rows[0]!.result;
}

let tokenCounter = 0;
const newToken = () => `device-token-${String(++tokenCounter).padStart(8, '0')}`;

const validInput = (overrides: Partial<ResponseInput> = {}): ResponseInput => ({
  schoolId: '900000',
  waveId: CURRENT_WAVE,
  role: 'student',
  gradeBand: '8-10',
  deviceToken: newToken(),
  answers: [
    { questionId: 'stress.core', value: 4 },
    { questionId: 'stress.swipe', value: 1 },
    { questionId: 'stress.deep', choice: ['exams'] },
  ],
  ...overrides,
});

const submit = (input: unknown, role: DbRole = 'anon') =>
  rpc<SubmitResult>('public.submit_response($1::jsonb)', [JSON.stringify(input)], role);

const countRows = async (table: 'responses' | 'answers') =>
  Number((await db.query<{ n: number }>(`select count(*)::int as n from public.${table}`)).rows[0]!.n);

describe('submit_response', () => {
  it.each<DbRole>(['anon', 'authenticated'])('stores a valid response for %s', async (role) => {
    const input = validInput();
    const before = await countRows('answers');
    await expect(submit(input, role)).resolves.toEqual({ ok: true });
    expect(await countRows('answers')).toBe(before + 3);
  });

  it('stores only sha256(token:wave) and the day, never the token', async () => {
    const input = validInput();
    await submit(input);
    const expectedHash = createHash('sha256').update(`${input.deviceToken}:${CURRENT_WAVE}`).digest('hex');
    const { rows } = await db.query<{ device_hash: string; is_today: boolean; row: string }>(
      `select device_hash, created_at = current_date as is_today, r::text as row
       from public.responses r where device_hash = $1`,
      [expectedHash],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.is_today).toBe(true);
    expect(rows[0]!.row).not.toContain(input.deviceToken);
  });

  it('allows one response per device and wave', async () => {
    const input = validInput();
    await expect(submit(input)).resolves.toEqual({ ok: true });
    const before = await countRows('responses');
    await expect(submit({ ...input, answers: [{ questionId: 'stress.core', value: 1 }] })).resolves.toEqual({
      ok: false,
      reason: 'already_submitted',
    });
    expect(await countRows('responses')).toBe(before);
  });

  it('accepts a response without optional grade band and with skipped questions', async () => {
    await expect(
      submit(validInput({ gradeBand: undefined, answers: [{ questionId: 'stress.core', value: 3 }] })),
    ).resolves.toEqual({ ok: true });
  });

  it('accepts a run where every question was skipped, like the mock (#214)', async () => {
    const input = validInput({ answers: [] });
    const [responses, answers] = [await countRows('responses'), await countRows('answers')];
    await expect(submit(input)).resolves.toEqual({ ok: true });
    expect(await countRows('responses')).toBe(responses + 1); // takes part (double-participation guard) …
    expect(await countRows('answers')).toBe(answers); // … but contributes no answer to any score
    await expect(submit(input)).resolves.toEqual({ ok: false, reason: 'already_submitted' });
  });

  it.each([
    ['not an object', '"hello"', /must be an object/],
    ['unknown school', validInput({ schoolId: '999999' }), /unknown school/],
    ['past wave', validInput({ waveId: PREVIOUS_WAVE }), /not the current wave/],
    ['unknown wave', validInput({ waveId: '2030-W01' }), /not the current wave/],
    ['invalid role', { ...validInput(), role: 'admin' }, /invalid role/],
    ['invalid grade band', { ...validInput(), gradeBand: 'uni' }, /check constraint/],
    ['missing device token', { ...validInput(), deviceToken: undefined }, /invalid device token/],
    ['short device token', validInput({ deviceToken: 'abc' }), /invalid device token/],
    [
      'answers not an array',
      { ...validInput(), answers: { questionId: 'stress.core', value: 3 } },
      /at most 100/,
    ],
    [
      'more than 100 answers',
      validInput({ answers: Array.from({ length: 101 }, (_, i) => ({ questionId: `q${i}`, value: 3 })) }),
      /at most 100/,
    ],
    [
      'duplicate question',
      validInput({
        answers: [
          { questionId: 'stress.core', value: 4 },
          { questionId: 'stress.core', value: 2 },
        ],
      }),
      /duplicate/,
    ],
    ['unknown question', validInput({ answers: [{ questionId: 'nope', value: 3 }] }), /unknown question/],
    ['mood5 out of range', validInput({ answers: [{ questionId: 'stress.core', value: 7 }] }), /1–5/],
    ['mood5 not an integer', validInput({ answers: [{ questionId: 'stress.core', value: 3.5 }] }), /integer/],
    ['value as string', { ...validInput(), answers: [{ questionId: 'stress.core', value: '3' }] }, /integer/],
    ['swipe out of range', validInput({ answers: [{ questionId: 'stress.swipe', value: 2 }] }), /0 or 1/],
    ['choice as value', validInput({ answers: [{ questionId: 'stress.deep', value: 1 }] }), /choice array/],
    [
      'invalid choice option',
      validInput({ answers: [{ questionId: 'stress.deep', choice: ['hacked'] }] }),
      /invalid option/,
    ],
  ])('rejects %s and stores nothing', async (_, input, message) => {
    const responses = await countRows('responses');
    const answers = await countRows('answers');
    await expect(submit(typeof input === 'string' ? JSON.parse(input) : input)).rejects.toThrow(message);
    expect(await countRows('responses')).toBe(responses);
    expect(await countRows('answers')).toBe(answers);
  });

  it('rejects questions meant for another role', async () => {
    await db.exec(`update public.questions set audience = 'student' where id = 'stress.core'`);
    await expect(submit(validInput({ role: 'teacher' }))).rejects.toThrow(/not for role/);
    await db.exec(`update public.questions set audience = null where id = 'stress.core'`);
  });

  it('keeps raw data unreadable for anon after submitting', async () => {
    await expect(asRole(db, 'anon', () => db.query('select * from public.responses'))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('delete_own_response (#161)', () => {
  const withdraw = (input: unknown, role: DbRole = 'anon') =>
    rpc<DeleteResult>('public.delete_own_response($1::jsonb)', [JSON.stringify(input)], role);
  const hashOf = (token: string, wave = CURRENT_WAVE) =>
    createHash('sha256').update(`${token}:${wave}`).digest('hex');
  const rowsFor = async (token: string) =>
    Number(
      (
        await db.query<{ n: number }>(
          `select count(*)::int as n from public.responses r join public.answers a on a.response_id = r.id
           where r.device_hash = $1`,
          [hashOf(token)],
        )
      ).rows[0]!.n,
    );

  it.each<DbRole>(['anon', 'authenticated'])(
    'lets %s withdraw its own response and take part again',
    async (role) => {
      const input = validInput();
      await submit(input, role);
      expect(await rowsFor(input.deviceToken)).toBe(3);

      await expect(withdraw({ waveId: CURRENT_WAVE, deviceToken: input.deviceToken }, role)).resolves.toEqual(
        { ok: true },
      );
      expect(await rowsFor(input.deviceToken)).toBe(0); // response and its answers are gone

      await expect(withdraw({ waveId: CURRENT_WAVE, deviceToken: input.deviceToken }, role)).resolves.toEqual(
        {
          ok: false,
          reason: 'not_found',
        },
      );
      await expect(submit(input, role)).resolves.toEqual({ ok: true });
    },
  );

  it("never touches another device's response", async () => {
    const mine = validInput();
    const other = validInput();
    await submit(mine);
    await submit(other);
    const before = await countRows('responses');
    await expect(withdraw({ waveId: CURRENT_WAVE, deviceToken: newToken() })).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    });
    await expect(withdraw({ waveId: CURRENT_WAVE, deviceToken: mine.deviceToken })).resolves.toEqual({
      ok: true,
    });
    expect(await countRows('responses')).toBe(before - 1);
    expect(await rowsFor(other.deviceToken)).toBe(3);
  });

  it('also deletes the free text of that response (#155 cascade, #178)', async () => {
    const input = validInput();
    await submit(input);
    const freetext = {
      schoolId: input.schoolId,
      waveId: CURRENT_WAVE,
      deviceToken: input.deviceToken,
      cleaned: 'Mehr Pausen zwischen den Klausuren',
      cluster: 'Pausen',
      topics: ['stress'],
      concern: false,
    };
    // Stored by the moderation Edge Function with the service key (#155).
    await rpc('public.record_freetext($1::jsonb)', [JSON.stringify(freetext)], 'service_role');
    const freetextRows = async () =>
      Number(
        (
          await db.query<{ n: number }>(
            `select count(*)::int as n from public.freetext_entries e
             join public.responses r on r.id = e.response_id where r.device_hash = $1`,
            [hashOf(input.deviceToken)],
          )
        ).rows[0]!.n,
      );
    const totalBefore = Number(
      (await db.query<{ n: number }>('select count(*)::int as n from public.freetext_entries')).rows[0]!.n,
    );
    expect(await freetextRows()).toBe(1);

    await expect(withdraw({ waveId: CURRENT_WAVE, deviceToken: input.deviceToken })).resolves.toEqual({
      ok: true,
    });
    const totalAfter = Number(
      (await db.query<{ n: number }>('select count(*)::int as n from public.freetext_entries')).rows[0]!.n,
    );
    expect(totalAfter).toBe(totalBefore - 1);
  });

  it.each([
    ['not an object', '"x"', /must be an object/],
    ['a past wave', { waveId: PREVIOUS_WAVE, deviceToken: 'device-token-00000001' }, /not the current wave/],
    ['a missing wave', { deviceToken: 'device-token-00000001' }, /not the current wave/],
    ['a short token', { waveId: CURRENT_WAVE, deviceToken: 'abc' }, /invalid device token/],
  ])('rejects %s', async (_, input, message) => {
    await expect(withdraw(typeof input === 'string' ? JSON.parse(input) : input)).rejects.toThrow(message);
  });
});

describe('get_school_by_code', () => {
  it('resolves a join code case- and whitespace-insensitively as a School', async () => {
    await expect(rpc('public.get_school_by_code($1)', [' demo42 '])).resolves.toEqual({
      id: '900000',
      name: 'Gesamtschule Düsseldorf-Mitte',
      schoolForm: 'gesamtschule',
      kreisId: '05111',
      city: 'Düsseldorf',
      lat: 51.25,
      lon: 6.85,
      studentCount: 1100,
      joinCode: 'DEMO42',
      isTest: false,
    });
  });

  it('returns null for unknown or empty codes', async () => {
    await expect(rpc('public.get_school_by_code($1)', ['NOPE99'])).resolves.toBeNull();
    await expect(rpc('public.get_school_by_code($1)', [null])).resolves.toBeNull();
  });
});

describe('get_current_wave', () => {
  it('returns the wave covering now() as a Wave', async () => {
    const wave = await rpc<{ id: string; startsAt: string; endsAt: string }>('public.get_current_wave()');
    expect(wave.id).toBe(CURRENT_WAVE);
    expect(Date.parse(wave.startsAt)).toBeLessThan(Date.now());
    expect(Date.parse(wave.endsAt)).toBeGreaterThan(Date.now());
  });

  it('falls back to the latest started wave when the calendar has a gap', async () => {
    const gapDb = await createTestDb();
    await gapDb.exec(`insert into public.waves values
      ('2026-W40', now() - interval '20 days', now() - interval '13 days'),
      ('2026-W41', now() - interval '13 days', now() - interval '6 days'),
      ('2030-W01', now() + interval '100 days', now() + interval '107 days')`);
    const { rows } = await gapDb.query<{ id: string }>(`select public.get_current_wave() ->> 'id' as id`);
    expect(rows[0]!.id).toBe('2026-W41');
  });
});

describe('exposure', () => {
  it('keeps the internal helper private', async () => {
    await expect(rpc('public.current_wave_id()')).rejects.toThrow(/permission denied/);
  });
});

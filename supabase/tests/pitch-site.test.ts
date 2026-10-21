// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asRole, createTestDb, CURRENT_WAVE, insertFixtures } from './harness.ts';

let db: PGlite;
beforeAll(async () => {
  db = await createTestDb();
  await insertFixtures(db);
});
afterAll(async () => {
  await db.close();
});
const rpc = async (fn: string, params: unknown[] = [], role: 'anon' | 'service_role' = 'anon') =>
  (await asRole(db, role, () => db.query<{ result: unknown }>(`select ${fn} as result`, params))).rows[0]!
    .result;

const input = (token: string, schoolId = 'pitch-test') => ({
  schoolId,
  waveId: CURRENT_WAVE,
  role: 'student',
  deviceToken: token,
  answers: [
    { questionId: 'stress.core', value: 5 },
    { questionId: 'stress.deep', choice: ['exams'] },
  ],
});
const submit = (data: unknown) => rpc('public.submit_response($1::jsonb)', [JSON.stringify(data)]);
const recordText = (token: string, schoolId = 'pitch-test') =>
  rpc(
    'public.record_freetext($1::jsonb)',
    [
      JSON.stringify({
        schoolId,
        waveId: CURRENT_WAVE,
        deviceToken: token,
        cleaned: 'Mehr Freiraum bei Tests.',
        topics: ['stress'],
        cluster: 'Freiraum',
        concern: false,
      }),
    ],
    'service_role',
  );
interface PitchRow {
  n: number;
  scoredN: number;
  score: number | null;
  topicScores: Record<string, number | null>;
  school: { id: string; lon: number; isTest: boolean };
}
const pitch = async () => (await rpc('public.get_pitch_aggregate()')) as PitchRow;

describe('isolated pitch site', () => {
  it('exposes the configured participation code through the isolated Pitch aggregate', async () => {
    await rpc(
      "public.configure_pitch_site('Teststandort', 'Berlin', 52.52, 13.405, 'CUSTOM42')",
      [],
      'service_role',
    );
    try {
      expect(await pitch()).toMatchObject({
        school: { id: 'pitch-test', isTest: true, joinCode: 'CUSTOM42' },
      });
      expect(await rpc("public.get_school_by_code('CUSTOM42')")).toMatchObject({ id: 'pitch-test' });
      expect(await rpc("public.get_school_by_code('PITCH')")).toBeNull();
    } finally {
      await rpc(
        "public.configure_pitch_site('Pitch-Test (synthetisch)', 'Teststandort · Berlin', 52.52, 13.405, 'PITCH')",
        [],
        'service_role',
      );
    }
  });
  it('resolves the pitch QR but hides its master data from normal REST reads', async () => {
    expect(await rpc("public.get_school_by_code('PITCH')")).toMatchObject({
      id: 'pitch-test',
      isTest: true,
      lon: 13.405,
    });
    for (const table of ['regbez', 'kreise', 'schools']) {
      const { rows } = await asRole(db, 'anon', () =>
        db.query(`select id from public.${table} where is_test`),
      );
      expect(rows).toEqual([]);
    }
    expect(await pitch()).toMatchObject({ n: 0, scoredN: 0, score: null, topicScores: {} });
  });

  it('allows only the server to configure the venue or reset it', async () => {
    await expect(rpc('public.reset_pitch_test()')).rejects.toThrow(/permission denied/);
    await expect(rpc("public.configure_pitch_site('Venue', 'City', 53.5, 10.5)")).rejects.toThrow(
      /permission denied/,
    );
    await rpc(
      "public.configure_pitch_site('Pitch-Test (synthetisch)', 'Teststadt', 53.5, 10.5)",
      [],
      'service_role',
    );
    expect((await pitch()).school.lon).toBe(10.5);
    await expect(
      rpc("public.configure_pitch_site('Invalid', 'City', 91, 10)", [], 'service_role'),
    ).rejects.toThrow(/invalid pitch/);
  });

  it('keeps pitch answers out of normal aggregates, trends, distributions and policy effects', async () => {
    // The same device may answer in NRW and in the pitch, with separate hashes.
    expect(await submit(input('shared-device-token-001', '900000'))).toEqual({ ok: true });
    for (let i = 0; i < 9; i++) expect(await submit(input(`pitch-device-token-${i}`))).toEqual({ ok: true });
    expect(await pitch()).toMatchObject({ n: 9, scoredN: 9, score: null });
    expect(await submit(input('shared-device-token-001'))).toEqual({ ok: true });
    expect(await pitch()).toMatchObject({ n: 10, scoredN: 10, score: 100, topicScores: { stress: 100 } });
    expect(await recordText('shared-device-token-001', '900000')).toEqual({ ok: true });
    for (let i = 0; i < 9; i++) expect(await recordText(`pitch-device-token-${i}`)).toEqual({ ok: true });
    expect(
      await rpc('public.get_freetext_clusters($1::jsonb)', [
        JSON.stringify({ level: 'school', id: 'pitch-test' }),
      ]),
    ).toEqual([]);
    expect(await recordText('shared-device-token-001')).toEqual({ ok: true });
    expect(
      await rpc('public.get_freetext_clusters($1::jsonb)', [
        JSON.stringify({ level: 'school', id: 'pitch-test' }),
      ]),
    ).toEqual([expect.objectContaining({ cluster: 'Freiraum', count: 10, examples: expect.any(Array) })]);
    expect(
      await rpc('public.get_freetext_clusters($1::jsonb)', [JSON.stringify({ level: 'nrw', id: null })]),
    ).toEqual([]);
    const aggregate = await rpc('public.get_aggregates(\'{"level":"school","topic":"all"}\')');
    expect(aggregate).toEqual([expect.objectContaining({ id: '900000', n: 1, score: null })]);
    expect(await rpc('public.get_aggregates(\'{"level":"nrw","topic":"all"}\')')).toEqual([
      expect.objectContaining({ id: 'nrw', n: 1, score: null }),
    ]);
    const trend = await rpc(
      `public.get_trend('{"level":"school","topic":"all","waveIds":["${CURRENT_WAVE}"]}')`,
    );
    expect(trend).toEqual([expect.objectContaining({ id: '900000', n: 1, score: null })]);
    expect(
      await rpc('public.get_choice_distribution(\'stress.deep\', \'{"level":"nrw","id":null}\')'),
    ).toBeNull();
    expect(
      await rpc('public.get_choice_distribution(\'stress.deep\', \'{"level":"school","id":"pitch-test"}\')'),
    ).toBeNull();
    const radar = await rpc('public.get_tension_index(\'{"level":"school","topic":"all"}\')');
    expect(radar).toEqual([expect.objectContaining({ id: '900000', index: null })]);
    // NRW-wide policy effects use the same private helper; the 10 test votes cannot reach K_MIN there.
    const { rows } = await db.query<{ result: unknown }>(`select public.aggregate_rows(
      '{"level":"nrw","topic":"all"}', array['${CURRENT_WAVE}'], '{}'::text[]) as result`);
    expect(rows[0]!.result).toEqual([expect.objectContaining({ id: 'nrw', n: 1, score: null })]);
    for (const fn of ['get_aggregates', 'get_trend', 'get_tension_index']) {
      await expect(
        rpc(`public.${fn}($1::jsonb)`, [
          JSON.stringify({ level: 'pitch', topic: 'all', waveIds: [CURRENT_WAVE] }),
        ]),
      ).rejects.toThrow(/level/);
    }
  });

  it('removes only test answers and hashes, making repeat participation possible', async () => {
    expect(await rpc('public.reset_pitch_test()', [], 'service_role')).toEqual({
      ok: true,
      deletedResponses: 10,
    });
    expect(await pitch()).toMatchObject({ n: 0, scoredN: 0, score: null });
    const { rows } = await db.query<{ responses: number; answers: number }>(`select
      (select count(*)::int from public.responses) as responses,
      (select count(*)::int from public.answers) as answers`);
    expect(rows[0]).toEqual({ responses: 1, answers: 2 });
    expect(
      (await db.query<{ n: number }>('select count(*)::int as n from public.freetext_entries')).rows[0]!.n,
    ).toBe(1);
    expect(await submit(input('shared-device-token-001', '900000'))).toEqual({
      ok: false,
      reason: 'already_submitted',
    });
    expect(await submit(input('shared-device-token-001'))).toEqual({ ok: true });
    expect(await submit(input('shared-device-token-001'))).toEqual({
      ok: false,
      reason: 'already_submitted',
    });
  });
});

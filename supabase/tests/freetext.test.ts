// @vitest-environment node
// Freitext migration + RPCs (#126): no raw text, K_MIN clusters, scope filters, privileges.
import type { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { FreetextCluster } from '../../src/types/index.ts';
import { asRole, createTestDb, CURRENT_WAVE, insertFixtures, PREVIOUS_WAVE, type DbRole } from './harness.ts';

let db: PGlite;
let tokenCounter = 0;

async function rpc<T>(sql: string, params: unknown[] = [], role: DbRole = 'anon'): Promise<T> {
  const { rows } = await asRole(db, role, () => db.query<{ result: T }>(`select ${sql} as result`, params));
  return rows[0]!.result;
}

const hash = (token: string, waveId = CURRENT_WAVE) =>
  createHash('sha256').update(`${token}:${waveId}`).digest('hex');

async function participate(
  schoolId = '900000',
  waveId = CURRENT_WAVE,
): Promise<{ token: string; responseId: string }> {
  const token = `device-token-${String(++tokenCounter).padStart(8, '0')}`;
  const { rows } = await db.query<{ id: string }>(
    `insert into public.responses (school_id, wave_id, role, device_hash)
     values ($1, $2, 'student', $3) returning id`,
    [schoolId, waveId, hash(token, waveId)],
  );
  return { token, responseId: rows[0]!.id };
}

async function record(
  token: string,
  cleaned: string,
  cluster: string,
  topics: string[] = ['phones'],
  options: { concern?: boolean; schoolId?: string; waveId?: string } = {},
) {
  return rpc<{ ok: boolean; reason?: string }>(
    'public.record_freetext($1::jsonb)',
    [
      JSON.stringify({
        schoolId: options.schoolId ?? '900000',
        waveId: options.waveId ?? CURRENT_WAVE,
        deviceToken: token,
        cleaned,
        topics,
        cluster,
        concern: options.concern ?? false,
      }),
    ],
    'service_role',
  );
}

const clusters = (scope: unknown) =>
  rpc<FreetextCluster[]>('public.get_freetext_clusters($1::jsonb)', [JSON.stringify(scope)]);

beforeAll(async () => {
  db = await createTestDb();
  await insertFixtures(db);
  await db.exec(`
    insert into public.regbez values ('053', 'Münster');
    insert into public.kreise values ('05315', 'Köln', '053', 'kreisfreie_stadt');
    insert into public.schools values
      ('900001', 'Gesamtschule Köln', 'gesamtschule', '05315', 'Köln', 50.94, 6.96, 900, 'TEST43');
    insert into public.topics values
      ('learning', 'Lernen', '📚', '{student}', false, 1, 'P0'),
      ('phones', 'Handys', '📱', '{student}', false, 15, 'P1'),
      ('building', 'Gebäude', '🏫', '{student}', false, 8, 'P1'),
      ('wellbeing', 'Wohlbefinden', '💚', '{student}', false, 4, 'P0');
  `);

  // 10 entries in one cluster (exactly K_MIN) at school 900000 / Kreis 05111 / RegBez 051.
  for (let i = 1; i <= 10; i++) {
    const { token } = await participate();
    await record(token, `Handyregeln Nummer ${i}`, 'Handyregeln', ['phones']);
  }
  // 9 entries in a second cluster: must stay hidden.
  for (let i = 1; i <= 9; i++) {
    const { token } = await participate();
    await record(token, `Toiletten Nummer ${i}`, 'Toiletten', ['building']);
  }
  // 10 entries in another RegBez (Köln) for scope tests.
  for (let i = 1; i <= 10; i++) {
    const { token } = await participate('900001');
    await record(token, `Unterricht Nummer ${i}`, 'Unterricht', ['learning'], { schoolId: '900001' });
  }
  // A concern entry is stored but never exposed publicly.
  const concern = await participate();
  await record(concern.token, 'Ich brauche Hilfe', 'Krise', ['wellbeing'], { concern: true });

  // An entry from the previous wave must not leak into the current-wave clusters.
  const old = await participate('900000', PREVIOUS_WAVE);
  await db.query(
    `insert into public.freetext_entries (response_id, cleaned, topics, cluster)
     values ($1, 'Alte Meldung', '{phones}', 'Alt')`,
    [old.responseId],
  );
});

describe('freetext_entries', () => {
  it('stores only the moderated text and has no raw-text column', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'freetext_entries' order by ordinal_position`,
    );
    const columns = rows.map((row) => row.column_name);
    expect(columns).toEqual(['response_id', 'cleaned', 'topics', 'cluster', 'concern', 'created_at']);
    expect(columns).not.toContain('text');
    expect(columns).not.toContain('raw');
  });

  it('keeps the table unreadable for anon and authenticated', async () => {
    await expect(asRole(db, 'anon', () => db.query('select * from public.freetext_entries'))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      asRole(db, 'authenticated', () => db.query('select * from public.freetext_entries')),
    ).rejects.toThrow(/permission denied/);
  });

  it('lets only the service role call record_freetext', async () => {
    await expect(
      asRole(db, 'anon', () => db.query(`select public.record_freetext('{"schoolId":"900000"}'::jsonb)`)),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('record_freetext', () => {
  it('stores one moderated entry per participation', async () => {
    const { token, responseId } = await participate();
    await expect(
      record(token, 'Die Toiletten sind oft kaputt.', 'Einzelmeldung', ['building']),
    ).resolves.toEqual({ ok: true });

    const { rows } = await db.query<{
      cleaned: string;
      topics: string[];
      cluster: string;
      concern: boolean;
    }>('select cleaned, topics, cluster, concern from public.freetext_entries where response_id = $1', [
      responseId,
    ]);
    expect(rows[0]).toEqual({
      cleaned: 'Die Toiletten sind oft kaputt.',
      topics: ['building'],
      cluster: 'Einzelmeldung',
      concern: false,
    });

    await expect(record(token, 'Ein zweiter Text.', 'Einzelmeldung', ['building'])).resolves.toEqual({
      ok: false,
      reason: 'already_submitted',
    });
  });

  it('rejects a text without an existing participation', async () => {
    await expect(record('device-token-99999999', 'Text', 'Cluster')).rejects.toThrow(
      /no response for this device and wave/,
    );
  });

  it('rejects unknown topics, non-boolean concern and invalid lengths', async () => {
    const { token } = await participate();
    await expect(record(token, 'Text', 'Cluster', ['not-a-topic'])).rejects.toThrow(/unknown topic/);
    await expect(record(token, 'Text', 'Cluster', ['phones'], { concern: 'yes' as never })).rejects.toThrow(
      /concern must be a boolean/,
    );
    await expect(record(token, 'x'.repeat(281), 'Cluster')).rejects.toThrow(/1-280/);
    await expect(record(token, 'Text', '')).rejects.toThrow(/cluster must be/);
  });

  it('rejects entries for a non-current wave', async () => {
    const { token } = await participate('900000', PREVIOUS_WAVE);
    await expect(record(token, 'Text', 'Cluster', ['phones'], { waveId: PREVIOUS_WAVE })).rejects.toThrow(
      /not the current wave/,
    );
  });
});

describe('get_freetext_clusters', () => {
  it('returns only clusters at K_MIN for NRW and includes cleaned examples', async () => {
    const result = await clusters({ level: 'nrw', id: null });
    expect(result.map((cluster) => cluster.cluster)).toEqual(['Handyregeln', 'Unterricht']);

    const handy = result.find((cluster) => cluster.cluster === 'Handyregeln')!;
    expect(handy.count).toBe(10);
    expect(handy.topics).toEqual(['phones']);
    expect(handy.examples).toHaveLength(3);
    expect(handy.examples.every((example) => example.startsWith('Handyregeln Nummer'))).toBe(true);
  });

  it('filters by RegBez, Kreis and school', async () => {
    await expect(clusters({ level: 'regbez', id: '051' })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ cluster: 'Handyregeln', count: 10 })]),
    );
    const regbez = await clusters({ level: 'regbez', id: '051' });
    expect(regbez.map((cluster) => cluster.cluster)).toEqual(['Handyregeln']);

    const kreis = await clusters({ level: 'kreis', id: '05111' });
    expect(kreis.map((cluster) => cluster.cluster)).toEqual(['Handyregeln']);

    const school = await clusters({ level: 'school', id: '900001' });
    expect(school.map((cluster) => cluster.cluster)).toEqual(['Unterricht']);
    expect(school[0]!.count).toBe(10);
  });

  it('never exposes concern entries or old waves', async () => {
    const all = await clusters({ level: 'nrw', id: null });
    const clustersSeen = all.map((cluster) => cluster.cluster);
    expect(clustersSeen).not.toContain('Krise');
    expect(clustersSeen).not.toContain('Alt');
    expect(clustersSeen).not.toContain('Toiletten');
  });

  it('returns an empty list for a scope without enough entries', async () => {
    await expect(clusters({ level: 'school', id: '900000' })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ cluster: 'Handyregeln' })]),
    );
    const empty = await clusters({ level: 'kreis', id: '05999' });
    expect(empty).toEqual([]);
  });

  it('rejects invalid scopes', async () => {
    await expect(clusters({ level: 'nrw', id: '051' })).rejects.toThrow(/nrw scope needs id = null/);
    await expect(clusters({ level: 'regbez', id: 'nope' })).rejects.toThrow(/invalid regbez id/);
    await expect(clusters({ level: 'kreis', id: '051' })).rejects.toThrow(/invalid kreis id/);
    await expect(clusters({ level: 'school', id: '' })).rejects.toThrow(/invalid school id/);
    await expect(clusters({ level: 'planet', id: null })).rejects.toThrow(/scope.level/);
  });

  it('is callable by anon while the raw table stays private', async () => {
    await expect(
      asRole(db, 'anon', () =>
        db.query(`select public.get_freetext_clusters('{"level":"nrw","id":null}'::jsonb)`),
      ),
    ).resolves.toBeDefined();
    await expect(asRole(db, 'anon', () => db.query('select * from public.freetext_entries'))).rejects.toThrow(
      /permission denied/,
    );
  });
});

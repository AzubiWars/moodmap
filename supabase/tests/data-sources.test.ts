// @vitest-environment node
// Data sources (#267, ADR-018): registry, constraints, visibility and the import audit stay private.
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DataSourceInfo } from '../../src/types/index.ts';
import { asRole, createTestDb, CURRENT_WAVE, fakeHash, insertFixtures } from './harness.ts';

let db: PGlite;
beforeAll(async () => {
  db = await createTestDb();
  await insertFixtures(db);
  await db.exec(`
    insert into public.regbez (id, name, is_test) values ('099', 'Test', true);
    insert into public.kreise (id, name, regbez_id, type, is_test) values ('09999', 'Test', '099', 'kreis', true);
    insert into public.schools (id, name, school_form, kreis_id, city, lat, lon, join_code, is_test)
      values ('pitch-x', 'Pitch', 'gesamtschule', '09999', 'Berlin', 52.5, 13.4, 'PITCHX', true);
  `);
});
afterAll(async () => {
  await db.close();
});

const sources = async (claims: object = {}): Promise<DataSourceInfo[]> => {
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(claims)]);
  try {
    const { rows } = await asRole(db, 'anon', () =>
      db.query<{ result: DataSourceInfo[] }>('select public.get_data_sources() as result'),
    );
    return rows[0]!.result;
  } finally {
    await db.query(`select set_config('request.jwt.claims', '', false)`);
  }
};

const submit = (token: string, schoolId = '900000') =>
  asRole(db, 'anon', () =>
    db.query('select public.submit_response($1::jsonb)', [
      JSON.stringify({
        schoolId,
        waveId: CURRENT_WAVE,
        role: 'student',
        deviceToken: token,
        answers: [{ questionId: 'stress.core', value: 4 }],
      }),
    ]),
  );

/** One imported participation with one scored answer. */
const importRow = (source: string, runId: string, key: number) =>
  db.exec(`with r as (
      insert into public.responses (school_id, wave_id, role, source_id, import_run_id, external_key_hash)
      values ('900000', '${CURRENT_WAVE}', 'student', '${source}', '${runId}', '${fakeHash(key)}') returning id
    )
    insert into public.answers (response_id, question_id, value) select id, 'stress.core', 3 from r`);

describe('data source registry', () => {
  it('seeds live (default), live-pitch and demo-seed', async () => {
    const { rows } = await db.query<{ id: string; is_default: boolean }>(
      'select id, is_default from public.data_sources order by id',
    );
    expect(rows).toEqual([
      { id: 'demo-seed', is_default: false },
      { id: 'live', is_default: true },
      { id: 'live-pitch', is_default: false },
    ]);
  });

  it('allows only one default source, and only an active public one', async () => {
    await expect(
      db.exec("update public.data_sources set is_default = true where id = 'demo-seed'"),
    ).rejects.toThrow(/duplicate key/);
    await expect(
      db.exec("update public.data_sources set visibility = 'ministry' where id = 'live'"),
    ).rejects.toThrow(/check constraint/);
  });

  it('puts app submissions into live and pitch submissions into live-pitch', async () => {
    await submit('device-token-0000000001');
    await submit('device-token-0000000002', 'pitch-x');
    const { rows } = await db.query<{ school_id: string; source_id: string }>(
      'select school_id, source_id from public.responses order by school_id',
    );
    expect(rows).toEqual([
      { school_id: '900000', source_id: 'live' },
      { school_id: 'pitch-x', source_id: 'live-pitch' },
    ]);
  });

  it('cannot route a pitch response into an NRW source', async () => {
    await db.exec(`insert into public.responses (school_id, wave_id, role, device_hash, source_id)
      values ('pitch-x', '${CURRENT_WAVE}', 'student', '${fakeHash(77)}', 'live')`);
    const { rows } = await db.query<{ source_id: string }>(
      `select source_id from public.responses where device_hash = '${fakeHash(77)}'`,
    );
    expect(rows[0]!.source_id).toBe('live-pitch');
  });

  it('requires a device hash for app submissions and an import run + external key for imports', async () => {
    await expect(
      db.exec(
        `insert into public.responses (school_id, wave_id, role) values ('900000', '${CURRENT_WAVE}', 'student')`,
      ),
    ).rejects.toThrow(/responses_identity_check/);
    await expect(
      db.exec(`insert into public.responses (school_id, wave_id, role, device_hash, external_key_hash)
        values ('900000', '${CURRENT_WAVE}', 'student', '${fakeHash(5)}', '${fakeHash(6)}')`),
    ).rejects.toThrow(/responses_identity_check/);
  });

  it('makes imports idempotent per source and external key', async () => {
    const {
      rows: [run],
    } = await db.query<{ id: string }>(`insert into private.import_runs
      (source_id, file_sha256, mapping_id, mapping_version, rows_total, rows_accepted, rows_rejected, importer)
      values ('demo-seed', '${fakeHash(1)}', 'test', 1, 1, 1, 0, 'test') returning id`);
    const insert = () => importRow('demo-seed', run!.id, 9);
    await insert();
    await expect(insert()).rejects.toThrow(/responses_source_external_key/);
  });
});

describe('visibility', () => {
  it('lists the default and non-empty public sources for anon, never live-pitch', async () => {
    const list = await sources();
    expect(list.map((s) => s.id)).toEqual(['live', 'demo-seed']);
    expect(list[0]).toMatchObject({ id: 'live', kind: 'live', isDefault: true, visibility: 'public', n: 1 });
  });

  it('hides ministry and inactive sources from anon, shows ministry ones to ministry accounts', async () => {
    await db.exec(`insert into public.data_sources (id, label, kind, visibility, status) values
      ('restricted', 'Nur Ministerium', 'import', 'ministry', 'active'),
      ('draft-src', 'Entwurf', 'import', 'public', 'draft')`);
    const {
      rows: [run],
    } = await db.query<{ id: string }>(`insert into private.import_runs
      (source_id, file_sha256, mapping_id, mapping_version, rows_total, rows_accepted, rows_rejected, importer)
      values ('restricted', '${fakeHash(2)}', 'test', 1, 1, 1, 0, 'test') returning id`);
    await importRow('restricted', run!.id, 11);
    await importRow('draft-src', run!.id, 12);
    expect((await sources()).map((s) => s.id)).not.toContain('restricted');
    expect((await sources()).map((s) => s.id)).not.toContain('draft-src');
    expect((await sources({ app_metadata: { moodmap_role: 'ministerium' } })).map((s) => s.id)).toContain(
      'restricted',
    );
  });

  it('resolve_source rejects unknown, hidden and inactive sources instead of falling back', async () => {
    const resolve = (sourceId?: string) =>
      db.query<{ id: string }>('select public.resolve_source($1::jsonb) as id', [
        JSON.stringify(sourceId ? { sourceId } : {}),
      ]);
    expect((await resolve()).rows[0]!.id).toBe('live');
    expect((await resolve('demo-seed')).rows[0]!.id).toBe('demo-seed');
    for (const id of ['nope', 'restricted', 'draft-src']) {
      await expect(resolve(id)).rejects.toThrow(/unknown data source/);
    }
  });
});

describe('privacy', () => {
  it('keeps raw data, the registry table and the import audit unreachable for API roles', async () => {
    for (const role of ['anon', 'authenticated'] as const) {
      for (const sql of [
        'select * from public.responses',
        'select * from public.data_sources',
        'select * from private.import_runs',
        "select public.resolve_source('{}'::jsonb)",
      ]) {
        await expect(asRole(db, role, () => db.query(sql))).rejects.toThrow(/permission denied/);
      }
    }
  });

  it('import_runs has no column for file or cell contents', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema = 'private' and table_name = 'import_runs'`,
    );
    expect(rows.map((r) => r.column_name).sort()).toEqual(
      [
        'created_at',
        'errors',
        'file_sha256',
        'id',
        'importer',
        'mapping_id',
        'mapping_version',
        'rolled_back_at',
        'rows_accepted',
        'rows_rejected',
        'rows_total',
        'source_id',
        'status',
      ].sort(),
    );
  });
});

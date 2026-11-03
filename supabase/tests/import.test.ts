// @vitest-environment node
// Import commit/rollback (#271) and provider aggregates (#274) against the real migrations.
import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMockSource } from '../../src/data/mockSource.ts';
import { QUESTIONS, TOPICS } from '../../src/data/topics.ts';
import type { AggregateQuery, AggregateRow } from '../../src/types/index.ts';
import { buildSeedSql, loadSeedSources } from '../../scripts/lib/supabase-seed.ts';
import {
  toCanonicalAggregates,
  toCanonicalResponses,
  type CanonicalResponse,
  type ImportContext,
} from '../../scripts/lib/import/canonical.ts';
import { commitImport, type ImportRpc } from '../../scripts/lib/import/commit.ts';
import { parseCsv } from '../../scripts/lib/import/csv.ts';
import {
  parseMapping,
  type AggregateMapping,
  type ResponseMapping,
} from '../../scripts/lib/import/mapping.ts';
import { buildReport } from '../../scripts/lib/import/report.ts';
import { asRole, createTestDb, type DbRole } from './harness.ts';

const seedSources = loadSeedSources({ synthetic: true });
const fixture = (name: string) =>
  readFileSync(new URL(`../../scripts/fixtures/import/${name}`, import.meta.url), 'utf8');
const context: ImportContext = {
  schools: seedSources.schools,
  questions: QUESTIONS,
  topics: TOPICS,
  kMin: 10,
};
const profile = parseMapping(JSON.parse(fixture('beispiel.mapping.json'))) as ResponseMapping;
const canonical = toCanonicalResponses(parseCsv(fixture('beispiel.csv')), profile, context);
const report = buildReport(canonical, context);
const SALT = 'test-salt-0123456789';

let db: PGlite;
beforeAll(async () => {
  db = await createTestDb();
  await db.exec(buildSeedSql(seedSources));
});
afterAll(async () => {
  await db.close();
});

const CASTS: Record<string, string> = { run_id: 'uuid', meta: 'jsonb', rows: 'jsonb', input: 'jsonb' };
const rpcAs =
  (role: DbRole): ImportRpc =>
  async (fn, args) => {
    const names = Object.keys(args);
    const sql = `select public.${fn}(${names.map((n, i) => `${n} => $${i + 1}::${CASTS[n] ?? 'text'}`).join(', ')}) as result`;
    const params = names.map((n) => (typeof args[n] === 'object' ? JSON.stringify(args[n]) : args[n]));
    const { rows } = await asRole(db, role, () => db.query<{ result: unknown }>(sql, params));
    return rows[0]!.result;
  };
const rpc = rpcAs('service_role');

const anonAggregates = async (query: object) =>
  (
    await asRole(db, 'anon', () =>
      db.query<{ result: AggregateRow[] }>('select public.get_aggregates($1::jsonb) as result', [
        JSON.stringify(query),
      ]),
    )
  ).rows[0]!.result;

const commit = (rows: CanonicalResponse[] = canonical.rows, sourceId = 'schule-2026') =>
  commitImport(rpc, {
    sourceId,
    profile,
    rows,
    report,
    fileHash: 'a'.repeat(64),
    importer: 'test',
    salt: SALT,
    chunkSize: 50,
  });

describe('response import', () => {
  let runId: string;

  it('creates a draft import source; app sources cannot be overwritten', async () => {
    await rpc('import_upsert_source', {
      input: { id: 'schule-2026', label: 'Schulbefragung 2026', visibility: 'public' },
    });
    await expect(rpc('import_upsert_source', { input: { id: 'live', label: 'x' } })).rejects.toThrow(
      /not an import source/,
    );
    await expect(
      commitImport(rpc, {
        sourceId: 'live',
        profile,
        rows: canonical.rows,
        report,
        fileHash: 'a'.repeat(64),
        importer: 't',
        salt: SALT,
      }),
    ).rejects.toThrow(/import source/);
  });

  it('commits all accepted rows in chunks, with hashed keys and an audit without contents', async () => {
    const result = await commit();
    runId = result.runId;
    expect(result).toMatchObject({ inserted: 120, skipped: 0 });
    const { rows } = await db.query<{ n: number; hashed: number; dates: number }>(`select count(*)::int as n,
      count(*) filter (where external_key_hash ~ '^[0-9a-f]{64}$' and device_hash is null)::int as hashed,
      count(distinct created_at)::int as dates
      from public.responses where source_id = 'schule-2026'`);
    expect(rows[0]).toEqual({ n: 120, hashed: 120, dates: 6 });
    const audit = await db.query<Record<string, unknown>>('select * from private.import_runs where id = $1', [
      runId,
    ]);
    expect(audit.rows[0]).toMatchObject({
      status: 'committed',
      rows_total: 124,
      rows_accepted: 120,
      rows_rejected: 4,
      rows_inserted: 120,
    });
    const text = JSON.stringify(audit.rows[0]);
    for (const secret of ['T-0001', SALT, '900002']) expect(text).not.toContain(secret);
    expect((await db.query('select * from private.import_staging')).rows).toEqual([]);
  });

  it('is idempotent: the same file again inserts nothing', async () => {
    expect(await commit()).toMatchObject({ inserted: 0, skipped: 120 });
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from public.responses where source_id = 'schule-2026'`,
    );
    expect(rows[0]!.n).toBe(120);
  });

  it('aggregates the import exactly like the mock computes the same canonical rows', async () => {
    await rpc('import_set_source_status', { source_id: 'schule-2026', status: 'active' });
    const mock = createMockSource({
      loadData: async () => ({
        schools: [...seedSources.schools],
        waves: seedSources.waves.map((w) => ({
          id: w.id,
          startsAt: `${w.monday}T00:00:00Z`,
          endsAt: `${w.nextMonday}T00:00:00Z`,
        })),
        responses: canonical.rows.map((r) => ({
          id: r.externalId,
          schoolId: r.schoolId,
          waveId: r.waveId,
          role: r.role,
          gradeBand: r.gradeBand,
          createdAt: r.date!,
          sourceId: 'schule-2026',
        })),
        answers: canonical.rows.flatMap((r) => r.answers.map((a) => ({ ...a, responseId: r.externalId }))),
        sources: [
          {
            id: 'schule-2026',
            label: 'Schulbefragung 2026',
            kind: 'import',
            periodStart: null,
            periodEnd: null,
            visibility: 'public',
            isDefault: true,
            aggregatedByProvider: false,
          },
        ],
      }),
      storage: null,
      channel: null,
    });
    const queries: AggregateQuery[] = [
      { level: 'kreis', topic: 'all', waveIds: ['2026-W43'] },
      { level: 'school', topic: 'stress', waveIds: ['2026-W42', '2026-W43'], parentId: '05111' },
      { level: 'nrw', topic: 'voice', waveIds: ['2026-W43'], gradeBand: ['8-10'] },
    ];
    for (const query of queries) {
      const sql = await anonAggregates({ ...query, sourceId: 'schule-2026' });
      expect(sql).toEqual(await mock.getAggregates(query));
    }
    mock.dispose();
  });

  it('rolls back exactly one run, nothing else', async () => {
    const before = await db.query<{ n: number }>(
      `select count(*)::int as n from public.responses where source_id <> 'schule-2026'`,
    );
    expect(await rpc('import_rollback', { run_id: runId })).toMatchObject({ responses: 120 });
    const { rows } = await db.query<{ n: number; rollup: number }>(`select
      (select count(*)::int from public.responses where source_id = 'schule-2026') as n,
      (select coalesce(sum(answered), 0)::int from private.response_rollup where source_id = 'schule-2026') as rollup`);
    expect(rows[0]).toEqual({ n: 0, rollup: 0 });
    const after = await db.query<{ n: number }>(
      `select count(*)::int as n from public.responses where source_id <> 'schule-2026'`,
    );
    expect(after.rows[0]!.n).toBe(before.rows[0]!.n);
    await expect(rpc('import_rollback', { run_id: runId })).rejects.toThrow(/not committed/);
  });

  it('imports nothing when a row fails inside the transaction', async () => {
    const broken = [
      ...canonical.rows.slice(0, 30),
      { ...canonical.rows[30]!, answers: [{ questionId: 'overall.core', value: 9 }] },
    ];
    await expect(commit(broken)).rejects.toThrow();
    const { rows } = await db.query<{ n: number; failed: number }>(`select
      (select count(*)::int from public.responses where source_id = 'schule-2026') as n,
      (select count(*)::int from private.import_runs where status = 'failed') as failed`);
    expect(rows[0]).toEqual({ n: 0, failed: 1 });
  });

  it('keeps every import RPC and the audit closed to anon/authenticated', async () => {
    for (const role of ['anon', 'authenticated'] as const) {
      await expect(rpcAs(role)('import_begin', { meta: {} })).rejects.toThrow(/permission denied/);
      await expect(rpcAs(role)('import_rollback', { run_id: runId })).rejects.toThrow(/permission denied/);
      await expect(asRole(db, role, () => db.query('select * from private.import_runs'))).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        asRole(db, role, () => db.query('select * from private.imported_aggregates')),
      ).rejects.toThrow(/permission denied/);
    }
  });
});

describe('provider aggregates (#274)', () => {
  const mapping = parseMapping(JSON.parse(fixture('aggregate.mapping.json'))) as AggregateMapping;
  const aggregates = toCanonicalAggregates(parseCsv(fixture('aggregate.csv')), mapping, context);

  beforeAll(async () => {
    await rpc('import_upsert_source', {
      input: { id: 'anbieter-2026', label: 'Anbieter-Auswertung', visibility: 'public' },
    });
    await commitImport(rpc, {
      sourceId: 'anbieter-2026',
      profile: mapping,
      rows: aggregates.rows,
      report: buildReport(aggregates, context),
      fileHash: 'b'.repeat(64),
      importer: 'test',
    });
    await rpc('import_set_source_status', { source_id: 'anbieter-2026', status: 'active' });
  });

  it('serves delivered cells in the AggregateRow shape, with delta and topic scores from deliveries only', async () => {
    const rows = await anonAggregates({
      level: 'kreis',
      topic: 'all',
      waveIds: ['2026-W43'],
      sourceId: 'anbieter-2026',
    });
    expect(rows.find((r) => r.id === '05111')).toEqual({
      id: '05111',
      n: 52,
      score: 52.5,
      delta: -7.5,
      topicScores: { stress: 40, voice: 47.5, safety: 70 },
    });
    // Cell below K_MIN was never imported; other districts have no data.
    expect(rows.find((r) => r.id === '05762')).toMatchObject({ n: 0, score: null });
  });

  it('only shows distributions that were delivered, never estimated ones', async () => {
    const stress = await anonAggregates({
      level: 'kreis',
      topic: 'stress',
      waveIds: ['2026-W43'],
      sourceId: 'anbieter-2026',
    });
    expect(stress.find((r) => r.id === '05111')!.distribution).toEqual({ 1: 9, 2: 17, 3: 13, 4: 9, 5: 4 });
    const voice = await anonAggregates({
      level: 'kreis',
      topic: 'voice',
      waveIds: ['2026-W43'],
      sourceId: 'anbieter-2026',
    });
    expect(voice.find((r) => r.id === '05111')!.distribution).toBeNull();
  });

  it('returns no data for filters the provider did not aggregate by, and for mixed wave sets', async () => {
    const filtered = await anonAggregates({
      level: 'kreis',
      topic: 'all',
      role: 'student',
      waveIds: ['2026-W43'],
      sourceId: 'anbieter-2026',
    });
    expect(filtered.every((r) => r.score === null && r.n === 0)).toBe(true);
    const both = await anonAggregates({
      level: 'kreis',
      topic: 'all',
      waveIds: ['2026-W42', '2026-W43'],
      sourceId: 'anbieter-2026',
    });
    expect(both.find((r) => r.id === '05111')!.score).toBeNull();
  });

  it('defaults to the latest delivered wave of an import source (#272), live stays on the current wave', async () => {
    const rows = await anonAggregates({ level: 'kreis', topic: 'all', sourceId: 'anbieter-2026' });
    expect(rows.find((r) => r.id === '05111')).toMatchObject({ n: 52, score: 52.5 });
    const live = await anonAggregates({ level: 'kreis', topic: 'all' });
    expect(live.every((r) => r.n === 0)).toBe(true);
  });

  it('marks the source as provider-aggregated in the registry', async () => {
    const { rows } = await asRole(db, 'anon', () =>
      db.query<{ result: { id: string; aggregatedByProvider: boolean; n: number }[] }>(
        'select public.get_data_sources() as result',
      ),
    );
    expect(rows[0]!.result.find((s) => s.id === 'anbieter-2026')).toMatchObject({
      aggregatedByProvider: true,
      n: 61,
    });
  });
});

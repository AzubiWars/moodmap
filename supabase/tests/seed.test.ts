// @vitest-environment node
// supabase/seed.sql (#93): up to date with its sources, applies cleanly and repeatably.
import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildSeedSql, loadSeedSources, sqlLiteral } from '../../scripts/lib/supabase-seed.ts';
import { asRole, createTestDb } from './harness.ts';
import { generateSeedData } from '../../src/data/seed/generateSeed.ts';

const seedSql = readFileSync(fileURLToPath(new URL('../seed.sql', import.meta.url)), 'utf8');
const sources = loadSeedSources();

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
  await db.exec(seedSql);
});

const count = async (table: string) =>
  Number((await db.query<{ n: number }>(`select count(*)::int as n from public.${table}`)).rows[0]!.n);

describe('supabase/seed.sql', () => {
  it('is up to date with its sources (run `npm run db:seed:build`)', () => {
    expect(seedSql.replace(/\r\n/g, '\n')).toBe(buildSeedSql(sources));
  });

  it('loads all master data and survey config', async () => {
    expect(await count('regbez')).toBe(5);
    expect(await count('kreise')).toBe(53);
    expect(await count('schools')).toBe(sources.schools.length);
    expect(await count('topics')).toBe(sources.topics.length);
    expect(await count('questions')).toBe(sources.questions.length);
    expect(await count('waves')).toBe(sources.waves.length);
  });

  it('can be applied again (upserts)', async () => {
    await expect(db.exec(seedSql)).resolves.toBeDefined();
    expect(await count('schools')).toBe(sources.schools.length);
  });

  it('makes the demo school reachable via DEMO42 for anon', async () => {
    const { rows } = await asRole(db, 'anon', () =>
      db.query<{ id: string }>(`select public.get_school_by_code('DEMO42') ->> 'id' as id`),
    );
    expect(rows[0]!.id).toBe('900000');
  });

  it('stores choice options and weights like src/data/topics.ts', async () => {
    const choice = sources.questions.find((q) => q.type === 'choice')!;
    const { rows } = await db.query<{ options: unknown; weight: number | null }>(
      'select options, weight from public.questions where id = $1',
      [choice.id],
    );
    expect(rows[0]!.options).toEqual(choice.options);
    expect(rows[0]!.weight).toBe(choice.weight ?? null);
  });

  it('accepts generated survey answers through the public submit RPC, including duplicate protection', async () => {
    const seed = generateSeedData([...sources.schools.slice(0, 5)], { waveCount: 1 });
    const { rows } = await db.query<{ id: string }>(`select public.get_current_wave() ->> 'id' as id`);
    const inputs = seed.responses.map((response) => ({ ...response, waveId: rows[0]!.id }));
    expect(inputs.length).toBeGreaterThan(10);
    const submit = (input: unknown) =>
      asRole(db, 'anon', () =>
        db.query<{ result: unknown }>('select public.submit_response($1::jsonb) as result', [
          JSON.stringify(input),
        ]),
      );
    for (const input of inputs) expect((await submit(input)).rows[0]!.result).toEqual({ ok: true });
    expect((await submit(inputs[0]!)).rows[0]!.result).toEqual({ ok: false, reason: 'already_submitted' });
    const count = await db.query<{ n: number }>('select count(*)::int as n from public.responses');
    expect(count.rows[0]!.n).toBe(inputs.length);
  });

  it('has gapless weekly waves starting Monday 00:00 in Berlin', async () => {
    const { rows } = await db.query<{ gaps: number; w43: string }>(`
      select
        (select count(*)::int from public.waves w
          where w.ends_at <> (select min(n.starts_at) from public.waves n where n.starts_at > w.starts_at)) as gaps,
        (select to_char(starts_at at time zone 'Europe/Berlin', 'Dy YYYY-MM-DD HH24:MI')
          from public.waves where id = '2026-W43') as w43
    `);
    expect(rows[0]).toEqual({ gaps: 0, w43: 'Mon 2026-10-19 00:00' });
  });
});

describe('sqlLiteral', () => {
  it('quotes strings, arrays and JSON safely', () => {
    expect(sqlLiteral("Wie geht's?")).toBe("'Wie geht''s?'");
    expect(sqlLiteral(['student'])).toBe("array['student']::text[]");
    expect(sqlLiteral({ json: [{ value: "a'b" }] })).toBe(`'[{"value":"a''b"}]'::jsonb`);
    expect(sqlLiteral(null)).toBe('null');
    expect(() => sqlLiteral(Number.NaN)).toThrow();
  });
});

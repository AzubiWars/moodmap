// @vitest-environment node
// Schema, grants & RLS (#77). Proves the access model of docs/PRIVACY.md against Supabase's defaults.
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  GRADE_BANDS,
  KREIS_TYPES,
  POLICY_ANSWER_STATUSES,
  POLICY_AUTHOR_ROLES,
  QUESTION_TYPES,
  ROLES,
  SCHOOL_FORMS,
} from '../../src/types/domain.ts';
import { asRole, createTestDb, fakeHash, insertFixtures, type DbRole } from './harness.ts';

const API_ROLES: DbRole[] = ['anon', 'authenticated'];
const RAW_TABLES = ['responses', 'answers', 'policy_answer_ratings'];
const PUBLIC_TABLES = ['regbez', 'kreise', 'topics', 'questions', 'waves', 'policy_answers'];

let db: PGlite;
let responseId: string;

beforeAll(async () => {
  db = await createTestDb();
  await insertFixtures(db);
  const { rows } = await db.query<{ id: string }>(
    `insert into public.responses (school_id, wave_id, role, grade_band, device_hash)
     values ('900000', '2026-W43', 'student', '8-10', $1) returning id`,
    [fakeHash(1)],
  );
  responseId = rows[0]!.id;
  await db.query(
    `insert into public.answers (response_id, question_id, value) values ($1, 'stress.core', 4)`,
    [responseId],
  );
});

const rejects = (role: DbRole, sql: string) =>
  expect(asRole(db, role, () => db.query(sql))).rejects.toThrow(/permission denied|row-level security/);

describe('access for API roles (anon, authenticated)', () => {
  it.each(API_ROLES)('%s can read master data, config and policy answers', async (role) => {
    for (const table of PUBLIC_TABLES) {
      await expect(asRole(db, role, () => db.query(`select * from public.${table}`))).resolves.toBeDefined();
    }
    const { rows } = await asRole(db, role, () =>
      db.query('select id, name, kreis_id, lat, lon from public.schools'),
    );
    expect(rows).toHaveLength(1);
  });

  it.each(API_ROLES)('%s cannot read join codes', async (role) => {
    await rejects(role, 'select join_code from public.schools');
    await rejects(role, 'select * from public.schools');
  });

  it.each(API_ROLES)('%s cannot read or write raw survey data', async (role) => {
    for (const table of RAW_TABLES) {
      await rejects(role, `select * from public.${table}`);
      await rejects(role, `delete from public.${table}`);
    }
    await rejects(
      role,
      `insert into public.responses (school_id, wave_id, role, device_hash) values ('900000', '2026-W43', 'student', '${fakeHash(2)}')`,
    );
    await rejects(role, `update public.answers set value = 1`);
  });

  it.each(API_ROLES)('%s cannot modify master data or policy answers', async (role) => {
    await rejects(role, `insert into public.regbez values ('053', 'Köln')`);
    await rejects(role, `update public.schools set name = 'x'`);
    await rejects(role, `delete from public.topics`);
    await rejects(
      role,
      `insert into public.policy_answers (topic_slug, scope, title, body, author_role) values ('stress', 'nrw', 't', 'b', 'ministerium')`,
    );
  });

  it('service_role (seed upload, #23) bypasses RLS', async () => {
    const { rows } = await asRole(db, 'service_role', () => db.query('select id from public.responses'));
    expect(rows).toHaveLength(1);
  });
});

describe('secure defaults', () => {
  it('enables RLS on every table in public', async () => {
    const { rows } = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows).toEqual([]);
  });

  it('does not expose tables or functions created by later migrations', async () => {
    await db.exec(`
      create table public.later_table (id int);
      create function public.later_fn() returns int language sql as 'select 1';
    `);
    await rejects('anon', 'select * from public.later_table');
    await rejects('anon', 'select public.later_fn()');
    await db.exec('drop table public.later_table; drop function public.later_fn();');
  });

  it('has no columns that could hold client metadata or free text', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name in ('responses', 'answers')`,
    );
    expect(rows.map((r) => r.column_name).sort()).toEqual(
      [
        'choice',
        'created_at',
        'device_hash',
        'grade_band',
        'id',
        'question_id',
        'response_id',
        'role',
        'school_id',
        'value',
        'wave_id',
      ].sort(),
    );
  });
});

describe('constraints', () => {
  const insertAnswer = (questionId: string, value: number | null, choice: string[] | null = null) =>
    db.query(
      `insert into public.answers (response_id, question_id, value, choice) values ($1, $2, $3, $4)
       on conflict (response_id, question_id) do update set value = excluded.value, choice = excluded.choice`,
      [responseId, questionId, value, choice],
    );

  it('validates answers against their question type', async () => {
    await expect(insertAnswer('stress.core', 0)).rejects.toThrow(/1–5/);
    // BEFORE triggers run ahead of CHECK constraints, so the trigger reports the type-specific range.
    await expect(insertAnswer('stress.core', 6)).rejects.toThrow(/1–5/);
    await expect(insertAnswer('stress.swipe', 3)).rejects.toThrow(/0 or 1/);
    await expect(insertAnswer('stress.deep', null, ['unknown'])).rejects.toThrow(/invalid option/);
    await expect(insertAnswer('stress.deep', 1)).rejects.toThrow(/needs options/);
    await expect(insertAnswer('stress.swipe', 1)).resolves.toBeDefined();
    await expect(insertAnswer('stress.deep', null, ['exams', 'homework'])).resolves.toBeDefined();
  });

  it('allows only one option for single-choice questions', async () => {
    await db.exec(`update public.questions set multiple = false where id = 'stress.deep'`);
    await expect(insertAnswer('stress.deep', null, ['exams', 'homework'])).rejects.toThrow(/exactly one/);
    await db.exec(`update public.questions set multiple = true where id = 'stress.deep'`);
  });

  it('allows one response per device and wave', async () => {
    await expect(
      db.query(
        `insert into public.responses (school_id, wave_id, role, device_hash) values ('900000', '2026-W43', 'student', $1)`,
        [fakeHash(1)],
      ),
    ).rejects.toThrow(/unique/);
  });

  it('stores only hashes and day-precise timestamps', async () => {
    await expect(
      db.query(
        `insert into public.responses (school_id, wave_id, role, device_hash) values ('900000', '2026-W43', 'student', 'my-token')`,
      ),
    ).rejects.toThrow(/check constraint/);
    const { rows } = await db.query<{ data_type: string }>(
      `select data_type from information_schema.columns where table_name = 'responses' and column_name = 'created_at'`,
    );
    expect(rows[0]!.data_type).toBe('date');
  });

  it('keeps policy answers short and their region consistent with the scope', async () => {
    const insert = (scope: string, regionId: string | null, body = 'Wir hören euch.') =>
      db.query(
        `insert into public.policy_answers (topic_slug, scope, region_id, title, body, author_role)
         values ('stress', $1, $2, 'Titel', $3, 'ministerium')`,
        [scope, regionId, body],
      );
    await expect(insert('nrw', null)).resolves.toBeDefined();
    await expect(insert('kreis', '05111')).resolves.toBeDefined();
    await expect(insert('nrw', '051')).rejects.toThrow(/check constraint/);
    await expect(insert('kreis', '051')).rejects.toThrow(/check constraint/);
    await expect(insert('nrw', null, 'x'.repeat(401))).rejects.toThrow(/check constraint/);
  });
});

describe('enum parity with src/types/domain.ts', () => {
  /** Reads the allowed values of a `col in (...)` check constraint (Postgres renders it as `col = ANY (ARRAY[...])`). */
  async function checkValues(table: string, column: string): Promise<string[]> {
    const { rows } = await db.query<{ def: string }>(
      `select pg_get_constraintdef(oid) as def from pg_constraint
       where conrelid = $1::regclass and contype = 'c'`,
      [`public.${table}`],
    );
    const def = rows.map((r) => r.def).find((d) => d.includes(`(${column} = ANY (ARRAY[`));
    expect(def, `${table}.${column}`).toBeDefined();
    return [...def!.matchAll(/'([^']+)'::text/g)].map((m) => m[1]!).sort();
  }

  it.each([
    ['schools', 'school_form', SCHOOL_FORMS],
    ['responses', 'grade_band', GRADE_BANDS],
    ['responses', 'role', ROLES],
    ['kreise', 'type', KREIS_TYPES],
    ['questions', 'type', QUESTION_TYPES],
    ['policy_answers', 'status', POLICY_ANSWER_STATUSES],
    ['policy_answers', 'author_role', POLICY_AUTHOR_ROLES],
  ] as const)('%s.%s matches the TS enum', async (table, column, values) => {
    expect(await checkValues(table, column)).toEqual([...values].sort());
  });
});

/**
 * SQL test harness (#77, decision #76): loads all migrations into PGlite – real Postgres as WebAssembly,
 * no Docker or Supabase project needed. Each call returns a fresh, isolated database.
 */
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type DbRole = 'anon' | 'authenticated' | 'service_role';

const supabaseDir = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(readFileSync(supabaseDir('tests/supabase-stub.sql'), 'utf8'));
  // Supabase applies migrations in file-name (= timestamp) order.
  for (const file of readdirSync(supabaseDir('migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    try {
      await db.exec(readFileSync(supabaseDir(`migrations/${file}`), 'utf8'));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`, { cause: error });
    }
  }
  return db;
}

/** Runs `fn` as a Supabase API role (like a request with the anon/authenticated/service key). */
export async function asRole<T>(db: PGlite, role: DbRole, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

export const CURRENT_WAVE = '2026-W43';
export const PREVIOUS_WAVE = '2026-W42';

/**
 * Minimal master data + config: 1 RegBez, 1 Kreis, 1 school, 1 topic with all three question types,
 * 2 waves. Waves are relative to now(), so "current" does not depend on the real calendar.
 */
export async function insertFixtures(db: PGlite): Promise<void> {
  await db.exec(`
    insert into public.regbez values ('051', 'Düsseldorf');
    insert into public.kreise values ('05111', 'Düsseldorf', '051', 'kreisfreie_stadt');
    insert into public.schools values
      ('900000', 'Gesamtschule Düsseldorf-Mitte', 'gesamtschule', '05111', 'Düsseldorf', 51.25, 6.85, 1100, 'DEMO42');
    insert into public.topics values ('stress', 'Stress & Leistungsdruck', '🧯', '{student}', true, 2, 'P0');
    insert into public.questions (id, topic_slug, type, text, options, multiple, weight) values
      ('stress.core', 'stress', 'mood5', 'Wie gut kommst du mit dem Druck klar?', null, false, 1),
      ('stress.swipe', 'stress', 'swipe', 'Ich habe genug Freizeit.', null, false, 0.5),
      ('stress.deep', 'stress', 'choice', 'Was stresst am meisten?',
        '[{"value":"exams","label":"Klausuren"},{"value":"homework","label":"Hausaufgaben"}]', true, 0);
    insert into public.waves values
      ('${PREVIOUS_WAVE}', now() - interval '8 days', now() - interval '1 day'),
      ('${CURRENT_WAVE}', now() - interval '1 day', now() + interval '6 days');
  `);
}

/** 64 hex chars, as produced by sha256 in submit_response (#78). */
export const fakeHash = (seed: number) => seed.toString(16).padStart(64, '0');

import { createHash } from 'node:crypto';
import type { School } from '../../src/types/domain.ts';
import type { SeedData } from '../../src/types/seed.ts';
import { sqlLiteral } from './supabase-seed.ts';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const uuid = (id: string) => {
  const hash = digest(`moodmap:synthetic:answers:v1:${id}`);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
};

/** Admin-only SQL artifact for a dedicated synthetic demo DB. Never part of automatic db reset. */
export function buildSyntheticAnswerSql(data: SeedData, schools: readonly School[]): string {
  const byId = new Map(schools.map((school) => [school.id, school]));
  if (!schools.length || schools.some((school) => !/^9\d{5}$/.test(school.id))) {
    throw new Error('Nur synthetische Demo-Schulnummern 9xxxxx sind erlaubt.');
  }
  const responseRows: string[] = [];
  const answerRows: string[] = [];
  for (const response of data.responses) {
    if (!byId.has(response.schoolId)) throw new Error(`Unbekannte Demo-Schule: ${response.schoolId}`);
    const id = uuid(response.id);
    // Never serialize raw seed device tokens. Normal participation keeps the existing SQL hash format.
    responseRows.push(
      [
        id,
        response.schoolId,
        response.waveId,
        response.role,
        response.gradeBand,
        digest(`${response.deviceToken}:${response.waveId}`),
        response.submittedAt,
      ]
        .map(sqlLiteral)
        .join(', '),
    );
    for (const answer of response.answers) {
      answerRows.push([id, answer.questionId, answer.value, answer.choice].map(sqlLiteral).join(', '));
    }
  }
  const insert = (table: string, columns: string, rows: string[]) => {
    const statements: string[] = [];
    for (let offset = 0; offset < rows.length; offset += 1000) {
      statements.push(
        `insert into public.${table} (${columns}) values\n${rows
          .slice(offset, offset + 1000)
          .map((row) => `(${row})`)
          .join(',\n')}\non conflict do nothing;`,
      );
    }
    return statements.join('\n');
  };
  // A wrong/mixed dataset must abort the whole transaction, rather than attach demo answers to real names.
  const expected = schools
    .map((school) => `(${sqlLiteral(school.id)}, ${sqlLiteral(school.name)})`)
    .join(',\n');
  return [
    '-- SYNTHETIC DEMO ANSWERS ONLY. Import only into a dedicated demo database, never a live participant DB.',
    '-- Generated with npm run db:seed:answers -- --synthetic-demo. No raw device tokens or free text.',
    'begin;',
    `do $$ begin
      if exists (select 1 from (values ${expected}) as expected(id, name)
        left join public.schools s on s.id = expected.id
        where s.id is null or s.name <> expected.name) then
        raise exception 'synthetic school catalog does not match; import aborted';
      end if;
    end $$;`,
    insert('responses', 'id, school_id, wave_id, role, grade_band, device_hash, created_at', responseRows),
    insert('answers', 'response_id, question_id, value, choice', answerRows),
    'commit;',
    '',
  ].join('\n\n');
}

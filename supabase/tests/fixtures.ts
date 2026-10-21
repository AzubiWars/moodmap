/**
 * Shared TS/SQL fixtures for parity tests (#79, condition from #76): the same synthetic responses are
 * loaded into PGlite and handed to the real MockDataSource, so both sides compute on identical data.
 * Deterministic, with deliberate K_MIN edge cases.
 */
import type { PGlite } from '@electric-sql/pglite';
import type { MockAnswer, MockDataset, MockResponse } from '../../src/data/mockRecords.ts';
import type { GradeBand, Question, Role, School, Wave } from '../../src/types/index.ts';
import { createRandom } from '../../scripts/lib/schools.ts';
import { sqlLiteral } from '../../scripts/lib/supabase-seed.ts';

export const FIXTURE_WAVES = ['2026-W40', '2026-W41', '2026-W42', '2026-W43'] as const;
/** First Düsseldorf school: exactly 10 responses in W43, all with the stress core question. */
export const SCHOOL_AT_K_MIN = '900000';
/** Kreis Höxter: 9 responses in W43 (→ null), 11 in W41 of which 1 is choice-only (→ n = 10). */
export const KREIS_AT_K_MIN = '05762';

const GRADE_BANDS: (GradeBand | null)[] = [null, '5-7', '8-10', 'oberstufe', 'berufskolleg'];

interface Plan {
  schoolId: string;
  waveId: string;
  count: number;
  choiceOnly?: number;
  forceStress?: boolean;
}

function plan(schools: readonly School[], random: () => number): Plan[] {
  const inKreis = (kreisId: string) => schools.filter((s) => s.kreisId === kreisId);
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const plans: Plan[] = [];
  const [first, second, ...restDus] = inKreis('05111');
  for (const waveId of FIXTURE_WAVES) {
    for (const school of restDus) plans.push({ schoolId: school.id, waveId, count: int(0, 14) });
    for (const school of inKreis('05315')) plans.push({ schoolId: school.id, waveId, count: int(4, 18) });
  }
  plans.push({ schoolId: first!.id, waveId: '2026-W43', count: 10, forceStress: true });
  plans.push({ schoolId: second!.id, waveId: '2026-W43', count: 9, forceStress: true });
  plans.push({ schoolId: first!.id, waveId: '2026-W42', count: 14 });
  const hoexter = inKreis(KREIS_AT_K_MIN).map((s) => s.id);
  const spread = (waveId: string, total: number, choiceOnly = 0) =>
    hoexter.forEach((schoolId, i) => {
      const count = Math.floor(total / hoexter.length) + (i < total % hoexter.length ? 1 : 0);
      plans.push({ schoolId, waveId, count, choiceOnly: i === 0 ? choiceOnly : 0, forceStress: true });
    });
  spread('2026-W43', 9);
  spread('2026-W42', 10);
  spread('2026-W41', 11, 1);
  return plans;
}

export function buildAggregateFixture(
  schools: readonly School[],
  questions: readonly Question[],
  seed = 79,
): { responses: MockResponse[]; answers: MockAnswer[] } {
  const random = createRandom(seed);
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const byTopic = new Map<string, Question[]>();
  for (const q of questions) byTopic.set(q.topicSlug, [...(byTopic.get(q.topicSlug) ?? []), q]);

  const responses: MockResponse[] = [];
  const answers: MockAnswer[] = [];
  for (const p of plan(schools, random)) {
    for (let i = 0; i < p.count; i++) {
      const id = `00000000-0000-4000-8000-${String(responses.length + 1).padStart(12, '0')}`;
      const role: Role = random() < 0.15 ? 'teacher' : 'student';
      responses.push({
        id,
        schoolId: p.schoolId,
        waveId: p.waveId,
        role,
        gradeBand: GRADE_BANDS[int(0, GRADE_BANDS.length - 1)]!,
        createdAt: '2026-10-01',
      });
      const choiceOnly = i < (p.choiceOnly ?? 0);
      const bias = int(-1, 1);
      for (const [topic, list] of byTopic) {
        for (const q of list) {
          const answerIt =
            q.type === 'choice'
              ? choiceOnly || random() < 0.4
              : !choiceOnly &&
                ((p.forceStress && q.id === 'stress.core') || random() < (q.type === 'mood5' ? 0.75 : 0.35));
          if (!answerIt) continue;
          if (q.type === 'choice') {
            const values = q.options!.map((o) => o.value).filter(() => q.multiple && random() < 0.5);
            const choice = values.length ? values : [q.options![int(0, q.options!.length - 1)]!.value];
            answers.push({ responseId: id, questionId: q.id, choice });
          } else if (q.type === 'swipe') {
            answers.push({ responseId: id, questionId: q.id, value: random() < 0.5 ? 1 : 0 });
          } else {
            // Topic- and school-specific tendencies, so scores actually differ between cells.
            const base = 3 + ((topic.length + Number(p.schoolId)) % 3) - 1 + bias;
            answers.push({
              responseId: id,
              questionId: q.id,
              value: Math.min(5, Math.max(1, base + int(-1, 1))),
            });
          }
        }
      }
    }
  }
  return { responses, answers };
}

/** Inserts the fixture as raw rows (bypassing submit_response, which only accepts the current wave). */
export async function insertAggregateFixture(
  db: PGlite,
  fixture: { responses: MockResponse[]; answers: MockAnswer[] },
): Promise<void> {
  const responseRows = fixture.responses.map(
    (r, i) =>
      `(${[
        r.id,
        r.schoolId,
        r.waveId,
        r.role,
        r.gradeBand ?? null,
        (i + 1).toString(16).padStart(64, '0'),
        r.createdAt,
      ]
        .map(sqlLiteral)
        .join(', ')})`,
  );
  const answerRows = fixture.answers.map(
    (a) =>
      `(${sqlLiteral(a.responseId)}, ${sqlLiteral(a.questionId)}, ${sqlLiteral(a.value ?? null)}, ${a.choice ? sqlLiteral(a.choice) : 'null'})`,
  );
  await db.exec(`
    insert into public.responses (id, school_id, wave_id, role, grade_band, device_hash, created_at)
    values ${responseRows.join(',\n')};
    insert into public.answers (response_id, question_id, value, choice) values ${answerRows.join(',\n')};
  `);
}

/** MockDataset with schools from the seed and the waves exactly as stored in the database. */
export async function mockDatasetFrom(
  db: PGlite,
  schools: readonly School[],
  fixture: { responses: MockResponse[]; answers: MockAnswer[] },
): Promise<MockDataset> {
  const { rows } = await db.query<{ id: string; starts_at: Date; ends_at: Date }>(
    'select id, starts_at, ends_at from public.waves order by starts_at',
  );
  const waves: Wave[] = rows.map((w) => ({
    id: w.id,
    startsAt: w.starts_at.toISOString(),
    endsAt: w.ends_at.toISOString(),
  }));
  return { schools: [...schools], waves, responses: fixture.responses, answers: fixture.answers };
}

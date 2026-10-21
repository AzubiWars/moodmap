// @vitest-environment node
// Early-warning radar + "Politik antwortet" (#81): parity with the MockDataSource, permissions, ratings.
import type { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MockDataset } from '../../src/data/mockRecords.ts';
import { createMockSource } from '../../src/data/mockSource.ts';
import { MOCK_STORAGE_PREFIX } from '../../src/data/mockStorage.ts';
import { QUESTIONS } from '../../src/data/topics.ts';
import { tensionIndex } from '../../src/lib/score.ts';
import type { AggregateQuery, PolicyAnswer, PolicyAnswerFilter, TensionRow } from '../../src/types/index.ts';
import { loadSeedSources, sqlLiteral } from '../../scripts/lib/supabase-seed.ts';
import {
  buildAggregateFixture,
  insertAggregateFixture,
  KREIS_AT_K_MIN,
  mockDatasetFrom,
} from './fixtures.ts';
import { asRole, createTestDb, type DbRole } from './harness.ts';

const seedSql = readFileSync(fileURLToPath(new URL('../seed.sql', import.meta.url)), 'utf8');
const { schools } = loadSeedSources();
const NOW = () => new Date('2026-10-21T10:00:00Z');

/** Map-backed Storage, so ratings can be injected into the mock like a browser would hold them. */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
}

const answer = (
  id: string,
  topic: string,
  scope: PolicyAnswer['scope'],
  regionId: string | null,
  publishedAt: string,
) =>
  ({
    id,
    topic,
    scope,
    regionId,
    title: `Antwort zu ${topic}`,
    body: 'Wir hören euch und handeln.',
    status: 'planned',
    publishedAt,
    resonance: { n: 0, score: null },
    topicDeltaSincePublished: null,
  }) satisfies PolicyAnswer;

const uuid = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`;
const POLICY_ANSWERS: PolicyAnswer[] = [
  answer(uuid(1), 'voice', 'kreis', '05111', '2026-10-07'), // mid W41 → effect W42+ vs W40
  answer(uuid(2), 'ai', 'nrw', null, '2026-10-01'), // NRW-wide
  answer(uuid(3), 'stress', 'regbez', '057', '2026-10-13'),
  answer(uuid(4), 'digital', 'kreis', '05315', '2026-10-19'), // Monday = start of W43 (UTC vs Berlin edge)
];
/** answer index → ratings (1–5): 12 ratings → resonance shown, 5 → hidden (K_MIN). */
const RATINGS: Record<number, number[]> = { 0: [5, 4, 4, 3, 5, 2, 4, 4, 5, 3, 4, 1], 1: [3, 4, 5, 2, 1] };

let db: PGlite;
let mock: ReturnType<typeof createMockSource>;

async function seedPolicy(target: PGlite, storage: Storage) {
  const rows = POLICY_ANSWERS.map(
    (a) =>
      `(${[a.id, a.topic, a.scope, a.regionId, a.title, a.body, a.status, a.publishedAt, 'ministerium'].map(sqlLiteral).join(', ')})`,
  );
  await target.exec(`insert into public.policy_answers
    (id, topic_slug, scope, region_id, title, body, status, published_at, author_role) values ${rows.join(', ')};`);
  for (const [index, values] of Object.entries(RATINGS)) {
    const id = POLICY_ANSWERS[Number(index)]!.id;
    for (const [i, value] of values.entries()) {
      await target.query(
        'insert into public.policy_answer_ratings (answer_id, device_hash, value) values ($1, $2, $3)',
        [id, createHash('sha256').update(`${id}:${i}`).digest('hex'), value],
      );
      storage.setItem(`${MOCK_STORAGE_PREFIX}rating:${id}:${i}`, JSON.stringify({ answerId: id, value }));
    }
  }
}

beforeAll(async () => {
  db = await createTestDb();
  await db.exec(seedSql);
  const fixture = buildAggregateFixture(schools, QUESTIONS);
  await insertAggregateFixture(db, fixture);
  const storage = new MemoryStorage();
  await seedPolicy(db, storage);
  const dataset: MockDataset = {
    ...(await mockDatasetFrom(db, schools, fixture)),
    policyAnswers: POLICY_ANSWERS,
  };
  mock = createMockSource({ loadData: async () => dataset, storage, channel: null, now: NOW });
});

afterAll(() => mock?.dispose());

async function call<T>(
  sql: string,
  params: unknown[] = [],
  role: DbRole = 'anon',
  claims?: object,
): Promise<T> {
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [
    claims ? JSON.stringify(claims) : '',
  ]);
  try {
    const { rows } = await asRole(db, role, () => db.query<{ result: T }>(`select ${sql} as result`, params));
    return rows[0]!.result;
  } finally {
    await db.query(`select set_config('request.jwt.claims', '', false)`);
  }
}

const byId = <T extends { id: string }>(rows: T[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));

describe('get_tension_index', () => {
  const queries: AggregateQuery[] = [
    { level: 'regbez', topic: 'all', waveIds: ['2026-W43'] },
    { level: 'kreis', topic: 'all', waveIds: ['2026-W43'] },
    { level: 'kreis', topic: 'all', waveIds: ['2026-W42', '2026-W43'] },
    { level: 'kreis', topic: 'all', waveIds: ['2026-W42'], gradeBand: ['8-10', 'oberstufe'] },
    { level: 'school', topic: 'all', parentId: '05111', waveIds: ['2026-W43'] },
    { level: 'school', topic: 'all', parentId: KREIS_AT_K_MIN, waveIds: ['2026-W41'] },
    { level: 'regbez', topic: 'stress', waveIds: ['2026-W41'], role: 'student' },
    { level: 'kreis', topic: 'all', waveIds: ['2026-W40'], schoolForm: ['gymnasium', 'gesamtschule'] },
  ];

  it(`matches the MockDataSource for ${queries.length} queries`, async () => {
    let withIndex = 0;
    let withTrend = 0;
    for (const query of queries) {
      const [sql, ts] = [
        await call<TensionRow[]>('public.get_tension_index($1::jsonb)', [JSON.stringify(query)]),
        await mock.getTensionIndex(query),
      ];
      expect(sql, JSON.stringify(query)).toEqual(ts);
      withIndex += sql.filter((r) => r.index !== null).length;
      withTrend += sql.filter((r) => r.trend !== null).length;
    }
    expect(withIndex).toBeGreaterThan(5);
    expect(withTrend).toBeGreaterThan(2);
  }, 60_000);

  describe('hand-calculated trend bonus', () => {
    let small: PGlite;
    let smallMock: ReturnType<typeof createMockSource>;

    beforeAll(async () => {
      small = await createTestDb();
      await small.exec(seedSql);
      // 10 responses per wave at the demo school: voice falls 5 → 4 → 3, safety and community stay at 4.
      const responses: MockDataset['responses'] = [];
      const answers: MockDataset['answers'] = [];
      ['2026-W41', '2026-W42', '2026-W43'].forEach((waveId, w) => {
        for (let i = 0; i < 10; i++) {
          const id = `00000000-0000-4000-b000-${String(w * 100 + i).padStart(12, '0')}`;
          responses.push({
            id,
            schoolId: '900000',
            waveId,
            role: 'student',
            gradeBand: null,
            createdAt: '2026-10-01',
          });
          answers.push({ responseId: id, questionId: 'voice.core', value: 5 - w });
          answers.push({ responseId: id, questionId: 'safety.core', value: 4 });
          answers.push({ responseId: id, questionId: 'community.core', value: 4 });
        }
      });
      await insertAggregateFixture(small, { responses, answers });
      const dataset = await mockDatasetFrom(small, schools, { responses, answers });
      smallMock = createMockSource({ loadData: async () => dataset, storage: null, channel: null, now: NOW });
    });

    afterAll(() => smallMock?.dispose());

    it('adds +10 when voice falls over 3 waves, exactly like tensionIndex()', async () => {
      const query: AggregateQuery = { level: 'kreis', topic: 'all', waveIds: ['2026-W43'] };
      const { rows } = await small.query<{ result: TensionRow[] }>(
        'select public.get_tension_index($1::jsonb) as result',
        [JSON.stringify(query)],
      );
      const row = rows[0]!.result.find((r) => r.id === '05111')!;
      // voice 50, safety 75, community 75 → 100 − (15 + 15 + 11.25) / 0.65 = 36.5…, + 10 = 46.5 → watch
      const expected = tensionIndex(
        { voice: { n: 10, score: 50 }, safety: { n: 10, score: 75 }, community: { n: 10, score: 75 } },
        { voiceDeclining3Waves: true },
      );
      expect(expected).toEqual({ index: 46.5, level: 'watch', drivers: ['voice', 'safety'] });
      expect(row).toMatchObject(expected);
      // W43 vs W42 (voice 75 → no 3-wave decline yet in W42): 100 − 48.75/0.65 = 25 → trend 21.5
      expect(row.trend).toBe(21.5);
      expect(rows[0]!.result).toEqual(await smallMock.getTensionIndex(query));
    });
  });

  it('accepts level nrw on all public entry points like the mock (#147, #158)', async () => {
    const query = { level: 'nrw', topic: 'all', parentId: '053', waveIds: ['2026-W42', '2026-W43'] } as const;
    const [tension, aggregates, trend] = await Promise.all([
      call<TensionRow[]>('public.get_tension_index($1::jsonb)', [JSON.stringify(query)]),
      call('public.get_aggregates($1::jsonb)', [JSON.stringify(query)]),
      call('public.get_trend($1::jsonb)', [JSON.stringify(query)]),
    ]);
    expect(tension).toEqual(await mock.getTensionIndex(query));
    expect(aggregates).toEqual(await mock.getAggregates(query));
    expect(trend).toEqual(await mock.getTrend(query));
    expect(tension.map((r) => r.id)).toEqual(['nrw']);
    expect(tension[0]!.index).not.toBeNull();
  });
});

describe('get_policy_answers', () => {
  const filters: PolicyAnswerFilter[] = [
    {},
    { topics: ['voice'] },
    { regionIds: ['05111'] },
    { regionIds: ['057'], topics: ['stress', 'ai'] },
    { regionIds: ['05315'] },
  ];

  it.each(filters)('matches the MockDataSource for %j', async (filter) => {
    const sql = await call<PolicyAnswer[]>('public.get_policy_answers($1::jsonb)', [JSON.stringify(filter)]);
    expect(byId(sql)).toEqual(byId(await mock.getPolicyAnswers(filter)));
  });

  it('covers resonance and effect in both states', async () => {
    const all = byId(await call<PolicyAnswer[]>('public.get_policy_answers($1::jsonb)', ['{}']));
    expect(all[0]!.resonance).toEqual({ n: 12, score: expect.any(Number) }); // ≥ K_MIN
    expect(all[1]!.resonance).toEqual({ n: 5, score: null }); // < K_MIN
    expect(all.some((a) => a.topicDeltaSincePublished !== null)).toBe(true);
    expect(all[3]!.topicDeltaSincePublished).toBeNull(); // nothing after W43 yet
  });

  it('returns newest answers first', async () => {
    const all = await call<PolicyAnswer[]>('public.get_policy_answers($1::jsonb)', ['{}']);
    expect(all.map((a) => a.publishedAt)).toEqual([...all.map((a) => a.publishedAt)].sort().reverse());
  });
});

describe('publish_policy_answer', () => {
  const ministry = { app_metadata: { moodmap_role: 'ministerium' } };
  const input = {
    topic: 'voice',
    scope: 'kreis',
    regionId: '05111',
    title: '  Dialogrunde mit euren SVs  ',
    body: ' Ab nächster Woche: zusätzliche Schulsozialarbeit. ',
    authorRole: 'ministerium',
  };
  const publish = (body: object, role: DbRole = 'authenticated', claims?: object) =>
    call<PolicyAnswer>('public.publish_policy_answer($1::jsonb)', [JSON.stringify(body)], role, claims);

  it('lets a ministry account publish and returns a PolicyAnswer like the mock', async () => {
    const published = await publish(input, 'authenticated', ministry);
    const expected = await mock.publishPolicyAnswer(input as Parameters<typeof mock.publishPolicyAnswer>[0]);
    const today = (await call<string>(`to_char(current_date, 'YYYY-MM-DD')`, [], 'authenticated')).toString();
    expect({ ...published, id: 'x' }).toEqual({ ...expected, id: 'x', publishedAt: today });
    expect(published.title).toBe('Dialogrunde mit euren SVs');
  });

  it.each([
    ['anon', 'anon', ministry, /permission denied/],
    ['an account without role', 'authenticated', undefined, /only ministry/],
    [
      'a self-assigned user_metadata role',
      'authenticated',
      { user_metadata: { moodmap_role: 'ministerium' } },
      /only ministry/,
    ],
  ] as const)('refuses %s', async (_, role, claims, message) => {
    await expect(publish(input, role, claims)).rejects.toThrow(message);
  });

  it.each([
    ['author role mismatch', { authorRole: 'bezreg' }],
    ['unknown topic', { topic: 'nope' }],
    ['title too long', { title: 'x'.repeat(121) }],
    ['empty body', { body: '   ' }],
    ['body too long', { body: 'x'.repeat(401) }],
    ['nrw with region', { scope: 'nrw', regionId: '05111' }],
    ['unknown kreis', { regionId: '05999' }],
    ['invalid status', { status: 'secret' }],
  ])('rejects %s', async (_, override) => {
    await expect(publish({ ...input, ...override }, 'authenticated', ministry)).rejects.toThrow(
      /invalid policy answer/,
    );
  });
});

describe('rate_policy_answer', () => {
  const target = POLICY_ANSWERS[2]!.id;
  const token = 'rating-device-token-0001';
  const rate = (answerId: string, value: number, deviceToken = token) =>
    call<{ ok: boolean }>('public.rate_policy_answer($1, $2, $3)', [answerId, value, deviceToken]);
  const stored = async () =>
    (
      await db.query<{ value: number; device_hash: string }>(
        'select value, device_hash from public.policy_answer_ratings where answer_id = $1',
        [target],
      )
    ).rows;

  it('stores one hashed rating per device and lets it be changed', async () => {
    await expect(rate(target, 4)).resolves.toEqual({ ok: true });
    await expect(rate(target, 2)).resolves.toEqual({ ok: true });
    const rows = await stored();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      value: 2,
      device_hash: createHash('sha256').update(`${token}:policy:${target}`).digest('hex'),
    });
  });

  it.each([
    ['value 0', target, 0, token],
    ['value 6', target, 6, token],
    ['short token', target, 3, 'abc'],
    ['no uuid', 'pol-01', 3, token],
    ['unknown answer', uuid(999), 3, token],
  ])('answers { ok: false } for %s', async (_, id, value, deviceToken) => {
    await expect(rate(id, value, deviceToken)).resolves.toEqual({ ok: false });
  });
});

describe('exposure', () => {
  it('keeps the building blocks private', async () => {
    for (const sql of [
      `public.tension_of('{}', false, false)`,
      `public.tension_rows('{}', '{}')`,
      `public.assert_public_level('{}')`,
    ]) {
      await expect(call(sql)).rejects.toThrow(/permission denied/);
    }
  });
});

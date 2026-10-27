import type { AggregateQuery, ResponseInput } from '@/types';
import { createConfiguredSupabaseSource, createSupabaseSource } from './supabaseSource';

const url = 'https://demo.supabase.co';
const input: ResponseInput = {
  schoolId: '900000',
  waveId: '2026-W43',
  role: 'student',
  deviceToken: 'random-device-token-001',
  answers: [{ questionId: 'stress.core', value: 3 }],
};
const query: AggregateQuery = {
  level: 'nrw',
  topic: 'stress',
  schoolForm: ['gymnasium'],
  gradeBand: ['8-10'],
  waveIds: ['2026-W43'],
};
const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), { status, headers });
const setup = (
  respond: (path: string, body: unknown) => Response = () => json([]),
  directory: typeof fetch = async () => new Response('', { status: 404 }),
) => {
  const fetcher = vi.fn<typeof fetch>(async (target, init) =>
    respond(new URL(String(target)).pathname, init?.body ? JSON.parse(String(init.body)) : undefined),
  );
  return {
    fetcher,
    source: createSupabaseSource({
      url,
      anonKey: 'public-anon-key',
      fetcher,
      directoryFetcher: directory,
      channelFactory: null,
    }),
  };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('SupabaseDataSource', () => {
  it('resets the fixed Pitch target through the Edge Function without persisting the PIN', async () => {
    const { source, fetcher } = setup(() => json({ ok: true }));
    const changed = vi.fn();
    const stop = source.subscribeToNewResponses(changed);
    expect(await source.resetPitchTest('synthetic-admin-pin')).toEqual({ ok: true });
    const [target, init] = fetcher.mock.calls[0]!;
    expect(String(target)).toBe(`${url}/functions/v1/pitch-reset`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ pin: 'synthetic-admin-pin' });
    expect(new Headers(init?.headers).get('apikey')).toBe('public-anon-key');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer public-anon-key');
    expect(changed).toHaveBeenCalledExactlyOnceWith({ schoolId: 'pitch-test' });
    stop();
  });

  it('supports publishable headers for reset and returns generic failures', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json({ error: 'private database error' }, 401));
    const source = createSupabaseSource({
      url,
      anonKey: 'sb_publishable_public',
      fetcher,
      channelFactory: null,
    });
    const changed = vi.fn();
    const stop = source.subscribeToNewResponses(changed);
    expect(await source.resetPitchTest('short')).toEqual({ ok: false });
    expect(fetcher).not.toHaveBeenCalled();
    expect(await source.resetPitchTest('synthetic-admin-pin')).toEqual({ ok: false });
    expect(new Headers(fetcher.mock.calls[0]![1]?.headers).has('Authorization')).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    stop();
  });

  it.each([null, { school: {}, waveId: null }])(
    'reports a missing Pitch round without a TypeError (%j)',
    async (data) => {
      const { source } = setup(() => json(data));
      await expect(source.getPitchAggregate()).rejects.toThrow('Keine aktive Pitch-Runde verfügbar.');
    },
  );
  it('registers the configured live source while keeping an independent mock default', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'supabase');
    vi.stubEnv('VITE_SUPABASE_URL', url);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_public');
    const fetcher = vi.fn<typeof fetch>(async () => json({ id: '2026-W43' }));
    vi.stubGlobal('fetch', fetcher);
    vi.resetModules();
    const { getDataSource } = await import('./index');
    expect(getDataSource()).not.toBe(getDataSource('mock'));
    expect(await getDataSource().getCurrentWave()).toEqual({ id: '2026-W43' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('notifies other tabs with school IDs only and releases the channel on unsubscribe', async () => {
    const channel = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      postMessage: vi.fn(),
      close: vi.fn(),
    };
    const source = createSupabaseSource({
      url,
      anonKey: 'public-key',
      fetcher: async () => json({ ok: true }),
      channelFactory: () => channel as unknown as BroadcastChannel,
    });
    const callback = vi.fn();
    const stopBroken = source.subscribeToNewResponses(() => {
      throw new Error('view error');
    });
    const stop = source.subscribeToNewResponses(callback);
    expect(await source.submitResponse(input)).toEqual({ ok: true });
    expect(channel.postMessage).toHaveBeenCalledExactlyOnceWith({ schoolId: '900000' });
    channel.onmessage?.(
      new MessageEvent('message', { data: { schoolId: '900001', deviceToken: 'must not propagate' } }),
    );
    expect(callback).toHaveBeenLastCalledWith({ schoolId: '900001' });
    channel.onmessage?.(new MessageEvent('message', { data: { schoolId: 42 } }));
    expect(callback).toHaveBeenCalledTimes(2);
    stopBroken();
    stop();
    expect(channel.close).toHaveBeenCalledOnce();
    source.dispose();
  });

  it('loads all schools from the parallel REST fallback when pages are capped, without join codes', async () => {
    const rows = [0, 1, 2].map((i) => ({
      id: String(900000 + i),
      name: `Testschule ${i}`,
      schoolForm: 'gymnasium',
      kreisId: '05111',
      city: 'Teststadt',
      lat: 51,
      lon: 7,
      studentCount: null,
    }));
    const fetcher = vi.fn<typeof fetch>(async (target) => {
      const params = new URL(String(target)).searchParams;
      return json(rows.slice(Number(params.get('offset')), Number(params.get('offset')) + 2), 206, {
        'Content-Range': `${params.get('offset')}-2/3`,
      });
    });
    const source = createSupabaseSource({
      url,
      anonKey: 'public-key',
      fetcher,
      directoryFetcher: async () => new Response('', { status: 404 }),
      channelFactory: null,
    });
    expect(await source.getSchools()).toEqual(rows.map((s) => ({ ...s, joinCode: '' })));
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [target, init] of fetcher.mock.calls) {
      const targetUrl = new URL(String(target));
      expect(targetUrl.pathname).toBe('/rest/v1/schools');
      expect(targetUrl.searchParams.get('select')).not.toMatch(/\*|join_code/);
      expect(targetUrl.searchParams.get('select')).toContain('schoolForm:school_form');
      expect(targetUrl.searchParams.get('order')).toBe('id.asc');
      expect(new Headers(init?.headers).get('apikey')).toBe('public-key');
      expect(init?.cache).toBe('no-store');
    }
    const [, second] = fetcher.mock.calls;
    expect(new URL(String(second![0])).searchParams.get('offset')).toBe('2');
    expect(new URL(String(second![0])).searchParams.get('limit')).toBe('2');
  });

  it('prefers the cached static school directory and makes no REST request', async () => {
    const directory = vi.fn<typeof fetch>(async () =>
      json({
        ids: ['100010', '100011'],
        names: ['Schule A', 'Schule B'],
        forms: ['gymnasium', 'grundschule'],
        kreisIds: ['05111', '05111'],
        cities: ['Düsseldorf', 'Düsseldorf'],
        lats: [51.1, 51.2],
        lons: [6.7, 6.8],
        studentCounts: [500, null],
      }),
    );
    const { source, fetcher } = setup(undefined, directory);
    expect(await source.getSchools()).toEqual([
      {
        id: '100010',
        name: 'Schule A',
        schoolForm: 'gymnasium',
        kreisId: '05111',
        city: 'Düsseldorf',
        lat: 51.1,
        lon: 6.7,
        studentCount: 500,
        joinCode: '',
      },
      {
        id: '100011',
        name: 'Schule B',
        schoolForm: 'grundschule',
        kreisId: '05111',
        city: 'Düsseldorf',
        lat: 51.2,
        lon: 6.8,
        studentCount: null,
        joinCode: '',
      },
    ]);
    expect(directory).toHaveBeenCalledOnce();
    expect(String(directory.mock.calls[0]![0])).toBe('/data/schools.min.json');
    expect(directory.mock.calls[0]![1]?.cache).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([404, 200])(
    'falls back to REST when the static directory is missing or malformed (HTTP %i)',
    async (status) => {
      const rows = [
        {
          id: '100010',
          name: 'Schule A',
          schoolForm: 'gymnasium',
          kreisId: '05111',
          city: 'Düsseldorf',
          lat: 51.1,
          lon: 6.7,
          studentCount: null,
        },
      ];
      const fetcher = vi.fn<typeof fetch>(async () => json(rows, 206, { 'Content-Range': '0-0/1' }));
      const source = createSupabaseSource({
        url,
        anonKey: 'public-key',
        fetcher,
        directoryFetcher: async () =>
          status === 404 ? new Response('', { status }) : json({ ids: ['100010'] }),
        channelFactory: null,
      });
      expect(await source.getSchools()).toEqual(rows.map((s) => ({ ...s, joinCode: '' })));
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );

  it('uses the exact RPC contracts and preserves filters, skipped answers and test flags', async () => {
    const { source, fetcher } = setup((path) =>
      json(
        path.endsWith('get_school_by_code')
          ? { id: 'pitch-test', isTest: true }
          : path.endsWith('get_current_wave')
            ? { id: '2026-W43' }
            : path.endsWith('get_choice_distribution')
              ? null
              : [],
      ),
    );
    expect(await source.getSchoolByCode(' PITCH ')).toMatchObject({ id: 'pitch-test', isTest: true });
    expect(await source.getCurrentWave()).toMatchObject({ id: '2026-W43' });
    await source.getAggregates(query);
    await source.getTrend({ ...query, waveIds: ['2026-W42', '2026-W43'] });
    await source.getTensionIndex(query);
    await source.getChoiceDistribution('stress.deep', { level: 'kreis', id: '05111' });
    await source.getPolicyAnswers({ topics: ['stress'], regionIds: ['05111'] });
    await source.getTopics();
    const calls = fetcher.mock.calls.map(([target, init]) => ({
      path: new URL(String(target)).pathname,
      body: init?.body && JSON.parse(String(init.body)),
    }));
    expect(calls).toEqual([
      { path: '/rest/v1/rpc/get_school_by_code', body: { code: ' PITCH ' } },
      { path: '/rest/v1/rpc/get_current_wave', body: {} },
      { path: '/rest/v1/rpc/get_aggregates', body: { query } },
      { path: '/rest/v1/rpc/get_trend', body: { query: { ...query, waveIds: ['2026-W42', '2026-W43'] } } },
      { path: '/rest/v1/rpc/get_tension_index', body: { query } },
      {
        path: '/rest/v1/rpc/get_choice_distribution',
        body: { question_id: 'stress.deep', scope: { level: 'kreis', id: '05111' } },
      },
      {
        path: '/rest/v1/rpc/get_policy_answers',
        body: { filter: { topics: ['stress'], regionIds: ['05111'] } },
      },
      { path: '/rest/v1/topics', body: undefined },
    ]);
  });

  it('loads the pitch aggregate and freetext clusters through their RPCs', async () => {
    const pitch = {
      school: {
        id: 'pitch-test',
        name: 'Pitch-Test',
        city: 'Berlin',
        lat: 52.52,
        lon: 13.405,
        isTest: true,
      },
      waveId: '2026-W43',
      n: 12,
      scoredN: 12,
      score: 61,
      topicScores: { stress: 60 },
    };
    const clusters = [
      { cluster: 'Toiletten', count: 12, topics: ['building'], examples: ['Die Toiletten sind kaputt.'] },
    ];
    const { source, fetcher } = setup((path) =>
      json(path.endsWith('get_pitch_aggregate') ? pitch : clusters),
    );
    expect(await source.getPitchAggregate()).toEqual(pitch);
    expect(await source.getFreetextClusters({ level: 'school', id: 'pitch-test' })).toEqual(clusters);
    expect(fetcher.mock.calls.map(([target]) => new URL(String(target)).pathname).slice(-2)).toEqual([
      '/rest/v1/rpc/get_pitch_aggregate',
      '/rest/v1/rpc/get_freetext_clusters',
    ]);
  });

  it('masks the pitch aggregate below K_MIN as a second guard', async () => {
    const { source } = setup(() =>
      json({
        school: {
          id: 'pitch-test',
          name: 'Pitch-Test',
          city: 'Berlin',
          lat: 52.52,
          lon: 13.405,
          isTest: true,
        },
        waveId: '2026-W43',
        n: 9,
        scoredN: 9,
        score: 61,
        topicScores: { stress: 60 },
      }),
    );
    expect(await source.getPitchAggregate()).toMatchObject({
      n: 9,
      scoredN: 9,
      score: null,
      topicScores: { stress: null },
    });
  });

  it('masks scores below K_MIN and small choice counts as a second guard', async () => {
    const { source } = setup((path) => {
      if (path.endsWith('get_choice_distribution'))
        return json({
          questionId: 'stress.deep',
          n: 10,
          options: [
            { value: 'exams', count: 2 },
            { value: 'noise', count: 8 },
          ],
        });
      if (path.endsWith('get_policy_answers')) return json([{ resonance: { n: 9, score: 80 } }]);
      return json([
        {
          id: 'nrw',
          waveId: '2026-W43',
          n: 9,
          score: 80,
          delta: 4,
          topicScores: { stress: 80 },
          distribution: { 1: 9 },
        },
      ]);
    });
    expect((await source.getAggregates(query))[0]).toMatchObject({
      score: null,
      delta: null,
      topicScores: { stress: null },
      distribution: null,
    });
    expect((await source.getTrend({ ...query, waveIds: ['2026-W43'] }))[0]?.score).toBeNull();
    expect((await source.getChoiceDistribution('stress.deep', { level: 'nrw', id: null }))?.options).toEqual([
      { value: 'exams', count: null },
      { value: 'noise', count: 8 },
    ]);
    expect((await source.getPolicyAnswers({}))[0]?.resonance.score).toBeNull();
    expect(
      await setup(() => json({ n: 9, options: [] })).source.getChoiceDistribution('stress.deep', {
        level: 'nrw',
        id: null,
      }),
    ).toBeNull();
  });

  it('maps submission failures without leaking backend messages and only announces stored votes', async () => {
    let response = json({ ok: true });
    const { source, fetcher } = setup(() => response.clone());
    const callback = vi.fn();
    const unsubscribe = source.subscribeToNewResponses(callback);
    expect(await source.submitResponse(input)).toEqual({ ok: true });
    expect(callback).toHaveBeenCalledExactlyOnceWith({ schoolId: '900000' });
    response = json({ ok: false, reason: 'already_submitted' });
    expect(await source.submitResponse(input)).toEqual({ ok: false, reason: 'already_submitted' });
    response = json({ message: 'database detail must not escape' }, 400);
    expect(await source.submitResponse(input)).toEqual({ ok: false, reason: 'error' });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body))).toEqual({ input });
    await expect(source.getAggregates(query)).rejects.toThrow('Die Live-Daten');
    unsubscribe();
    source.dispose();
  });

  it('handles null schools/waves and network failures, without substituting demo data', async () => {
    const { source } = setup(() => json(null));
    expect(await source.getSchoolByCode('UNKNOWN')).toBeNull();
    await expect(source.getCurrentWave()).rejects.toThrow(/keine Umfragewoche/);
    const broken = createSupabaseSource({
      url,
      anonKey: 'public-key',
      fetcher: async () => {
        throw new Error('private details');
      },
      directoryFetcher: async () => new Response('', { status: 404 }),
      channelFactory: null,
    });
    expect(await broken.submitResponse(input)).toEqual({ ok: false, reason: 'error' });
    expect(await broken.ratePolicyAnswer('answer', 4)).toEqual({ ok: false });
    await expect(broken.getSchools()).rejects.toThrow(/Live-Daten/);
  });

  it('withdraws only through the token-bound RPC and maps missing/failed deletions', async () => {
    let result = json({ ok: true });
    const { source, fetcher } = setup(() => result.clone());
    const own = { waveId: input.waveId, deviceToken: input.deviceToken };
    expect(await source.deleteOwnResponse(own)).toEqual({ ok: true });
    expect(String(fetcher.mock.calls[0]![0])).toBe(`${url}/rest/v1/rpc/delete_own_response`);
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body))).toEqual({ input: own });
    result = json({ ok: false, reason: 'not_found' });
    expect(await source.deleteOwnResponse(own)).toEqual({ ok: false, reason: 'not_found' });
    result = json({ message: 'private detail' }, 500);
    expect(await source.deleteOwnResponse(own)).toEqual({ ok: false, reason: 'error' });
  });

  it('sends publisher JWTs separately from publishable API keys and rates with the local device token', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json({ ok: true }));
    const source = createSupabaseSource({
      url,
      anonKey: 'sb_publishable_public',
      accessToken: () => 'signed-user-jwt',
      fetcher,
      channelFactory: null,
    });
    const policy = {
      topic: 'stress',
      scope: 'nrw' as const,
      regionId: null,
      title: 'Dialog',
      body: 'Wir hören zu.',
      authorRole: 'ministerium' as const,
    };
    await source.publishPolicyAnswer(policy);
    await source.ratePolicyAnswer('answer-id', 4);
    const [target, init] = fetcher.mock.calls[0]!;
    expect(String(target)).toContain('/rpc/publish_policy_answer');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer signed-user-jwt');
    expect(new Headers(init?.headers).get('apikey')).toBe('sb_publishable_public');
    expect(JSON.parse(String(init?.body))).toEqual({ input: policy });
    expect(JSON.parse(String(fetcher.mock.calls[1]![1]?.body))).toMatchObject({
      answer_id: 'answer-id',
      value: 4,
      device_token: expect.any(String),
    });
    const anonymous = createSupabaseSource({
      url,
      anonKey: 'sb_publishable_public',
      fetcher,
      channelFactory: null,
    });
    await anonymous.getSchoolByCode('DEMO42');
    expect(new Headers(fetcher.mock.calls[2]![1]?.headers).has('Authorization')).toBe(false);
  });

  it('rejects admin keys and configures a source only when both public settings exist', () => {
    expect(() => createSupabaseSource({ url, anonKey: 'sb_secret_never-browser' })).toThrow(/öffentlichen/);
    const serviceKey = `header.${btoa(JSON.stringify({ role: 'service_role' }))}.signature`;
    expect(() => createSupabaseSource({ url, anonKey: serviceKey })).toThrow(/service_role/);
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    expect(createConfiguredSupabaseSource()).toBeUndefined();
    vi.stubEnv('VITE_SUPABASE_URL', url);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_public');
    expect(createConfiguredSupabaseSource()).toBeDefined();
  });
});

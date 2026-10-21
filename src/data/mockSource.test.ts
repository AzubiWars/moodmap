/// <reference types="node" />
import { webcrypto } from 'node:crypto';
import { createMockSource } from './mockSource';
import { MOCK_STORAGE_PREFIX } from './mockStorage';
import type { MockDataset } from './mockRecords';
import type { ResponseInput } from '@/types';
import * as device from '@/lib/device';

const now = () => new Date('2026-10-21T12:34:56Z');
function fixture(n = 9): MockDataset {
  const responses = Array.from({ length: n }, (_, i) => ({
    id: `r-${i}`,
    schoolId: '900000',
    waveId: '2026-W43',
    role: 'student' as const,
    gradeBand: '8-10' as const,
    createdAt: '2026-10-21',
  }));
  return {
    schools: [
      {
        id: '900000',
        name: 'Demo-Schule',
        city: 'Düsseldorf',
        kreisId: '05111',
        schoolForm: 'gesamtschule',
        joinCode: 'DEMO42',
        lat: 51.2,
        lon: 6.8,
        studentCount: 100,
      },
    ],
    waves: [
      { id: '2026-W42', startsAt: '2026-10-12T00:00:00Z', endsAt: '2026-10-19T00:00:00Z' },
      { id: '2026-W43', startsAt: '2026-10-19T00:00:00Z', endsAt: '2026-10-26T00:00:00Z' },
      { id: '2026-W44', startsAt: '2026-10-26T00:00:00Z', endsAt: '2026-11-02T00:00:00Z' },
    ],
    responses,
    answers: responses.map((response) => ({ responseId: response.id, questionId: 'ai.core', value: 3 })),
  };
}
const input = (overrides: Partial<ResponseInput> = {}): ResponseInput => ({
  schoolId: '900000',
  waveId: '2026-W43',
  role: 'student',
  deviceToken: 'random-demo-token',
  answers: [{ questionId: 'ai.core', value: 5 }],
  ...overrides,
});
const query = { level: 'school' as const, topic: 'ai' };
const sources: ReturnType<typeof createMockSource>[] = [];
function source(data = fixture(), extras: Partial<Parameters<typeof createMockSource>[0]> = {}) {
  const result = createMockSource({
    loadData: async () => data,
    now,
    storage: localStorage,
    channel: null,
    ...extras,
  });
  sources.push(result);
  return result;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('crypto', webcrypto);
});
afterEach(() => {
  sources.splice(0).forEach((entry) => entry.dispose());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('MockDataSource', () => {
  it('keeps test schools outside NRW data and separates their device participation', async () => {
    const data = fixture(10);
    data.schools.push({
      ...data.schools[0]!,
      id: 'pitch-test',
      kreisId: 'TEST-PITCH',
      joinCode: 'PITCH',
      isTest: true,
    });
    const mock = source(data);
    expect((await mock.getSchools()).map((s) => s.id)).toEqual(['900000']);
    expect(await mock.getSchoolByCode('PITCH')).toMatchObject({ id: 'pitch-test', isTest: true });
    expect(await mock.submitResponse(input())).toEqual({ ok: true });
    expect(await mock.submitResponse(input({ schoolId: 'pitch-test' }))).toEqual({ ok: true });
    expect(await mock.submitResponse(input({ schoolId: 'pitch-test' }))).toEqual({
      ok: false,
      reason: 'already_submitted',
    });
    expect(await mock.getAggregates({ level: 'nrw', topic: 'ai' })).toEqual([
      expect.objectContaining({ id: 'nrw', n: 11 }),
    ]);
    expect(await mock.getAggregates(query)).toEqual([expect.objectContaining({ id: '900000', n: 11 })]);
    expect(await mock.getChoiceDistribution('ai.deep', { level: 'school', id: 'pitch-test' })).toBeNull();
    expect(await mock.getPitchAggregate()).toMatchObject({
      school: { id: 'pitch-test', isTest: true },
      n: 1,
      scoredN: 1,
      score: null,
    });
    expect(await mock.getFreetextClusters({ level: 'school', id: 'pitch-test' })).toEqual([]);
  });

  it('restores submitted votes after reload without persisting the raw device token', async () => {
    const first = source();
    expect((await first.getAggregates(query))[0]).toMatchObject({ n: 9, score: null });
    expect(await first.submitResponse(input())).toEqual({ ok: true });
    const second = source();
    expect((await second.getAggregates(query))[0]).toMatchObject({ n: 10, score: 55 });
    expect(await second.submitResponse(input())).toEqual({ ok: false, reason: 'already_submitted' });
    const saved = Object.keys(localStorage)
      .map((key) => `${key}:${localStorage.getItem(key)}`)
      .join('');
    expect(saved).not.toContain('random-demo-token');
    expect(saved).not.toContain('12:34');
    expect(saved).toContain('2026-10-21');
  });

  it('blocks duplicate parallel submissions and permits the next wave', async () => {
    const data = fixture();
    const clock = { date: now() };
    const mock = source(data, { now: () => clock.date });
    const results = await Promise.all([mock.submitResponse(input()), mock.submitResponse(input())]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    clock.date = new Date('2026-10-27');
    expect((await mock.getCurrentWave()).id).toBe('2026-W44');
    expect(await mock.submitResponse(input({ waveId: '2026-W44' }))).toEqual({ ok: true });
  });

  it('lets a device withdraw its own response and take part again (#161)', async () => {
    const mock = source();
    const own = { waveId: '2026-W43', deviceToken: 'random-demo-token' };
    const events: string[] = [];
    mock.subscribeToNewResponses((event) => events.push(event.schoolId));
    expect(await mock.submitResponse(input())).toEqual({ ok: true });
    expect((await mock.getAggregates(query))[0]?.n).toBe(10);

    expect(await mock.deleteOwnResponse(own)).toEqual({ ok: true });
    expect((await mock.getAggregates(query))[0]).toMatchObject({ n: 9, score: null });
    expect(events).toEqual(['900000', '900000']); // submit + delete refresh the live map
    expect(await mock.deleteOwnResponse(own)).toEqual({ ok: false, reason: 'not_found' });

    expect(await mock.submitResponse(input({ answers: [{ questionId: 'ai.core', value: 1 }] }))).toEqual({
      ok: true,
    });
    expect((await source().getAggregates(query))[0]).toMatchObject({ n: 10, score: 45 }); // persisted
  });

  it('only withdraws the response of this device in the current wave', async () => {
    const mock = source();
    expect(await mock.submitResponse(input())).toEqual({ ok: true });
    expect(await mock.deleteOwnResponse({ waveId: '2026-W43', deviceToken: 'someone-else' })).toEqual({
      ok: false,
      reason: 'not_found',
    });
    expect(await mock.deleteOwnResponse({ waveId: '2026-W42', deviceToken: 'random-demo-token' })).toEqual({
      ok: false,
      reason: 'error',
    });
    expect(await mock.deleteOwnResponse({ waveId: '2026-W43', deviceToken: '' })).toEqual({
      ok: false,
      reason: 'error',
    });
    expect((await mock.getAggregates(query))[0]?.n).toBe(10);
  });

  it.each([
    { schoolId: 'unknown' },
    { waveId: '2026-W42' },
    { deviceToken: '' },
    { answers: [{ questionId: 'ai.core', value: 6 }] },
    { answers: [{ questionId: 'unknown', value: 3 }] },
    {
      answers: [
        { questionId: 'ai.core', value: 3 },
        { questionId: 'ai.core', value: 4 },
      ],
    },
    { answers: [{ questionId: 'ai.deep', choice: ['not-an-option'] }] },
  ] as Partial<ResponseInput>[])(
    'rejects invalid input without reserving a device or changing aggregates: %j',
    async (overrides) => {
      const mock = source();
      expect(await mock.submitResponse(input(overrides))).toEqual({ ok: false, reason: 'error' });
      expect((await mock.getAggregates(query))[0]?.n).toBe(9);
      expect(await mock.submitResponse(input())).toEqual({ ok: true });
    },
  );

  it('keeps skip-all submissions from contributing a scored vote', async () => {
    const mock = source();
    expect(await mock.submitResponse(input({ answers: [] }))).toEqual({ ok: true });
    expect((await mock.getAggregates(query))[0]).toMatchObject({ n: 9, score: null });
  });

  it('operates in memory when storage is unavailable and ignores corrupt entries', async () => {
    localStorage.setItem(`${MOCK_STORAGE_PREFIX}response:broken`, 'not json');
    localStorage.setItem(`${MOCK_STORAGE_PREFIX}response:invalid`, '{}');
    const mock = source();
    expect((await mock.getAggregates(query))[0]?.n).toBe(9);
    const memory = source(fixture(), { storage: null });
    expect(await memory.submitResponse(input())).toEqual({ ok: true });
    expect(await memory.submitResponse(input())).toEqual({ ok: false, reason: 'already_submitted' });
    expect((await memory.getAggregates(query))[0]?.n).toBe(10);
  });

  it('isolates caller mutations and normalizes join-code input', async () => {
    const mock = source();
    const schools = await mock.getSchools();
    schools[0]!.name = 'Changed';
    expect((await mock.getSchoolByCode(' demo42 '))?.name).toBe('Demo-Schule');
    expect(await mock.getSchoolByCode('missing')).toBeNull();
  });

  it('returns a chronological trend with K_MIN on each wave', async () => {
    const mock = source(fixture(10));
    expect(await mock.getTrend({ ...query, waveIds: ['2026-W43', '2026-W42'] })).toEqual([
      { id: '900000', waveId: '2026-W42', n: 0, score: null },
      { id: '900000', waveId: '2026-W43', n: 10, score: 50 },
    ]);
  });

  it('suppresses small choice counts and cells below K_MIN', async () => {
    const data = fixture(10);
    data.answers.push(
      ...data.responses.map((response, index) => ({
        responseId: response.id,
        questionId: 'ai.deep',
        choice: [index < 8 ? 'explain' : 'none'],
      })),
    );
    const mock = source(data);
    const distribution = await mock.getChoiceDistribution('ai.deep', { level: 'nrw', id: null });
    expect(distribution?.n).toBe(10);
    expect(distribution?.options.find((option) => option.value === 'none')?.count).toBeNull();
    expect(distribution?.options.find((option) => option.value === 'explain')?.count).toBe(8);
    expect(await source(fixture(9)).getChoiceDistribution('ai.deep', { level: 'nrw', id: null })).toBeNull();
  });

  it('publishes and rates policy answers with one mutable rating per device', async () => {
    const mock = source();
    const answer = await mock.publishPolicyAnswer({
      topic: 'ai',
      scope: 'nrw',
      regionId: null,
      title: 'Wir hören zu',
      body: 'Eine Demo-Antwort.',
      authorRole: 'ministerium',
    });
    const token = vi.spyOn(device, 'getDeviceToken');
    for (let i = 0; i < 10; i++) {
      token.mockReturnValue(`device-${i}`);
      await mock.ratePolicyAnswer(answer.id, 5);
    }
    expect((await mock.getPolicyAnswers({}))[0]?.resonance).toEqual({ n: 10, score: 100 });
    token.mockReturnValue('device-0');
    await mock.ratePolicyAnswer(answer.id, 1);
    expect((await mock.getPolicyAnswers({}))[0]?.resonance).toEqual({ n: 10, score: 90 });
    expect(await mock.ratePolicyAnswer('unknown', 3)).toEqual({ ok: false });
    // @ts-expect-error exercise validation against callers outside TypeScript
    expect(await mock.ratePolicyAnswer(answer.id, 6)).toEqual({ ok: false });
  });

  it('reports a tension index only from sufficiently populated topics', async () => {
    const data = fixture(10);
    data.answers = data.responses.flatMap((response) => [
      { responseId: response.id, questionId: 'voice.core', value: 1 },
      { responseId: response.id, questionId: 'safety.core', value: 3 },
      { responseId: response.id, questionId: 'community.core', value: 5 },
    ]);
    expect((await source(data).getTensionIndex(query))[0]).toMatchObject({
      index: 61.5,
      level: 'talk',
      drivers: ['voice', 'safety'],
      trend: null,
    });
    data.responses.pop();
    expect((await source(data).getTensionIndex(query))[0]?.index).toBeNull();
  });
});

describe('mock live channel', () => {
  it('notifies local and other-tab subscribers and respects unsubscribe', async () => {
    const peers = new Set<EventTarget>();
    class TestChannel extends EventTarget {
      constructor() {
        super();
        peers.add(this);
      }
      postMessage(data: unknown) {
        for (const peer of peers)
          if (peer !== this) peer.dispatchEvent(new MessageEvent('message', { data }));
      }
      close() {
        peers.delete(this);
      }
    }
    const first = source(fixture(), { channel: new TestChannel() as unknown as BroadcastChannel });
    const second = source(fixture(), { channel: new TestChannel() as unknown as BroadcastChannel });
    const local = vi.fn();
    const remote = vi.fn();
    first.subscribeToNewResponses(local);
    const unsubscribe = second.subscribeToNewResponses(remote);
    await first.submitResponse(input());
    expect(local).toHaveBeenCalledExactlyOnceWith({ schoolId: '900000' });
    expect(remote).toHaveBeenCalledExactlyOnceWith({ schoolId: '900000' });
    expect((await second.getAggregates(query))[0]?.n).toBe(10);
    unsubscribe();
    await first.submitResponse(input({ deviceToken: 'another-device' }));
    expect(remote).toHaveBeenCalledTimes(1);
  });
});

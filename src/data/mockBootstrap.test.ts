/// <reference types="node" />
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import type { School } from '@/types';
import { createDefaultMockSource } from './mockBootstrap';

const schools = JSON.parse(
  readFileSync(new URL('../../public/data/schools.json', import.meta.url), 'utf8'),
) as School[];

it('boots the real seed lazily and shares saved votes across all aggregate levels', async () => {
  vi.stubGlobal('crypto', webcrypto);
  const fetchSchools = vi.fn(async () => ({ ok: true, json: async () => structuredClone(schools) }));
  vi.stubGlobal('fetch', fetchSchools);
  const source = createDefaultMockSource({
    now: () => new Date('2026-10-21T12:00:00Z'),
    storage: null,
    channel: null,
  });
  try {
    expect(fetchSchools).not.toHaveBeenCalled();
    expect((await source.getSchoolByCode('DEMO42'))?.id).toBe('900000');
    expect((await source.getSchoolByCode('PITCH'))?.isTest).toBe(true);
    expect(await source.getPitchAggregate()).toMatchObject({ n: 0, scoredN: 0, score: null });
    expect((await source.getCurrentWave()).id).toBe('2026-W43');
    const before = (await source.getAggregates({ level: 'school', topic: 'ai', parentId: '05111' })).find(
      (row) => row.id === '900000',
    )!;
    expect(before.n).toBeGreaterThanOrEqual(10);
    const districts = await source.getAggregates({ level: 'kreis', topic: 'ai' });
    expect(districts).toHaveLength(53);
    expect(districts.every((row) => (row.n < 10 ? row.score === null : row.score !== null))).toBe(true);
    expect(
      await source.submitResponse({
        schoolId: '900000',
        waveId: '2026-W43',
        role: 'student',
        deviceToken: 'integration-test',
        answers: [{ questionId: 'ai.core', value: 5 }],
      }),
    ).toEqual({ ok: true });
    const after = (await source.getAggregates({ level: 'school', topic: 'ai', parentId: '05111' })).find(
      (row) => row.id === '900000',
    )!;
    const nextDistrict = (await source.getAggregates({ level: 'kreis', topic: 'ai' })).find(
      (row) => row.id === '05111',
    )!;
    expect(after.n).toBe(before.n + 1);
    expect(nextDistrict.n).toBe(districts.find((row) => row.id === '05111')!.n + 1);
    const radar = await source.getTensionIndex({ level: 'kreis', topic: 'all' });
    expect(radar.find((row) => row.id === '05562')?.level).toBe('talk');
    expect((await source.getPolicyAnswers({ topics: ['ai'] })).every((answer) => answer.topic === 'ai')).toBe(
      true,
    );
    expect(fetchSchools).toHaveBeenCalledExactlyOnceWith('/data/schools.json');
  } finally {
    source.dispose();
    vi.unstubAllGlobals();
  }
});

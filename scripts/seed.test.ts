// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { School } from '../src/types/domain.ts';
import { QUESTIONS_BY_ID } from '../src/data/topics.ts';
import {
  DEFAULT_SEED,
  DEFAULT_WAVE_COUNT,
  HOTSPOT_CANCELLATION_KREIS,
  HOTSPOT_TENSION_KREIS,
  generateSeedData,
  generateWaves,
  isoWeekId,
} from '../src/data/seed/generateSeed.ts';

const path = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));
const schools = JSON.parse(readFileSync(path('public/data/schools.json'), 'utf8')) as School[];

describe('seed generator (#8)', () => {
  it('generates only unique, catalog-valid answers ready for submit_response', () => {
    const data = generateSeedData(schools);
    const errors = new Set<string>();
    for (const response of data.responses) {
      if (new Set(response.answers.map((a) => a.questionId)).size !== response.answers.length) {
        errors.add('duplicate question');
      }
      for (const answer of response.answers) {
        const q = QUESTIONS_BY_ID[answer.questionId];
        if (!q) {
          errors.add(`unknown question: ${answer.questionId}`);
          continue;
        }
        if (q.audience && q.audience !== response.role) errors.add(`wrong audience: ${q.id}`);
        if (q.type === 'choice') {
          if (
            !answer.choice?.length ||
            (!q.multiple && answer.choice.length !== 1) ||
            answer.value !== undefined ||
            answer.choice.some((value) => !q.options?.some((o) => o.value === value))
          )
            errors.add(`invalid choice: ${q.id}`);
        } else if (
          !Number.isInteger(answer.value) ||
          answer.choice !== undefined ||
          !(q.type === 'swipe' ? [0, 1].includes(answer.value!) : answer.value! >= 1 && answer.value! <= 5)
        )
          errors.add(`invalid value: ${q.id}`);
      }
    }
    expect([...errors]).toEqual([]);
  });

  it('generates deterministic waves ending at 2026-W43', () => {
    const waves = generateWaves(10);
    expect(waves).toHaveLength(10);
    expect(waves[0]!.id).toBe('2026-W34');
    expect(waves[9]!.id).toBe('2026-W43');
    expect(waves[9]!.startsAt).toBe('2026-10-19T00:00:00.000Z'); // ISO-Woche 43: Mo 19.10.
    expect(waves[9]!.endsAt).toBe('2026-10-25T23:59:59.000Z');
    expect(waves[0]!.startsAt).toBe('2026-08-17T00:00:00.000Z'); // ISO-Woche 34: Mo 17.08.
  });

  it('can end at the current ISO week and crosses the year boundary', () => {
    const current = generateWaves(2, '2026-W44');
    expect(current.map((wave) => wave.id)).toEqual(['2026-W43', '2026-W44']);
    expect(current[1]!.startsAt).toBe('2026-10-26T00:00:00.000Z');
    expect(current[1]!.endsAt).toBe('2026-11-01T23:59:59.000Z');

    const boundary = generateWaves(2, '2027-W01');
    expect(boundary.map((wave) => wave.id)).toEqual(['2026-W53', '2027-W01']);
    expect(boundary[1]!.startsAt).toBe('2027-01-04T00:00:00.000Z');
  });

  it('maps calendar dates to ISO weeks', () => {
    expect(isoWeekId(new Date('2026-10-27T12:00:00Z'))).toBe('2026-W44');
    expect(isoWeekId(new Date('2026-12-31T12:00:00Z'))).toBe('2026-W53');
    expect(isoWeekId(new Date('2027-01-04T12:00:00Z'))).toBe('2027-W01');
  });

  it('dates every response inside its own wave (day precision)', () => {
    const data = generateSeedData(schools.slice(0, 20), { seed: 7, waveCount: 3 });
    const byId = new Map(data.waves.map((w) => [w.id, w]));
    for (const r of data.responses) {
      const wave = byId.get(r.waveId)!;
      expect(r.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.submittedAt >= wave.startsAt.slice(0, 10)).toBe(true);
      expect(r.submittedAt <= wave.endsAt.slice(0, 10)).toBe(true);
    }
  });

  it('is byte-identical when called with the same seed', () => {
    const data1 = generateSeedData(schools.slice(0, 10), { seed: 12345, waveCount: 2 });
    const data2 = generateSeedData(schools.slice(0, 10), { seed: 12345, waveCount: 2 });
    expect(JSON.stringify(data1)).toBe(JSON.stringify(data2));
  });

  it('produces valid responses with unique IDs and proper types', () => {
    const sampleSchools = schools.slice(0, 20);
    const data = generateSeedData(sampleSchools, { seed: DEFAULT_SEED, waveCount: 3 });

    expect(data.responses.length).toBeGreaterThan(100);
    const idSet = new Set<string>();
    for (const resp of data.responses) {
      expect(idSet.has(resp.id)).toBe(false);
      idSet.add(resp.id);
      expect(resp.schoolId).toBeTruthy();
      expect(resp.waveId).toMatch(/^2026-W\d\d$/);
      expect(resp.role).toBe('student');
      expect(resp.answers.length).toBeGreaterThanOrEqual(5);

      for (const ans of resp.answers) {
        if ('value' in ans) {
          expect(typeof ans.value).toBe('number');
        } else {
          expect(Array.isArray(ans.choice)).toBe(true);
        }
      }
    }
  });

  it('gives every school enough data in every wave', () => {
    const data = generateSeedData(schools, { seed: DEFAULT_SEED, waveCount: 2 });
    const countsBySchoolWave = new Map<string, number>();

    for (const resp of data.responses) {
      const key = `${resp.waveId}_${resp.schoolId}`;
      countsBySchoolWave.set(key, (countsBySchoolWave.get(key) ?? 0) + 1);
    }

    const counts = [...countsBySchoolWave.values()];
    expect(counts).toHaveLength(schools.length * 2);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(10);

    const current = data.responses.filter((resp) => resp.waveId === '2026-W43');
    const currentBySchool = new Map<string, number>();
    for (const resp of current) {
      currentBySchool.set(resp.schoolId, (currentBySchool.get(resp.schoolId) ?? 0) + 1);
    }
    expect(currentBySchool.size).toBe(schools.length);
    expect(Math.min(...currentBySchool.values())).toBeGreaterThanOrEqual(24);
  });

  it('always includes demo school 900000 with high participation', () => {
    const data = generateSeedData(schools, { seed: DEFAULT_SEED, waveCount: DEFAULT_WAVE_COUNT });
    const demoResponses = data.responses.filter((r) => r.schoolId === '900000');
    expect(demoResponses.length).toBeGreaterThan(200);
  });

  it('embodies the pitch story patterns: AI & Voice low, Cancellation & Tension hotspots', () => {
    const data = generateSeedData(schools, { seed: DEFAULT_SEED, waveCount: DEFAULT_WAVE_COUNT });

    // AI core answers
    const aiScores = data.responses
      .flatMap((r) => r.answers)
      .filter((a) => a.questionId === 'ai.core' && typeof a.value === 'number')
      .map((a) => (a.value! - 1) * 25);
    const aiMean = aiScores.reduce((s, v) => s + v, 0) / aiScores.length;
    expect(aiMean).toBeLessThan(50); // statewide AI frustration

    // Voice core answers
    const voiceScores = data.responses
      .flatMap((r) => r.answers)
      .filter((a) => a.questionId === 'voice.core' && typeof a.value === 'number')
      .map((a) => (a.value! - 1) * 25);
    const voiceMean = voiceScores.reduce((s, v) => s + v, 0) / voiceScores.length;
    expect(voiceMean).toBeLessThan(45); // chronically low voice

    // Policy answers
    expect(data.policyAnswers.length).toBeGreaterThanOrEqual(4);
    expect(data.policyAnswers.some((p) => p.regionId === HOTSPOT_TENSION_KREIS)).toBe(true);
    expect(data.policyAnswers.some((p) => p.regionId === HOTSPOT_CANCELLATION_KREIS)).toBe(true);
  });
});

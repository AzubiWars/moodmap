// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { School } from '../src/types/domain.ts';
import {
  DEFAULT_SEED,
  DEFAULT_WAVE_COUNT,
  HOTSPOT_CANCELLATION_KREIS,
  HOTSPOT_TENSION_KREIS,
  generateSeedData,
  generateWaves,
} from '../src/data/seed/generateSeed.ts';

const path = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));
const schools = JSON.parse(readFileSync(path('public/data/schools.json'), 'utf8')) as School[];

describe('seed generator (#8)', () => {
  it('generates deterministic waves ending at 2026-W43', () => {
    const waves = generateWaves(10);
    expect(waves).toHaveLength(10);
    expect(waves[0]!.id).toBe('2026-W34');
    expect(waves[9]!.id).toBe('2026-W43');
    expect(waves[9]!.startsAt).toBe('2026-10-19T00:00:00.000Z'); // ISO-Woche 43: Mo 19.10.
    expect(waves[9]!.endsAt).toBe('2026-10-25T23:59:59.000Z');
    expect(waves[0]!.startsAt).toBe('2026-08-17T00:00:00.000Z'); // ISO-Woche 34: Mo 17.08.
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

  it('includes both schools >= K_MIN and schools < K_MIN for demo purposes', () => {
    const data = generateSeedData(schools, { seed: DEFAULT_SEED, waveCount: 2 });
    const countsBySchoolWave = new Map<string, number>();

    for (const resp of data.responses) {
      const key = `${resp.waveId}_${resp.schoolId}`;
      countsBySchoolWave.set(key, (countsBySchoolWave.get(key) ?? 0) + 1);
    }

    const counts = [...countsBySchoolWave.values()];
    const belowKMin = counts.filter((c) => c < 10);
    const atOrAboveKMin = counts.filter((c) => c >= 10);

    expect(belowKMin.length).toBeGreaterThan(0);
    expect(atOrAboveKMin.length).toBeGreaterThan(0);
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

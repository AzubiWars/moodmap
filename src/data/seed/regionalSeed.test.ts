/// <reference types="node" />
// @vitest-environment node
import { readFileSync } from 'node:fs';
import type { School } from '@/types';
import { createMockSource } from '../mockSource';
import { adaptSeed } from '../mockBootstrap';
import { generateSeedData, HOTSPOT_CANCELLATION_KREIS, HOTSPOT_TENSION_KREIS } from './generateSeed';
import { scoreToLevel } from '@/lib/colors';

const schools = JSON.parse(
  readFileSync(new URL('../../../public/data/schools.json', import.meta.url), 'utf8'),
) as School[];
const source = createMockSource({
  loadData: async () => adaptSeed(schools, generateSeedData(schools)),
  now: () => new Date('2026-10-21T12:00:00Z'),
  storage: null,
  channel: null,
});

afterAll(() => source.dispose());

it('shows at least three mood levels across districts and schools without exposing small cells', async () => {
  for (const level of ['kreis', 'school'] as const) {
    const rows = await source.getAggregates({ level, topic: 'all' });
    const scores = rows.flatMap((row) => (row.score === null ? [] : [row.score]));
    const levels = new Set(scores.map((score) => scoreToLevel(score)!.level));
    expect(levels.size).toBeGreaterThanOrEqual(3);
    expect(Math.max(...scores) - Math.min(...scores)).toBeGreaterThanOrEqual(30);
    expect(rows.every((row) => (row.n < 10 ? row.score === null : row.score !== null))).toBe(true);
    if (level === 'school') expect(rows.some((row) => row.n > 0 && row.n < 10)).toBe(true);
  }
});

it('preserves low hotspot themes and the dialogue radar story', async () => {
  const cancellation = (await source.getAggregates({ level: 'kreis', topic: 'cancellation' })).find(
    (row) => row.id === HOTSPOT_CANCELLATION_KREIS,
  )!;
  expect(cancellation.score).not.toBeNull();
  expect(cancellation.delta).not.toBeNull();
  expect(cancellation.score).toBeLessThan(35);
  expect(cancellation.delta).toBeLessThanOrEqual(-10);
  for (const topic of ['voice', 'safety', 'community']) {
    const row = (await source.getAggregates({ level: 'kreis', topic })).find(
      (entry) => entry.id === HOTSPOT_TENSION_KREIS,
    )!;
    expect(row.score).not.toBeNull();
    expect(row.score).toBeLessThan(40);
  }
  expect(
    (await source.getTensionIndex({ level: 'kreis', topic: 'all' })).find(
      (row) => row.id === HOTSPOT_TENSION_KREIS,
    )?.level,
  ).toBe('talk');
});

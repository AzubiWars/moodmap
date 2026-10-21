/// <reference types="node" />
// @vitest-environment node
import { readFileSync } from 'node:fs';
import type { School } from '@/types';
import { createMockSource } from '@/data/mockSource';
import { adaptSeed } from '@/data/mockBootstrap';
import { generateSeedData } from '@/data/seed/generateSeed';
import { hotspotTopics, sortTopics } from './lagebild';
import { loadComparison, loadLagebild } from './loadLagebild';

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

// Seed-Erzeugung + ~25 Abfragen über den vollen Datensatz brauchen unter Last mehr als 5 s.
describe('Lagebild NRW mit Demo-Seed', { timeout: 30_000 }, () => {
  it('zeigt KPIs und Prozentwerte, die sich je Thema auf 100 % summieren', async () => {
    const lagebild = await loadLagebild(source, 10);
    expect(lagebild.overall.n).toBeGreaterThan(100);
    expect(lagebild.overall.score).not.toBeNull();
    expect(lagebild.schools).toBeGreaterThan(10);
    for (const topic of lagebild.topics.filter((t) => t.sentiment)) {
      const s = topic.sentiment!;
      expect(s.negative + s.neutral + s.positive).toBe(100);
      expect(Object.values(s.levels).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });

  it('macht die Seed-Story sichtbar: KI und Gehört werden brennen am meisten', async () => {
    const { topics } = await loadLagebild(source, 10);
    const byNegative = sortTopics(topics, 'negative').map((t) => t.slug);
    expect(byNegative.slice(0, 3)).toEqual(expect.arrayContaining(['ai', 'voice']));
    expect(
      hotspotTopics(topics, 3)
        .map((t) => t.slug)
        .slice(0, 2),
    ).toEqual(expect.arrayContaining(['ai', 'voice']));
  });

  it('vergleicht Schulformen und Regierungsbezirke: Stress ist an Gymnasien am höchsten', async () => {
    const { schoolForms, regbez } = await loadComparison(source, 'stress', 10);
    expect(regbez.map((r) => r.id)).toEqual(['051', '053', '055', '057', '059']);
    expect(regbez.every((r) => r.sentiment)).toBe(true);
    const gym = schoolForms.find((f) => f.id === 'gymnasium')!;
    const others = schoolForms.filter((f) => f.id !== 'gymnasium' && f.sentiment);
    expect(others.length).toBeGreaterThan(1);
    for (const form of others) expect(gym.sentiment!.negative).toBeGreaterThan(form.sentiment!.negative);
  });
});

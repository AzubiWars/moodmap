import type { FactsFile } from '@/types/facts';
import { areaFacts, schoolFacts } from './facts';

const FACTS: FactsFile = {
  untstat: {
    year: '2024/25',
    stand: '05.12.2025',
    areas: { nrw: { nrw: [1000, 45, 800, 10] }, kreis: { '05111': [200, 12, 150, 2] } },
    schools: { '100015': { sek1: [300, 15, 250], sek2: [100, 5, 80] } },
    stateByForm: { 'gymnasium:sek1': [1000, 54, 800] },
  },
  sozialindex: { year: '2025/26', areas: { kreis: { '05111': [9, 2] } } },
};

describe('areaFacts', () => {
  it('turns summed hours into shares and averages the Sozialindex', () => {
    expect(areaFacts(FACTS, { level: 'kreis', id: '05111' })).toEqual({
      ausfall: 6,
      regular: 75,
      untstatSchools: 2,
      sozial: 4.5,
      sozialSchools: 2,
    });
  });

  it('returns nulls for areas without data instead of guessing', () => {
    expect(areaFacts(FACTS, { level: 'gemeinde', id: '05111000' })).toMatchObject({
      ausfall: null,
      sozial: null,
    });
  });
});

describe('schoolFacts', () => {
  it('reports each stage with the statewide value of the same school form', () => {
    const facts = schoolFacts(FACTS, '100015', 'gymnasium');
    expect(facts.total).toBe(5);
    expect(facts.stages).toEqual([
      { stage: 'sek1', ausfall: 5, state: 5.4 },
      { stage: 'sek2', ausfall: 5, state: null },
    ]);
  });
});

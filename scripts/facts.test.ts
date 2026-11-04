// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { DirectorySchool } from '../src/types/domain.ts';
import { buildFacts, parseSozialindexCsv, type UntstatRecord } from './lib/facts.ts';

const school = (id: string, kreisId: string, gemeindeId: string, schoolForm = 'gymnasium') =>
  ({ id, kreisId, gemeindeId, schoolForm, name: id, city: '', lat: 0, lon: 0 }) as DirectorySchool;

const hours = (planned: number, cancelled: number, regular = planned - cancelled) => ({
  planned,
  cancelled,
  regular,
});

const SCHOOLS = [
  school('100001', '05111', '05111000'),
  school('100002', '05158', '05158004'),
  school('100003', '05158', '05158008', 'grundschule'),
];

const UNTSTAT: UntstatRecord[] = [
  { id: '100001', stage: 'sek1', school: hours(1000, 50), stateSameForm: hours(100_000, 5000) },
  { id: '100001', stage: 'sek2', school: hours(500, 10), stateSameForm: hours(40_000, 1000) },
  { id: '100002', stage: 'sek1', school: hours(2000, 40), stateSameForm: hours(100_000, 5000) },
  { id: '100003', stage: 'primar', school: hours(800, 8), stateSameForm: hours(300_000, 9000) },
  // Schule, die nicht im Verzeichnis steht, zählt nirgends mit
  { id: '999999', stage: 'sek1', school: hours(5000, 5000), stateSameForm: hours(1, 1) },
];

const META = { untstatYear: '2024/25', untstatStand: '05.12.2025', sozialindexYear: '2025/26' };

describe('buildFacts', () => {
  it('sums hours exactly per area and counts each school once across stages', () => {
    const facts = buildFacts(SCHOOLS, UNTSTAT, [], META);
    expect(facts.untstat.areas.nrw!.nrw).toEqual([4300, 108, 4192, 3]);
    expect(facts.untstat.areas.regbez!['051']).toEqual([4300, 108, 4192, 3]);
    expect(facts.untstat.areas.kreis!['05111']).toEqual([1500, 60, 1440, 1]);
    expect(facts.untstat.areas.kreis!['05158']).toEqual([2800, 48, 2752, 2]);
    expect(facts.untstat.areas.gemeinde!['05158008']).toEqual([800, 8, 792, 1]);
  });

  it('keeps per-school stages and the statewide value of the same school form', () => {
    const facts = buildFacts(SCHOOLS, UNTSTAT, [], META);
    expect(facts.untstat.schools['100001']).toEqual({ sek1: [1000, 50, 950], sek2: [500, 10, 490] });
    expect(facts.untstat.schools['999999']).toBeUndefined();
    expect(facts.untstat.stateByForm['grundschule:primar']).toEqual([300_000, 9000, 291_000]);
  });

  it('averages the Sozialindex only over schools with a level', () => {
    const sozial = parseSozialindexCsv(
      'Schulnummer;Kurzbezeichnung;Sozialindexstufe\n100001;A;2\n100002;B;6\n100003;C;ohne\n',
    );
    const facts = buildFacts(SCHOOLS, [], sozial, META);
    expect(facts.sozialindex.areas.kreis!['05158']).toEqual([6, 1]);
    expect(facts.sozialindex.areas.nrw!.nrw).toEqual([8, 2]);
  });
});

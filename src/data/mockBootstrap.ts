import type { School, SeedData } from '@/types';
import type { MockDataset } from './mockRecords';
import { createMockSource, type MockSourceOptions } from './mockSource';

/** Seed-Adapter: die synthetischen Geräte-Tokens werden nicht in den Store übernommen. */
export function adaptSeed(schools: School[], seed: SeedData): MockDataset {
  return {
    schools,
    // Der Seed beschreibt das Ende als So 23:59:59; die API nutzt ein exklusives Ende.
    waves: seed.waves.map((wave) => ({
      ...wave,
      endsAt: wave.endsAt.endsWith('23:59:59.000Z')
        ? new Date(Date.parse(wave.endsAt) + 1000).toISOString()
        : wave.endsAt,
    })),
    responses: seed.responses.map((response) => ({
      id: response.id,
      schoolId: response.schoolId,
      waveId: response.waveId,
      role: response.role,
      ...(response.gradeBand ? { gradeBand: response.gradeBand } : {}),
      createdAt: response.submittedAt,
    })),
    answers: seed.responses.flatMap((response) =>
      response.answers.map((answer) => ({ ...answer, responseId: response.id })),
    ),
    policyAnswers: seed.policyAnswers,
  };
}

/** Synthetischer Pitch-Standort (#113/#116), im Mock nur für den Test-Code erreichbar. */
const PITCH_SCHOOL: School = {
  id: 'pitch-test',
  name: 'Pitch-Test (Demo)',
  schoolForm: 'gesamtschule',
  kreisId: 'TEST-PITCH',
  city: 'Teststandort',
  lat: 52.52,
  lon: 13.405,
  studentCount: null,
  joinCode: 'PITCH',
  isTest: true,
};

async function loadData(): Promise<MockDataset> {
  const response = await fetch('/data/schools.json');
  if (!response.ok) throw new Error(`Demo-Schulen konnten nicht geladen werden (${response.status}).`);
  const schools = (await response.json()) as School[];
  const { generateSeedData } = await import('./seed/generateSeed');
  // Der Pitch-Standort bekommt keine Seed-Antworten; er füllt sich nur durch echte Test-Abgaben.
  const withPitch = schools.some((school) => school.id === PITCH_SCHOOL.id)
    ? schools
    : [...schools, PITCH_SCHOOL];
  return adaptSeed(withPitch, generateSeedData(schools));
}

// createMockSource memoiziert erst beim ersten Datenzugriff. Keine Netzwerk-Anfrage beim Import.
export function createDefaultMockSource(options: Omit<MockSourceOptions, 'loadData'> = {}) {
  return createMockSource({ ...options, loadData });
}

export const mockSource = createDefaultMockSource();

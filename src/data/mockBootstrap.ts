import type { School, SeedData } from '@/types';
import type { MockDataset } from './mockRecords';
import { DEFAULT_MOCK_SOURCES } from './mockSources';
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

/** Zweite synthetische Demo-Quelle für den Umschalter (#272). */
export const DEMO_IMPORT_SOURCE = 'demo-import';

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

async function loadData(now: () => Date = () => new Date()): Promise<MockDataset> {
  const response = await fetch('/data/schools.json');
  if (!response.ok) throw new Error(`Demo-Schulen konnten nicht geladen werden (${response.status}).`);
  const schools = (await response.json()) as School[];
  const { generateSeedData, isoWeekId } = await import('./seed/generateSeed');
  // Der Pitch-Standort bekommt keine Seed-Antworten; er füllt sich nur durch echte Test-Abgaben.
  const withPitch = schools.some((school) => school.id === PITCH_SCHOOL.id)
    ? schools
    : [...schools, PITCH_SCHOOL];
  // The demo must always have an active wave; a fixed seed end would break the mock every Monday.
  const base = adaptSeed(withPitch, generateSeedData(schools, { lastWaveId: isoWeekId(now()) }));
  // Zweite synthetische Quelle (#272): eine abgeschlossene „Import-Befragung“ vor sechs Wochen, damit
  // der Datenquellen-Umschalter auch ohne Backend vorführbar ist. Eigener Seed, eigene IDs.
  const end = new Date(now().getTime() - 6 * 7 * 86_400_000);
  const imported = adaptSeed(
    withPitch,
    generateSeedData(schools, { seed: 2026, waveCount: 3, lastWaveId: isoWeekId(end) }),
  );
  const prefix = (id: string) => `import-${id}`;
  const waveIds = imported.waves.map((wave) => wave.id).sort();
  return {
    ...base,
    responses: [
      ...base.responses,
      ...imported.responses.map((r) => ({ ...r, id: prefix(r.id), sourceId: DEMO_IMPORT_SOURCE })),
    ],
    answers: [...base.answers, ...imported.answers.map((a) => ({ ...a, responseId: prefix(a.responseId) }))],
    sources: [
      ...DEFAULT_MOCK_SOURCES,
      {
        id: DEMO_IMPORT_SOURCE,
        label: 'Demo-Import: Schulbefragung (synthetisch)',
        kind: 'import',
        periodStart: imported.waves.find((w) => w.id === waveIds[0])!.startsAt.slice(0, 10),
        periodEnd: new Date(Date.parse(imported.waves.find((w) => w.id === waveIds.at(-1))!.endsAt) - 1)
          .toISOString()
          .slice(0, 10),
        visibility: 'public',
        isDefault: false,
        aggregatedByProvider: false,
      },
    ],
  };
}

// createMockSource memoiziert erst beim ersten Datenzugriff. Keine Netzwerk-Anfrage beim Import.
export function createDefaultMockSource(options: Omit<MockSourceOptions, 'loadData'> = {}) {
  return createMockSource({ ...options, loadData: () => loadData(options.now) });
}

export const mockSource = createDefaultMockSource();

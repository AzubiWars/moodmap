import type { AnswerInput, DataSourceInfo, GradeBand, PolicyAnswer, Role, School, Wave } from '@/types';

/** Interne Rohdaten des synthetischen Mock-Backends, nie über DataSource ausgeben. */
export interface MockResponse {
  id: string;
  schoolId: string;
  waveId: string;
  role: Role;
  gradeBand?: GradeBand | null;
  createdAt: string;
  /** Echte Abgabe aus dem Mood-Check (nicht Seed) – für die Kennzeichnung Demo vs. Live (#160) */
  live?: boolean;
  /** Datenquelle (ADR-018); fehlt sie, gehört die Teilnahme zur Default-Quelle des Datensatzes. */
  sourceId?: string;
}

/** Registry-Eintrag einer Mock-Quelle; `n` berechnet der Mock selbst. */
export type MockDataSource = Omit<DataSourceInfo, 'n'>;

export type MockAnswer = AnswerInput & { responseId: string };

export interface MockDataset {
  schools: School[];
  waves: Wave[];
  responses: MockResponse[];
  answers: MockAnswer[];
  policyAnswers?: PolicyAnswer[];
  /** Ohne Angabe genau eine öffentliche Default-Quelle `demo-seed` (synthetisch). */
  sources?: MockDataSource[];
}

export interface StoredSubmission {
  response: MockResponse;
  answers: MockAnswer[];
}

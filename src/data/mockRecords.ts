import type { AnswerInput, GradeBand, PolicyAnswer, Role, School, Wave } from '@/types';

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
}

export type MockAnswer = AnswerInput & { responseId: string };

export interface MockDataset {
  schools: School[];
  waves: Wave[];
  responses: MockResponse[];
  answers: MockAnswer[];
  policyAnswers?: PolicyAnswer[];
}

export interface StoredSubmission {
  response: MockResponse;
  answers: MockAnswer[];
}

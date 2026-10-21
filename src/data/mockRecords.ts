import type { AnswerInput, GradeBand, Role, School, Wave } from '@/types';

/** Interne Rohdaten des synthetischen Mock-Backends, nie über DataSource ausgeben. */
export interface MockResponse {
  id: string;
  schoolId: string;
  waveId: string;
  role: Role;
  gradeBand?: GradeBand | null;
  createdAt: string;
}

export type MockAnswer = AnswerInput & { responseId: string };

export interface MockDataset {
  schools: School[];
  waves: Wave[];
  responses: MockResponse[];
  answers: MockAnswer[];
}

export interface StoredSubmission {
  response: MockResponse;
  answers: MockAnswer[];
}

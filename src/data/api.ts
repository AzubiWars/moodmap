import type {
  AggregateQuery,
  AggregateRow,
  Distribution,
  PolicyAnswer,
  PolicyAnswerFilter,
  PolicyAnswerInput,
  ResponseInput,
  School,
  Scope,
  SubmitResult,
  TensionRow,
  Topic,
  TrendPoint,
  TrendQuery,
  Wave,
} from '@/types';

export type DataSourceMode = 'mock' | 'supabase';

export interface NewResponseEvent {
  schoolId: string;
}

/**
 * Der einzige Vertrag zwischen UI und Daten (docs/ARCHITECTURE.md §3).
 * Jede Implementierung (Mock, Supabase) muss dieses Interface vollständig erfüllen.
 *
 * Alle Aggregate sind bereits k-anonymisiert: `score` und Verteilungen sind
 * `null` bzw. leer, sobald `n < K_MIN`.
 */
export interface DataSource {
  // Stammdaten
  getSchools(): Promise<School[]>;
  getSchoolByCode(code: string): Promise<School | null>;
  getTopics(): Promise<Topic[]>;

  // Umfrage
  getCurrentWave(): Promise<Wave>;
  submitResponse(input: ResponseInput): Promise<SubmitResult>;

  // Aggregate (immer bereits k-anonymisiert)
  getAggregates(query: AggregateQuery): Promise<AggregateRow[]>;
  getTrend(query: TrendQuery): Promise<TrendPoint[]>;
  getChoiceDistribution(questionId: string, scope: Scope): Promise<Distribution | null>;

  // Frühwarn-Radar
  getTensionIndex(query: AggregateQuery): Promise<TensionRow[]>;

  // „Politik antwortet"
  getPolicyAnswers(filter: PolicyAnswerFilter): Promise<PolicyAnswer[]>;
  publishPolicyAnswer(input: PolicyAnswerInput): Promise<PolicyAnswer>;
  ratePolicyAnswer(answerId: string, value: 1 | 2 | 3 | 4 | 5): Promise<{ ok: boolean }>;

  // Live
  subscribeToNewResponses(callback: (event: NewResponseEvent) => void): () => void;
}

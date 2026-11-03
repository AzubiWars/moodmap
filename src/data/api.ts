import type {
  AggregateQuery,
  AggregateRow,
  DataSourceInfo,
  LiveCounts,
  DeleteResult,
  Distribution,
  FreetextCluster,
  OwnResponseInput,
  PitchAggregate,
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
  /** Zieht die eigene Abgabe der aktuellen Welle zurück; danach ist eine neue Teilnahme möglich (#161). */
  deleteOwnResponse(input: OwnResponseInput): Promise<DeleteResult>;

  // Datenquellen (ADR-018): nur aktive, für den Aufrufer sichtbare; Default zuerst
  getDataSources(): Promise<DataSourceInfo[]>;

  // Aggregate (immer bereits k-anonymisiert)
  getAggregates(query: AggregateQuery): Promise<AggregateRow[]>;
  getTrend(query: TrendQuery): Promise<TrendPoint[]>;
  getChoiceDistribution(questionId: string, scope: Scope): Promise<Distribution | null>;
  /** Schulen mit mindestens einer gewerteten Teilnahme in der Standardwelle der Quelle (#252). */
  countActiveSchools(query: { sourceId?: string }): Promise<number>;
  /** Schlanker Live-Poll (#253): Zähler je Schule nur, wenn sich seit `knownVersion` etwas geändert hat. */
  getLiveCounts(query: { sourceId?: string; knownVersion?: string }): Promise<LiveCounts>;

  // Frühwarn-Radar
  getTensionIndex(query: AggregateQuery): Promise<TensionRow[]>;

  // Pitch-Beamer (#116)
  getPitchAggregate(): Promise<PitchAggregate>;
  getFreetextClusters(scope: Scope): Promise<FreetextCluster[]>;
  /** Live: PIN-protected Edge Function; mock: only this browser's Pitch round, without real auth. */
  resetPitchTest(pin: string): Promise<{ ok: boolean }>;

  // „Politik antwortet"
  getPolicyAnswers(filter: PolicyAnswerFilter): Promise<PolicyAnswer[]>;
  publishPolicyAnswer(input: PolicyAnswerInput): Promise<PolicyAnswer>;
  ratePolicyAnswer(answerId: string, value: 1 | 2 | 3 | 4 | 5): Promise<{ ok: boolean }>;

  // Live
  subscribeToNewResponses(callback: (event: NewResponseEvent) => void): () => void;
}

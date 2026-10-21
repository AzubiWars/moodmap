import type {
  DataLevel,
  GradeBand,
  Role,
  SchoolForm,
  ScopeLevel,
  TopicSlug,
  WaveId,
} from './domain';

export interface AggregateQuery {
  level: ScopeLevel;
  /** `all` = Gesamt-Mood über alle Themen. */
  topic: TopicSlug | 'all';
  schoolForm?: SchoolForm[];
  gradeBand?: GradeBand[];
  role?: Role;
  waveIds?: WaveId[];
  /** z. B. nur Schulen eines Kreises. */
  parentId?: string;
}

export interface AggregateRow {
  /** RegBez-/Kreis-ID oder Schulnummer. */
  id: string;
  /** Anzahl Antworten. */
  n: number;
  /** 0–100; `null`, wenn `n < K_MIN`. */
  score: number | null;
  /** Δ zur Vorperiode; `null`, wenn nicht berechenbar. */
  delta: number | null;
  topicScores?: Record<TopicSlug, number | null>;
}

export interface TrendQuery extends AggregateQuery {
  /** Für einen Trend sind die betrachteten Wellen Pflicht. */
  waveIds: WaveId[];
}

export interface TrendPoint {
  /** RegBez-/Kreis-ID oder Schulnummer. */
  id: string;
  waveId: WaveId;
  n: number;
  score: number | null;
}

export interface Scope {
  level: DataLevel;
  /** `null` bei `level: 'nrw'`. */
  id: string | null;
}

export interface DistributionOption {
  value: string;
  count: number;
}

export interface Distribution {
  questionId: string;
  n: number;
  options: DistributionOption[];
}

import type { DataLevel, GradeBand, Role, School, SchoolForm, TopicSlug, WaveId } from './domain';

export interface AggregateQuery {
  /** `nrw` liefert genau eine Zeile `{ id: 'nrw' }`, direkt über alle Antworten aggregiert (Lead-Entscheidung #19/#140). */
  level: DataLevel;
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
  /** Anzahl unterschiedlicher Teilnahmen mit gewerteten Antworten in dieser Zelle. */
  n: number;
  /** 0–100; `null`, wenn `n < K_MIN`. */
  score: number | null;
  /** Δ zur Vorperiode; `null`, wenn nicht berechenbar. */
  delta: number | null;
  topicScores?: Record<TopicSlug, number | null>;
  /**
   * Anzahl gewerteter mood5-Antworten je Stimmungsstufe (1 = sehr schlecht … 5 = sehr gut) für das
   * angefragte Thema; „Weiß nicht" zählt nicht. Bei `invert`-Fragen ist die Stufe bereits gedreht.
   * `null`, wenn `n < K_MIN`; nicht gesetzt bei `topic: 'all'`.
   */
  distribution?: MoodDistribution | null;
  /**
   * Davon echte Abgaben (nicht Demo-Seed) für die Kennzeichnung „Live-Stimmen“ (#160).
   * Fehlt unter K_MIN – sonst verriete eine kleine Zahl, dass gerade jemand abgestimmt hat.
   */
  liveN?: number | null;
}

/** Zählwerte je Stimmungsstufe 1–5. */
export type MoodDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

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
  /** `null` bedeutet unterdrückt (< 3); die genaue kleine Anzahl wird nicht ausgeliefert. */
  count: number | null;
}

export interface Distribution {
  questionId: string;
  n: number;
  options: DistributionOption[];
}

/** Öffentliche Pitch-Auswertung für die Beamer-Ansicht (#116); nie Teil der NRW-Aggregate. */
export interface PitchAggregate {
  school: Pick<School, 'id' | 'name' | 'city' | 'lat' | 'lon' | 'isTest'>;
  waveId: WaveId;
  /** Teilnahmen insgesamt (auch ohne gewertete Antworten). */
  n: number;
  /** Teilnahmen mit mindestens einer gewerteten Antwort; K_MIN gilt hierfür. */
  scoredN: number;
  score: number | null;
  topicScores: Record<TopicSlug, number | null>;
}

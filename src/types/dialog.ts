import type {
  PolicyAnswerStatus,
  PolicyAuthorRole,
  PolicyScope,
  TensionLevel,
  TopicSlug,
} from './domain';

/** Frühwarn-Radar: 0–100, hoch = mehr Spannung. */
export interface TensionRow {
  /** RegBez-/Kreis-ID oder Schulnummer. */
  id: string;
  /** `null`, wenn zu wenige Daten (K_MIN). */
  index: number | null;
  level: TensionLevel | null;
  /** Δ Index zur Vorperiode. */
  trend: number | null;
  /** Themen-Slugs, die am stärksten beitragen (max. 2). */
  drivers: TopicSlug[];
}

export interface PolicyAnswer {
  id: string;
  topic: TopicSlug;
  scope: PolicyScope;
  /** `null` bei `scope: 'nrw'`. */
  regionId: string | null;
  title: string;
  /** Max. ca. 400 Zeichen (Produkt-Spec §3.9). */
  body: string;
  status: PolicyAnswerStatus;
  /** ISO-8601. */
  publishedAt: string;
  /** Bewertung „Hilft dir das?" – erst ab K_MIN ausgewertet. */
  resonance: {
    n: number;
    score: number | null;
  };
  /** Wirkung: Themen-Score nach Veröffentlichung minus Welle davor. */
  topicDeltaSincePublished: number | null;
}

export interface PolicyAnswerInput {
  topic: TopicSlug;
  scope: PolicyScope;
  regionId: string | null;
  title: string;
  body: string;
  /** Default beim Veröffentlichen: `listening`. */
  status?: PolicyAnswerStatus;
  authorRole: PolicyAuthorRole;
}

export interface PolicyAnswerFilter {
  regionIds?: string[];
  topics?: TopicSlug[];
}

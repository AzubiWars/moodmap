import type { SchoolId, TopicSlug, WaveId } from './domain';

/** Optionaler Freitext aus dem Mood-Check (`PRODUCT_SPEC` §3.13). */
export interface FreetextInput {
  schoolId: SchoolId;
  waveId: WaveId;
  /** Anonymes Token aus localStorage; wird wie bei `submit_response` gehasht. */
  deviceToken: string;
  text: string;
}

/** Öffentliche Cluster-Auswertung aus `get_freetext_clusters` (ab K_MIN). */
export interface FreetextCluster {
  cluster: string;
  count: number;
  topics: TopicSlug[];
  /** 2–3 bereinigte Beispielzitate; keine Rohtexte. */
  examples: string[];
}

/** Antwort der Edge Function `submit-freetext`. */
export interface FreetextSubmitResult {
  ok: boolean;
  stored?: boolean;
  reason?: string;
  concern?: boolean;
  cluster?: string;
  topics?: TopicSlug[];
}

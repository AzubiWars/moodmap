import type { PolicyAnswer } from './dialog';
import type { Wave } from './domain';
import type { ResponseInput } from './survey';

/** Eine synthetische Teilnahme aus dem Seed-Generator (#8). */
export interface SeedResponse extends ResponseInput {
  /** Stabile ID der Teilnahme; dient der Score-Logik als `responseId`. */
  id: string;
  /** Tag (ISO-8601, auf Tag gerundet), an dem die Antwort eingegeben wurde. */
  submittedAt: string;
}

export interface SeedData {
  /** Fester Seed, mit dem die Daten reproduziert werden können. */
  seed: number;
  /** ID der letzten Welle, z. B. `2026-W43`. */
  generatedFor: string;
  waves: Wave[];
  responses: SeedResponse[];
  policyAnswers: PolicyAnswer[];
}

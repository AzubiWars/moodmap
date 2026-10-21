import type { GradeBand, Role, SchoolId, WaveId } from './domain';

/**
 * Eine einzelne Antwort. `mood5` nutzt `value` (1–5), `choice` nutzt `choice`.
 * Übersprungene Fragen („Weiß nicht") werden gar nicht erst übermittelt.
 */
export type AnswerInput =
  | { questionId: string; value: number; choice?: never }
  | { questionId: string; choice: string[]; value?: never };

export interface ResponseInput {
  schoolId: SchoolId;
  waveId: WaveId;
  role: Role;
  gradeBand?: GradeBand;
  /**
   * Anonymes Zufallstoken aus localStorage. Wird serverseitig mit der Welle
   * gehasht und nur für den Doppelteilnahme-Schutz verwendet (docs/PRIVACY.md §3).
   */
  deviceToken: string;
  answers: AnswerInput[];
}

export type SubmitResult = { ok: true } | { ok: false; reason: 'already_submitted' | 'error' };

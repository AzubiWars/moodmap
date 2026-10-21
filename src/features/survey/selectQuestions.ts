import { MANDATORY_TOPIC_SLUGS, P0_TOPIC_SLUGS, getCoreQuestion } from '@/data/topics';
import type { Question } from '@/types';

/** Anzahl der Kernfragen pro Durchlauf (8–10 laut Issue, damit < 60 s möglich bleiben). */
export const CORE_QUESTION_COUNT = 9;

/** FNV-1a, genügt als Seed – das Token verlässt die Funktion nicht. */
function hashString(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy;
}

const isQuestion = (q: Question | undefined): q is Question => q !== undefined;

/**
 * Wählt die Kernfragen (mood5): gesamt zuerst, dann alle Pflichtthemen,
 * dann rotierende P0-Themen bis `CORE_QUESTION_COUNT`. Deterministisch je Gerät und Welle,
 * damit ein Neuladen mitten im Durchlauf dieselben Fragen zeigt.
 */
export function selectQuestions(deviceToken: string, waveId: string): Question[] {
  const mandatory = MANDATORY_TOPIC_SLUGS.filter((slug) => slug !== 'overall');
  const optional = P0_TOPIC_SLUGS.filter((slug) => !MANDATORY_TOPIC_SLUGS.includes(slug));
  const slots = Math.max(0, CORE_QUESTION_COUNT - 1 - mandatory.length);

  const random = mulberry32(hashString(`${deviceToken}|${waveId}`));
  const rotating = new Set(shuffled(optional, random).slice(0, slots));

  const slugs = ['overall', ...mandatory, ...optional.filter((slug) => rotating.has(slug))];
  return slugs.map(getCoreQuestion).filter(isQuestion);
}

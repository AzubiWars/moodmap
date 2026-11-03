/**
 * Mapping profiles (#268, ADR-018): a versioned JSON file that translates the columns of one provider
 * format onto the canonical model. New formats need a new profile, never new analysis code.
 * Example: scripts/fixtures/import/beispiel.mapping.json · Reference: docs/IMPORT.md.
 */
import type { GradeBand, Role } from '../../../src/types/domain.ts';

export interface QuestionMapping {
  column: string;
  questionId: string;
  /** Raw text → number before scaling, e.g. {"trifft zu": 5} or {"ja": 1, "nein": 0}. */
  values?: Record<string, number>;
  /** Source scale, linearly mapped onto 1–5 (mood5). The result must be a whole number. */
  scale?: { min: number; max: number };
  /** Flip the direction after scaling (mood5: 6 − v, swipe: 1 − v). */
  reverse?: boolean;
  /** For choice questions: separator for multiple answers and raw text → option value. */
  choice?: { separator?: string; values?: Record<string, string> };
}

export interface ResponseMapping {
  id: string;
  version: number;
  granularity?: 'response';
  format?: { delimiter?: ';' | ',' | '\t' | 'auto'; sheet?: string };
  columns: {
    /** Provider's participation ID; only stored as a salted hash (PRIVACY §9.2). */
    externalId: string;
    school: { column: string; values?: Record<string, string> };
    /** Either a date column (→ ISO week) or a wave column with `YYYY-Www`. */
    date?: { column: string; format?: 'YYYY-MM-DD' | 'DD.MM.YYYY' | 'excel' };
    wave?: { column: string };
    role?: { column?: string; values?: Record<string, Role>; default?: Role };
    gradeBand?: { column: string; values?: Record<string, GradeBand>; fromGrade?: boolean };
  };
  questions: QuestionMapping[];
  /** Cell values that mean "no answer" (default: empty, "k.A.", "NA", "n/a", "-"). */
  missing?: string[];
  /** Columns that are read but never used, e.g. names or class labels. Must list all personal data. */
  drop?: string[];
}

export interface AggregateMapping {
  id: string;
  version: number;
  granularity: 'aggregate';
  format?: ResponseMapping['format'];
  columns: {
    level: {
      column?: string;
      fixed?: 'nrw' | 'regbez' | 'kreis' | 'school';
      values?: Record<string, string>;
    };
    region: { column?: string };
    topic: { column: string; values?: Record<string, string> };
    wave?: { column: string };
    date?: ResponseMapping['columns']['date'];
    n: { column: string };
    score: { column: string; scale?: { min: number; max: number } };
    /** Optional mood distribution (counts per level 1–5). Only stored when delivered. */
    distribution?: [string, string, string, string, string];
  };
  missing?: string[];
  drop?: string[];
}

export type MappingProfile = ResponseMapping | AggregateMapping;

export const DEFAULT_MISSING = ['', 'k.A.', 'k. A.', 'NA', 'n/a', '-'];

/** Column names that look like personal data. They must be mapped away explicitly via `drop`. */
export const PERSONAL_DATA_PATTERN =
  /(^|[^a-z])(vor-?name|nach-?name|name|e-?mail|mail|telefon|phone|handy|klasse|class|geburt|birth|adresse|address|strasse|straße|ip|ger(ä|ae)t|device|freitext|kommentar|comment)([^a-z]|$)/i;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Structural validation with readable German messages; returns the typed profile. */
export function parseMapping(json: unknown): MappingProfile {
  const fail = (message: string): never => {
    throw new Error(`Mapping-Profil ungültig: ${message}`);
  };
  if (!isObject(json)) fail('kein Objekt');
  const profile = json as Record<string, unknown>;
  if (typeof profile.id !== 'string' || !/^[a-z0-9][a-z0-9-]{1,47}$/.test(profile.id))
    fail('`id` fehlt oder ist ungültig');
  if (!Number.isInteger(profile.version) || (profile.version as number) < 1)
    fail('`version` muss eine ganze Zahl ≥ 1 sein');
  if (!isObject(profile.columns)) fail('`columns` fehlt');
  const columns = profile.columns as Record<string, unknown>;
  const needColumn = (key: string) => {
    const entry = columns[key];
    if (!isObject(entry) || typeof entry.column !== 'string') fail(`\`columns.${key}.column\` fehlt`);
  };
  if (profile.granularity === 'aggregate') {
    for (const key of ['topic', 'n', 'score']) needColumn(key);
    const level = columns.level;
    if (!isObject(level) || (typeof level.column !== 'string' && typeof level.fixed !== 'string'))
      fail('`columns.level` braucht `column` oder `fixed`');
    if (!(isObject(columns.level) && columns.level.fixed === 'nrw')) {
      if (!isObject(columns.region) || typeof columns.region.column !== 'string')
        fail('`columns.region.column` fehlt');
    }
    if (!columns.wave && !columns.date) fail('`columns.wave` oder `columns.date` ist Pflicht');
    const dist = columns.distribution;
    if (
      dist !== undefined &&
      (!Array.isArray(dist) || dist.length !== 5 || dist.some((c) => typeof c !== 'string'))
    )
      fail('`columns.distribution` braucht genau 5 Spaltennamen (Stufe 1–5)');
    return json as AggregateMapping;
  }
  if (profile.granularity !== undefined && profile.granularity !== 'response')
    fail('`granularity` muss "response" oder "aggregate" sein');
  if (typeof columns.externalId !== 'string') fail('`columns.externalId` fehlt');
  needColumn('school');
  if (!columns.wave && !columns.date) fail('`columns.wave` oder `columns.date` ist Pflicht');
  if (!Array.isArray(profile.questions) || profile.questions.length === 0)
    fail('`questions` braucht mindestens eine Frage');
  for (const [i, q] of (profile.questions as unknown[]).entries()) {
    if (!isObject(q) || typeof q.column !== 'string' || typeof q.questionId !== 'string')
      fail(`\`questions[${i}]\` braucht \`column\` und \`questionId\``);
    const scale = (q as Record<string, unknown>).scale;
    if (
      scale !== undefined &&
      (!isObject(scale) ||
        typeof scale.min !== 'number' ||
        typeof scale.max !== 'number' ||
        scale.max <= scale.min)
    )
      fail(`\`questions[${i}].scale\` braucht min < max`);
  }
  return json as ResponseMapping;
}

/** All columns a profile reads. */
export function usedColumns(profile: MappingProfile): string[] {
  const c = profile.columns as Record<string, unknown>;
  const names: string[] = [];
  for (const value of Object.values(c)) {
    if (typeof value === 'string') names.push(value);
    else if (Array.isArray(value)) names.push(...value.filter((v): v is string => typeof v === 'string'));
    else if (isObject(value) && typeof value.column === 'string') names.push(value.column);
  }
  if (profile.granularity !== 'aggregate') names.push(...profile.questions.map((q) => q.column));
  return names;
}

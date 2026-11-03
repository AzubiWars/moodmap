/**
 * Raw table + mapping profile → canonical rows (#268, ADR-018) with row-level validation.
 * Pure function: no I/O, no hashing, no database. The CLI hashes external IDs only on commit.
 */
import type { GradeBand, Question, Role, SchoolForm } from '../../../src/types/domain.ts';
import { GRADE_BANDS } from '../../../src/types/domain.ts';
import { isoWeekOf } from '../waves.ts';
import {
  DEFAULT_MISSING,
  PERSONAL_DATA_PATTERN,
  type AggregateMapping,
  type MappingProfile,
  type QuestionMapping,
  type ResponseMapping,
  usedColumns,
} from './mapping.ts';
import { excelSerialToIso } from './xlsx.ts';

export type CanonicalAnswer =
  { questionId: string; value: number } | { questionId: string; choice: string[] };

export interface CanonicalResponse {
  /** 1-based data row number (header = row 1), for error reports without cell contents. */
  row: number;
  externalId: string;
  schoolId: string;
  waveId: string;
  /** Day precision (PRIVACY §1.4). */
  date: string | null;
  role: Role;
  gradeBand: GradeBand | null;
  answers: CanonicalAnswer[];
}

export interface CanonicalAggregate {
  row: number;
  level: 'nrw' | 'regbez' | 'kreis' | 'school';
  regionId: string;
  topic: string;
  waveId: string;
  n: number;
  score: number | null;
  distribution: [number, number, number, number, number] | null;
}

export interface ImportContext {
  schools: readonly { id: string; kreisId: string; schoolForm?: SchoolForm }[];
  questions: readonly Question[];
  topics: readonly { slug: string }[];
  kMin: number;
  /** Optional period of the data source (YYYY-MM-DD, inclusive). */
  period?: { start?: string; end?: string };
}

export interface Rejection {
  row: number;
  code: string;
}

export interface CanonicalResult<T> {
  rows: T[];
  rejected: Rejection[];
  /** Non-fatal findings, e.g. unmapped columns or dropped answers. */
  warnings: Rejection[];
  /** Fatal problems with the file or profile (exit code ≠ 0, nothing is imported). */
  critical: string[];
  totalRows: number;
}

const WAVE_ID = /^\d{4}-W\d{2}$/;

class RowError extends Error {}
const reject = (code: string): never => {
  throw new RowError(code);
};

function parseDate(raw: string, format: NonNullable<ResponseMapping['columns']['date']>['format']): string {
  const text = raw.trim();
  if (format === 'excel' || (/^\d+(\.\d+)?$/.test(text) && Number(text) > 20000 && Number(text) < 80000))
    return excelSerialToIso(Number(text));
  const german = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s.*)?$/.exec(text);
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(text);
  const [y, m, d] = german
    ? [german[3], german[2], german[1]]
    : iso
      ? [iso[1], iso[2], iso[3]]
      : reject('invalid_date');
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(d)) reject('invalid_date');
  return date.toISOString().slice(0, 10);
}

const waveOf = (date: string) => {
  const { year, week } = isoWeekOf(new Date(`${date}T00:00:00Z`));
  return `${year}-W${String(week).padStart(2, '0')}`;
};

function gradeToBand(raw: string): GradeBand {
  const text = raw.trim().toUpperCase();
  if (['EF', 'Q1', 'Q2', 'OBERSTUFE'].includes(text)) return 'oberstufe';
  const grade = Number(text.replace(/[^0-9]/g, ''));
  if (grade >= 5 && grade <= 7) return '5-7';
  if (grade >= 8 && grade <= 10) return '8-10';
  if (grade >= 11 && grade <= 13) return 'oberstufe';
  return reject('invalid_grade_band');
}

/** Shared header checks: required columns present, personal-data columns explicitly dropped. */
function checkHeader(header: string[], profile: MappingProfile, critical: string[], warnings: Rejection[]) {
  const used = new Set(usedColumns(profile));
  const dropped = new Set(profile.drop ?? []);
  for (const column of used)
    if (!header.includes(column)) critical.push(`Spalte „${column}" fehlt in der Datei`);
  for (const column of header) {
    if (used.has(column) || dropped.has(column)) continue;
    if (PERSONAL_DATA_PATTERN.test(column))
      critical.push(
        `Spalte „${column}" sieht nach personenbezogenen Daten aus – im Profil unter \`drop\` eintragen`,
      );
    else warnings.push({ row: 1, code: `unmapped_column:${column}` });
  }
}

function questionValue(q: Question, mapping: QuestionMapping, raw: string): CanonicalAnswer {
  if (q.type === 'choice') {
    const parts = mapping.choice?.separator ? raw.split(mapping.choice.separator) : [raw];
    const choice = [
      ...new Set(
        parts
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => mapping.choice?.values?.[p] ?? p),
      ),
    ];
    if (!choice.length || choice.some((c) => !q.options?.some((o) => o.value === c)))
      reject('invalid_choice');
    if (!q.multiple && choice.length > 1) reject('invalid_choice');
    return { questionId: q.id, choice };
  }
  const text = raw.trim();
  let value =
    mapping.values && text in mapping.values ? mapping.values[text]! : Number(text.replace(',', '.'));
  if (!Number.isFinite(value)) reject('invalid_value');
  if (mapping.scale) {
    const { min, max } = mapping.scale;
    if (value < min || value > max) reject('value_out_of_range');
    value = q.type === 'mood5' ? 1 + ((value - min) * 4) / (max - min) : (value - min) / (max - min);
  }
  if (!Number.isInteger(value)) reject('value_not_on_scale');
  if (mapping.reverse) value = q.type === 'mood5' ? 6 - value : 1 - value;
  if (q.type === 'mood5' ? value < 1 || value > 5 : value !== 0 && value !== 1) reject('value_out_of_range');
  return { questionId: q.id, value };
}

export function toCanonicalResponses(
  table: string[][],
  profile: ResponseMapping,
  context: ImportContext,
): CanonicalResult<CanonicalResponse> {
  const [header = [], ...data] = table;
  const critical: string[] = [];
  const warnings: Rejection[] = [];
  const rejected: Rejection[] = [];
  const rows: CanonicalResponse[] = [];
  const questions = new Map(context.questions.map((q) => [q.id, q]));
  for (const mapping of profile.questions) {
    if (!questions.has(mapping.questionId))
      critical.push(`Unbekannte Frage-ID „${mapping.questionId}" im Profil`);
  }
  checkHeader(header, profile, critical, warnings);
  if (critical.length) return { rows, rejected, warnings, critical, totalRows: data.length };

  const index = new Map(header.map((name, i) => [name, i]));
  const missing = new Set(profile.missing ?? DEFAULT_MISSING);
  const schools = new Set(context.schools.map((s) => s.id));
  const seen = new Set<string>();
  const { columns } = profile;

  data.forEach((cells, i) => {
    const row = i + 2;
    const cell = (column: string) => (cells[index.get(column)!] ?? '').trim();
    const present = (column: string) => !missing.has(cell(column));
    try {
      const externalId = cell(columns.externalId);
      if (!externalId) reject('missing_external_id');
      if (seen.has(externalId)) reject('duplicate_external_id');
      const rawSchool = cell(columns.school.column);
      const schoolId = columns.school.values?.[rawSchool] ?? rawSchool;
      if (!schools.has(schoolId)) reject('unknown_school');

      let date: string | null = null;
      let waveId: string;
      if (columns.date && present(columns.date.column)) {
        date = parseDate(cell(columns.date.column), columns.date.format);
        waveId = waveOf(date);
      } else if (columns.wave && present(columns.wave.column)) {
        waveId = cell(columns.wave.column);
        if (!WAVE_ID.test(waveId)) reject('invalid_wave');
      } else waveId = reject('missing_date');
      if (date && context.period?.start && date < context.period.start) reject('outside_period');
      if (date && context.period?.end && date > context.period.end) reject('outside_period');

      let role: Role | undefined = columns.role?.default;
      if (columns.role?.column && present(columns.role.column)) {
        const raw = cell(columns.role.column);
        role = columns.role.values?.[raw] ?? (raw as Role);
      }
      if (role !== 'student' && role !== 'teacher') reject('invalid_role');

      let gradeBand: GradeBand | null = null;
      if (columns.gradeBand && present(columns.gradeBand.column)) {
        const raw = cell(columns.gradeBand.column);
        gradeBand =
          columns.gradeBand.values?.[raw] ??
          (columns.gradeBand.fromGrade ? gradeToBand(raw) : (raw as GradeBand));
        if (!GRADE_BANDS.includes(gradeBand)) reject('invalid_grade_band');
      }

      const answers: CanonicalAnswer[] = [];
      for (const mapping of profile.questions) {
        if (!present(mapping.column)) continue;
        const question = questions.get(mapping.questionId)!;
        if (question.audience && question.audience !== role) reject('question_not_for_role');
        if (answers.some((a) => a.questionId === question.id)) reject('duplicate_question');
        answers.push(questionValue(question, mapping, cell(mapping.column)));
      }
      if (!answers.length) reject('no_answers');
      seen.add(externalId);
      rows.push({ row, externalId, schoolId, waveId, date, role: role!, gradeBand, answers });
    } catch (error) {
      if (!(error instanceof RowError)) throw error;
      rejected.push({ row, code: error.message });
    }
  });
  if (data.length && !rows.length) critical.push('Keine einzige Zeile ist gültig');
  return { rows, rejected, warnings, critical, totalRows: data.length };
}

export function toCanonicalAggregates(
  table: string[][],
  profile: AggregateMapping,
  context: ImportContext,
): CanonicalResult<CanonicalAggregate> {
  const [header = [], ...data] = table;
  const critical: string[] = [];
  const warnings: Rejection[] = [];
  const rejected: Rejection[] = [];
  const rows: CanonicalAggregate[] = [];
  checkHeader(header, profile, critical, warnings);
  if (critical.length) return { rows, rejected, warnings, critical, totalRows: data.length };

  const index = new Map(header.map((name, i) => [name, i]));
  const missing = new Set(profile.missing ?? DEFAULT_MISSING);
  const topics = new Set(['all', ...context.topics.map((t) => t.slug)]);
  const regions = {
    school: new Set(context.schools.map((s) => s.id)),
    kreis: new Set(context.schools.map((s) => s.kreisId)),
    regbez: new Set(context.schools.map((s) => s.kreisId.slice(0, 3))),
    nrw: new Set(['nrw']),
  };
  const seen = new Set<string>();
  const { columns } = profile;

  data.forEach((cells, i) => {
    const row = i + 2;
    const cell = (column: string) => (cells[index.get(column)!] ?? '').trim();
    try {
      const rawLevel = columns.level.fixed ?? cell(columns.level.column!);
      const level = (columns.level.values?.[rawLevel] ?? rawLevel) as CanonicalAggregate['level'];
      if (!(level in regions)) reject('invalid_level');
      const regionId = level === 'nrw' ? 'nrw' : cell(columns.region.column!);
      if (!regions[level].has(regionId)) reject('unknown_region');
      const rawTopic = cell(columns.topic.column);
      const topic = columns.topic.values?.[rawTopic] ?? rawTopic;
      if (!topics.has(topic)) reject('unknown_topic');
      let waveId: string;
      if (columns.date && !missing.has(cell(columns.date.column)))
        waveId = waveOf(parseDate(cell(columns.date.column), columns.date.format));
      else if (columns.wave && WAVE_ID.test(cell(columns.wave.column))) waveId = cell(columns.wave.column);
      else waveId = reject('missing_date');
      const n = Number(cell(columns.n.column));
      if (!Number.isInteger(n) || n < 0) reject('invalid_n');
      // PRIVACY §9.5: cells below K_MIN are not imported at all.
      if (n < context.kMin) reject('below_k_min');
      let score: number | null = null;
      if (!missing.has(cell(columns.score.column))) {
        score = Number(cell(columns.score.column).replace(',', '.'));
        if (!Number.isFinite(score)) reject('invalid_score');
        if (columns.score.scale) {
          const { min, max } = columns.score.scale;
          if (score < min || score > max) reject('score_out_of_range');
          score = ((score - min) * 100) / (max - min);
        }
        if (score < 0 || score > 100) reject('score_out_of_range');
        score = Math.round(score * 10) / 10;
      }
      let distribution: CanonicalAggregate['distribution'] = null;
      if (columns.distribution && columns.distribution.every((c) => !missing.has(cell(c)))) {
        const values = columns.distribution.map((c) => Number(cell(c)));
        if (values.some((v) => !Number.isInteger(v) || v < 0)) reject('invalid_distribution');
        distribution = values as CanonicalAggregate['distribution'];
      }
      const key = `${level}|${regionId}|${topic}|${waveId}`;
      if (seen.has(key)) reject('duplicate_cell');
      seen.add(key);
      rows.push({ row, level, regionId, topic, waveId, n, score, distribution });
    } catch (error) {
      if (!(error instanceof RowError)) throw error;
      rejected.push({ row, code: error.message });
    }
  });
  if (data.length && !rows.length) critical.push('Keine einzige Zeile ist gültig');
  return { rows, rejected, warnings, critical, totalRows: data.length };
}

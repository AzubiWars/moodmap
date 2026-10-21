import type { DataSource } from '@/data/api';
import { SCHOOL_FORMS, type TopicSlug } from '@/types';
import {
  combineRows,
  regbezComparison,
  schoolFormComparison,
  topicStat,
  type Combined,
  type GroupStat,
  type TopicStat,
} from './lagebild';

export interface Lagebild {
  overall: Combined;
  /** Schulen mit mindestens einer Teilnahme in der aktuellen Welle (nur eine Anzahl, keine Werte). */
  schools: number;
  topics: TopicStat[];
}

/** Alle Kennzahlen für Gesamt-NRW in der aktuellen Welle. Testschulen filtert die DataSource (`is_test`). */
export async function loadLagebild(source: DataSource, kMin: number): Promise<Lagebild> {
  const topics = [...(await source.getTopics())].sort((a, b) => a.sort - b.sort);
  // `level: 'nrw'` liefert genau eine Zeile, direkt über alle Antworten aggregiert (#140).
  const [allRows, schoolRows, ...topicRows] = await Promise.all([
    source.getAggregates({ level: 'nrw', topic: 'all' }),
    source.getAggregates({ level: 'school', topic: 'all' }),
    ...topics.map((topic) => source.getAggregates({ level: 'nrw', topic: topic.slug })),
  ]);
  return {
    overall: combineRows(allRows, kMin),
    schools: schoolRows.filter((row) => row.n > 0).length,
    topics: topics.map((topic, i) => topicStat(topic, topicRows[i]!, kMin)),
  };
}

export interface Comparison {
  schoolForms: GroupStat[];
  regbez: GroupStat[];
}

/** Ein Thema im Vergleich der Schulformen und Regierungsbezirke. */
export async function loadComparison(
  source: DataSource,
  topic: TopicSlug,
  kMin: number,
): Promise<Comparison> {
  const [regbezRows, ...formRows] = await Promise.all([
    source.getAggregates({ level: 'regbez', topic }),
    ...SCHOOL_FORMS.map((form) => source.getAggregates({ level: 'nrw', topic, schoolForm: [form] })),
  ]);
  return {
    regbez: regbezComparison(regbezRows, kMin),
    schoolForms: schoolFormComparison(
      SCHOOL_FORMS.map((form, i) => [form, formRows[i]!] as const),
      kMin,
    ),
  };
}

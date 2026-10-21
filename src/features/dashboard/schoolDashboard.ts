import type { DataSource } from '@/data/api';
import type { School, Topic, Wave } from '@/types';
import { combineRows } from './lagebild';

/** Anzahl der Wochen im Verlauf (inklusive der aktuellen). */
export const TREND_WEEKS = 8;

const WAVE_ID = /^(\d{4})-W(\d{2})$/;

/** Montag (UTC) der ISO-Woche. Der 4. Januar liegt immer in KW 1. */
function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const weekday = (jan4.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(year, 0, 4 - weekday + (week - 1) * 7));
}

function waveIdOf(monday: Date): string {
  // Der Donnerstag der Woche bestimmt das ISO-Jahr.
  const thursday = new Date(monday.getTime() + 3 * 86_400_000);
  const year = thursday.getUTCFullYear();
  const week = Math.floor((thursday.getTime() - isoWeekMonday(year, 1).getTime()) / (7 * 86_400_000)) + 1;
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/** Die letzten `count` Wellen-IDs bis einschließlich `currentId`, älteste zuerst (`2026-W43` → …, `2026-W43`). */
export function recentWaveIds(currentId: string, count = TREND_WEEKS): string[] {
  const match = WAVE_ID.exec(currentId);
  if (!match) return [currentId];
  const monday = isoWeekMonday(Number(match[1]), Number(match[2]));
  return Array.from({ length: count }, (_, i) =>
    waveIdOf(new Date(monday.getTime() - (count - 1 - i) * 7 * 86_400_000)),
  );
}

export interface SchoolTopicRow {
  slug: string;
  title: string;
  icon: string;
  /** `null` unter K_MIN. */
  score: number | null;
  /** Ø der Schulform, `null` unter K_MIN. */
  formScore: number | null;
  /** Schule minus Ø Schulform in Punkten; `null`, wenn eine Seite fehlt. */
  diff: number | null;
}

export interface SchoolTrendPoint {
  waveId: string;
  score: number | null;
}

export interface SchoolDashboardData {
  wave: Wave;
  school: School;
  /** Teilnahmen der Schule in der aktuellen Welle. */
  n: number;
  score: number | null;
  delta: number | null;
  form: { n: number; score: number | null };
  topics: SchoolTopicRow[];
  trend: SchoolTrendPoint[];
}

const roundOne = (value: number) => Math.round(value * 10) / 10;

/** Größte Abweichung nach unten zuerst („hier ist die Schule schlechter als der Schnitt"); ohne Vergleich ans Ende. */
export function sortByGap(rows: readonly SchoolTopicRow[]): SchoolTopicRow[] {
  return [...rows].sort((a, b) => {
    if (a.diff == null || b.diff == null) return a.diff == null ? (b.diff == null ? 0 : 1) : -1;
    return a.diff - b.diff;
  });
}

/**
 * Kennzahlen der eigenen Schule und der Vergleich mit dem Ø der Schulform (ganz NRW). Alle Werte kommen
 * bereits k-anonymisiert aus der DataSource; andere Schulen verlassen diese Funktion nie.
 */
export async function loadSchoolDashboard(
  source: DataSource,
  school: School,
  kMin: number,
): Promise<SchoolDashboardData> {
  const wave = await source.getCurrentWave();
  const scope = { level: 'school', topic: 'all', parentId: school.kreisId } as const;
  const [topics, schoolRows, formRows, trendRows] = await Promise.all([
    source.getTopics(),
    source.getAggregates(scope),
    source.getAggregates({ level: 'nrw', topic: 'all', schoolForm: [school.schoolForm] }),
    source.getTrend({ ...scope, waveIds: recentWaveIds(wave.id) }),
  ]);
  const own = schoolRows.find((row) => row.id === school.id);
  const form = combineRows(formRows, kMin);
  const formTopics = formRows[0]?.topicScores;

  const rows = topics
    .filter((topic: Topic) => topic.audience.includes('student'))
    .sort((a, b) => a.sort - b.sort)
    .map((topic): SchoolTopicRow => {
      const score = own?.topicScores?.[topic.slug] ?? null;
      const formScore = formTopics?.[topic.slug] ?? null;
      return {
        slug: topic.slug,
        title: topic.title,
        icon: topic.icon,
        score,
        formScore,
        diff: score != null && formScore != null ? roundOne(score - formScore) : null,
      };
    });

  const byWave = new Map(trendRows.filter((point) => point.id === school.id).map((p) => [p.waveId, p]));
  return {
    wave,
    school,
    n: own?.n ?? 0,
    score: own?.score ?? null,
    delta: own?.delta ?? null,
    form: { n: form.n, score: form.score },
    topics: rows,
    trend: recentWaveIds(wave.id).map((waveId) => ({ waveId, score: byWave.get(waveId)?.score ?? null })),
  };
}

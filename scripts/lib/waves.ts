/**
 * Survey waves = ISO weeks (`2026-W43`), Monday 00:00 to next Monday 00:00 in Europe/Berlin.
 * Shared by the Supabase seed (#93) and the synthetic answer seed (#8).
 */

export interface WaveSpec {
  id: string;
  /** Monday of the ISO week, `YYYY-MM-DD`. */
  monday: string;
  /** Monday of the following week, `YYYY-MM-DD` (exclusive end). */
  nextMonday: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** Monday (UTC date) of ISO week `week` in ISO year `year`. Week 1 contains January 4th. */
export function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Weekday = (jan4.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(jan4.getTime() - jan4Weekday * DAY_MS + (week - 1) * 7 * DAY_MS);
}

/** ISO year and week of a (UTC) date. */
export function isoWeekOf(date: Date): { year: number; week: number } {
  const thursday = new Date(date.getTime() + (3 - ((date.getUTCDay() + 6) % 7)) * DAY_MS);
  const year = thursday.getUTCFullYear();
  const week = Math.round((thursday.getTime() - isoWeekMonday(year, 1).getTime()) / (7 * DAY_MS)) + 1;
  return { year, week };
}

export function parseWaveId(id: string): { year: number; week: number } {
  const match = /^(\d{4})-W(\d{2})$/.exec(id);
  if (!match) throw new Error(`Invalid wave id: ${id}`);
  return { year: Number(match[1]), week: Number(match[2]) };
}

export function waveSpec(id: string): WaveSpec {
  const { year, week } = parseWaveId(id);
  const monday = isoWeekMonday(year, week);
  if (isoWeekOf(monday).week !== week) throw new Error(`Week ${week} does not exist in ${year}`);
  return { id, monday: isoDate(monday), nextMonday: isoDate(new Date(monday.getTime() + 7 * DAY_MS)) };
}

/** All waves from `firstId` to `lastId` (inclusive), across year boundaries. */
export function waveRange(firstId: string, lastId: string): WaveSpec[] {
  const waves: WaveSpec[] = [];
  const end = isoWeekMonday(parseWaveId(lastId).year, parseWaveId(lastId).week).getTime();
  const first = parseWaveId(firstId);
  for (let t = isoWeekMonday(first.year, first.week).getTime(); t <= end; t += 7 * DAY_MS) {
    const { year, week } = isoWeekOf(new Date(t));
    waves.push(waveSpec(`${year}-W${String(week).padStart(2, '0')}`));
  }
  return waves;
}

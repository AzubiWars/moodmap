import type { DataSourceInfo, DataSourceKind, WaveId } from '@/types';

/** URL-Parameter der gewählten Datenquelle (#272), gilt für Karte und Lagebild. */
export const SOURCE_PARAM = 'quelle';

export const SOURCE_KIND_LABEL: Record<DataSourceKind, string> = {
  demo: 'Demo',
  live: 'Live',
  import: 'Import',
};

const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** „3. März 2026 – 30. Apr. 2026“, „ab …“, „bis …“ oder `null` ohne Zeitraum. */
export function periodLabel(source: Pick<DataSourceInfo, 'periodStart' | 'periodEnd'>): string | null {
  const { periodStart: start, periodEnd: end } = source;
  if (start && end) return `${formatDay(start)} – ${formatDay(end)}`;
  if (start) return `ab ${formatDay(start)}`;
  if (end) return `bis ${formatDay(end)}`;
  return null;
}

/** ISO-Woche eines Tages (`YYYY-MM-DD`). */
function weekOf(day: string): WaveId {
  const date = new Date(`${day}T00:00:00Z`);
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 3 - ((date.getUTCDay() + 6) % 7));
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1 = new Date(jan4);
  week1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  const week = 1 + Math.floor((thursday.getTime() - week1.getTime()) / 604_800_000);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Bezugswoche für Zeitachse und Zeiträume: bei einer abgeschlossenen Import-Befragung deren letzte
 * Woche, sonst die aktuelle. Wellen-IDs sind lexikografisch sortierbar (`2026-W09` < `2026-W43`).
 */
export function anchorWave(
  source: Pick<DataSourceInfo, 'kind' | 'periodEnd'> | undefined,
  currentWaveId: WaveId | undefined,
): WaveId | undefined {
  if (!currentWaveId || source?.kind !== 'import' || !source.periodEnd) return currentWaveId;
  const end = weekOf(source.periodEnd);
  return end < currentWaveId ? end : currentWaveId;
}

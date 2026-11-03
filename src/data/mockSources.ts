import type { DataSourceInfo } from '@/types';
import type { MockDataset, MockDataSource } from './mockRecords';

/** Der Browser-Mock enthält ausschließlich synthetische Daten (ADR-017): eine Demo-Quelle. */
export const DEFAULT_MOCK_SOURCES: readonly MockDataSource[] = [
  {
    id: 'demo-seed',
    label: 'Demo-Daten (synthetisch)',
    kind: 'demo',
    periodStart: null,
    periodEnd: null,
    visibility: 'public',
    isDefault: true,
    aggregatedByProvider: false,
  },
];

const sourcesOf = (data: MockDataset) => data.sources ?? DEFAULT_MOCK_SOURCES;

export function defaultSourceId(data: MockDataset): string {
  const source = sourcesOf(data).find((entry) => entry.isDefault);
  if (!source) throw new Error('Keine Default-Datenquelle im Demo-Datensatz.');
  return source.id;
}

/**
 * Wie `resolve_source()` in SQL: ohne Angabe die Default-Quelle; unbekannte oder nicht öffentliche
 * Quellen sind ein Fehler, nie ein stiller Fallback (ADR-018). Der Mock kennt keine Anmeldung.
 */
export function resolveSourceId(data: MockDataset, sourceId: string | undefined): string {
  if (sourceId === undefined) return defaultSourceId(data);
  const source = sourcesOf(data).find((entry) => entry.id === sourceId);
  if (!source || source.visibility !== 'public') throw new Error(`Unbekannte Datenquelle: ${sourceId}`);
  return source.id;
}

/** Nur die Teilnahmen einer Quelle; Antworten folgen über ihre `responseId`. */
export function forSource(data: MockDataset, sourceId: string): MockDataset {
  const fallback = defaultSourceId(data);
  const responses = data.responses.filter((response) => (response.sourceId ?? fallback) === sourceId);
  if (responses.length === data.responses.length) return data;
  const ids = new Set(responses.map((response) => response.id));
  return { ...data, responses, answers: data.answers.filter((answer) => ids.has(answer.responseId)) };
}

/** `get_data_sources()`: öffentliche Quellen, Default zuerst, leere Nicht-Default-Quellen ausgeblendet. */
export function listSources(data: MockDataset): DataSourceInfo[] {
  const fallback = defaultSourceId(data);
  const pitch = new Set(data.schools.filter((school) => school.isTest).map((school) => school.id));
  const counts = new Map<string, number>();
  const answered = new Set(data.answers.map((answer) => answer.responseId));
  for (const response of data.responses) {
    if (pitch.has(response.schoolId) || !answered.has(response.id)) continue;
    const id = response.sourceId ?? fallback;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return sourcesOf(data)
    .filter((source) => source.visibility === 'public' && (source.isDefault || counts.has(source.id)))
    .map((source) => ({ ...source, n: counts.get(source.id) ?? 0 }))
    .sort(
      (a, b) =>
        Number(b.isDefault) - Number(a.isDefault) ||
        Number(a.kind === 'demo') - Number(b.kind === 'demo') ||
        a.label.localeCompare(b.label),
    );
}

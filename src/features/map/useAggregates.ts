import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getDataSource } from '@/data';
import type { AggregateRow, DataLevel, TopicSlug } from '@/types';

export type MapTopic = TopicSlug | 'all';

export type ScoreMap = ReadonlyMap<string, { score: number | null; n: number }>;

const EMPTY: ScoreMap = new Map();

export const aggregatesKey = (level: DataLevel, topic: MapTopic, parentId?: string) =>
  ['aggregates', level, topic, parentId ?? null] as const;

/**
 * K-anonymisierte Aggregate einer Ebene aus der aktiven DataSource (#68).
 * Beim Themenwechsel bleiben die alten Werte stehen, bis die neuen da sind – kein Grau-Flackern.
 */
export function useAggregates(
  level: DataLevel,
  topic: MapTopic,
  options: { parentId?: string; enabled?: boolean; refetchInterval?: number | false } = {},
) {
  const { parentId, enabled = true, refetchInterval = false } = options;
  return useQuery({
    queryKey: aggregatesKey(level, topic, parentId),
    queryFn: () => getDataSource().getAggregates({ level, topic, parentId }),
    placeholderData: keepPreviousData,
    enabled,
    // Live-Modus (#24): pollen, auch wenn die Datenquelle kein Push-Event schickt
    refetchInterval,
  });
}

export function toScoreMap(rows: readonly AggregateRow[] | undefined): ScoreMap {
  if (!rows) return EMPTY;
  return new Map(rows.map((row) => [row.id, { score: row.score, n: row.n }]));
}

/** Neue Antwort (Mood-Check, anderer Tab) → alle Aggregate neu laden. Basis für den Live-Modus #24. */
export function useLiveAggregates() {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      getDataSource().subscribeToNewResponses(() => {
        void queryClient.invalidateQueries({ queryKey: ['aggregates'] });
      }),
    [queryClient],
  );
}

/** Spannungs-Index (Frühwarn-Radar #42) einer Ebene; Themen sind fest (TENSION_WEIGHTS), daher ohne `topic`. */
export function useTension(
  level: Exclude<DataLevel, 'nrw'>,
  options: { parentId?: string; enabled?: boolean; refetchInterval?: number | false } = {},
) {
  const { parentId, enabled = true, refetchInterval = false } = options;
  return useQuery({
    queryKey: ['aggregates', 'tension', level, parentId ?? null],
    queryFn: () => getDataSource().getTensionIndex({ level, topic: 'all', parentId }),
    placeholderData: keepPreviousData,
    enabled,
    refetchInterval,
  });
}

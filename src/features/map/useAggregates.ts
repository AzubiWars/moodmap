import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getDataSource } from '@/data';
import type { AggregateQuery, AggregateRow, DataLevel, TopicSlug } from '@/types';

export type MapTopic = TopicSlug | 'all';

/** Weitere Filter (#20), werden 1:1 an die DataSource gereicht */
export type AggregateFilters = Pick<AggregateQuery, 'schoolForm' | 'gradeBand' | 'waveIds'>;

/** Leere Filter weglassen, damit Query-Keys stabil bleiben und die DataSource ihre Standards nutzt */
function cleanFilters(filters: AggregateFilters | undefined): AggregateFilters {
  return {
    ...(filters?.schoolForm?.length ? { schoolForm: filters.schoolForm } : {}),
    ...(filters?.gradeBand?.length ? { gradeBand: filters.gradeBand } : {}),
    ...(filters?.waveIds?.length ? { waveIds: filters.waveIds } : {}),
  };
}

export type ScoreMap = ReadonlyMap<string, { score: number | null; n: number; delta?: number | null }>;

const EMPTY: ScoreMap = new Map();

export const aggregatesKey = (
  level: DataLevel,
  topic: MapTopic,
  parentId?: string,
  filters: AggregateFilters = {},
) => ['aggregates', level, topic, parentId ?? null, filters] as const;

/**
 * K-anonymisierte Aggregate einer Ebene aus der aktiven DataSource (#68).
 * Beim Themenwechsel bleiben die alten Werte stehen, bis die neuen da sind – kein Grau-Flackern.
 */
export function useAggregates(
  level: DataLevel,
  topic: MapTopic,
  options: {
    parentId?: string;
    enabled?: boolean;
    refetchInterval?: number | false;
    filters?: AggregateFilters;
  } = {},
) {
  const { parentId, enabled = true, refetchInterval = false } = options;
  const filters = cleanFilters(options.filters);
  return useQuery({
    queryKey: aggregatesKey(level, topic, parentId, filters),
    queryFn: () => getDataSource().getAggregates({ level, topic, parentId, ...filters }),
    placeholderData: keepPreviousData,
    enabled,
    // Live-Modus (#24): pollen, auch wenn die Datenquelle kein Push-Event schickt
    refetchInterval,
  });
}

export function toScoreMap(rows: readonly AggregateRow[] | undefined): ScoreMap {
  if (!rows) return EMPTY;
  return new Map(rows.map((row) => [row.id, { score: row.score, n: row.n, delta: row.delta }]));
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
  options: {
    parentId?: string;
    enabled?: boolean;
    refetchInterval?: number | false;
    filters?: AggregateFilters;
  } = {},
) {
  const { parentId, enabled = true, refetchInterval = false } = options;
  const filters = cleanFilters(options.filters);
  return useQuery({
    queryKey: ['aggregates', 'tension', level, parentId ?? null, filters],
    queryFn: () => getDataSource().getTensionIndex({ level, topic: 'all', parentId, ...filters }),
    placeholderData: keepPreviousData,
    enabled,
    refetchInterval,
  });
}

/** Aktuelle Welle – Basis für Zeiträume (#20) */
export function useCurrentWave() {
  return useQuery({
    queryKey: ['wave', 'current'],
    queryFn: () => getDataSource().getCurrentWave(),
    staleTime: 60_000,
  });
}

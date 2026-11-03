import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { getDataSource } from '@/data';
import { SOURCE_PARAM } from '@/lib/dataSources';
import type { DataSourceInfo } from '@/types';

/** Aktive, für diesen Aufrufer sichtbare Quellen (#272). Die Sichtbarkeit prüft der Server. */
export function useDataSources() {
  return useQuery({
    queryKey: ['data-sources'],
    queryFn: () => getDataSource().getDataSources(),
    staleTime: 5 * 60_000,
  });
}

export interface SelectedSource {
  sources: DataSourceInfo[];
  /** Für Abfragen: nur gesetzt, wenn in der URL eine andere als die Default-Quelle gewählt ist. */
  sourceId: string | undefined;
  /** Die angezeigte Quelle; `undefined`, solange die Liste lädt oder die URL-Quelle unbekannt ist. */
  selected: DataSourceInfo | undefined;
  /** URL nennt eine Quelle, die es (für diesen Aufrufer) nicht gibt – kein stiller Fallback (ADR-018). */
  unknown: boolean;
  setSource: (id: string) => void;
}

/** Gewählte Datenquelle aus `?quelle=`; ohne Parameter die Default-Quelle. */
export function useSelectedSource(): SelectedSource {
  const [params, setParams] = useSearchParams();
  const query = useDataSources();
  const sources = query.data ?? [];
  const requested = params.get(SOURCE_PARAM) ?? undefined;
  const fallback = sources.find((source) => source.isDefault);
  const selected = requested ? sources.find((source) => source.id === requested) : fallback;
  return {
    sources,
    sourceId: requested && requested !== fallback?.id ? requested : undefined,
    selected,
    unknown: Boolean(requested && query.isSuccess && !selected),
    setSource: (id) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          const isDefault = sources.find((source) => source.id === id)?.isDefault;
          if (isDefault) next.delete(SOURCE_PARAM);
          else next.set(SOURCE_PARAM, id);
          // Eine gewählte Woche gehört zur alten Quelle.
          next.delete('wave');
          return next;
        },
        { preventScrollReset: true },
      ),
  };
}

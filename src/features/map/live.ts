import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { getDataSource } from '@/data';
import type { LiveCounts } from '@/types';

/** Was der Puls braucht: Stimmen je Einheit. */
type CountRow = { id: string; n: number };

/** Beamer-Ansicht pollt alle 2–3 s (ADR-015) – zusätzlich zur Invalidierung per subscribeToNewResponses. */
export const LIVE_POLL_MS = 2500;
/** So lange pulsiert eine Schule nach einer neuen Stimme. */
export const PULSE_MS = 4000;

/**
 * IDs, deren `n` gegenüber dem vorigen Abruf gestiegen ist, und die Summe der neuen Stimmen.
 * Diff statt Event-Payload: funktioniert gleich für Mock (BroadcastChannel), Polling und Supabase-Realtime.
 */
export function diffGrowth(
  previous: ReadonlyMap<string, number> | null,
  rows: readonly CountRow[],
): { grown: string[]; added: number } {
  if (!previous) return { grown: [], added: 0 };
  const grown: string[] = [];
  let added = 0;
  for (const row of rows) {
    const before = previous.get(row.id);
    // Neue Einheit (vorher < 1 Stimme) zählt mit, sonst nur echtes Wachstum
    const delta = row.n - (before ?? 0);
    if (delta > 0) {
      grown.push(row.id);
      added += delta;
    }
  }
  return { grown, added };
}

/**
 * Verfolgt neue Stimmen in einer Aggregat-Reihe. `resetKey` (z. B. Thema) setzt die Basis neu,
 * damit ein Themenwechsel keine Schein-Pulse auslöst.
 */
export function useLivePulses(rows: readonly CountRow[] | undefined, active: boolean, resetKey: string) {
  const baseline = useRef<{ key: string; counts: Map<string, number> } | null>(null);
  const [pulsing, setPulsing] = useState<ReadonlyMap<string, number>>(new Map());
  const [added, setAdded] = useState(0);

  useEffect(() => {
    if (!active || !rows) {
      baseline.current = null;
      return;
    }
    const sameKey = baseline.current?.key === resetKey;
    const { grown, added: newVotes } = diffGrowth(sameKey ? baseline.current!.counts : null, rows);
    baseline.current = { key: resetKey, counts: new Map(rows.map((row) => [row.id, row.n])) };
    // Neue Basis (Live eingeschaltet oder Thema gewechselt): Zähler startet bei 0
    if (!sameKey) setAdded(0);
    if (grown.length === 0) return;
    const until = Date.now() + PULSE_MS;
    setPulsing((current) => {
      const next = new Map(current);
      for (const id of grown) next.set(id, until);
      return next;
    });
    setAdded((count) => count + newVotes);
  }, [rows, active, resetKey]);

  // Abgelaufene Pulse entfernen
  useEffect(() => {
    if (pulsing.size === 0) return;
    const nextExpiry = Math.min(...pulsing.values());
    const timer = setTimeout(
      () => {
        const now = Date.now();
        setPulsing((current) => new Map([...current].filter(([, until]) => until > now)));
      },
      Math.max(0, nextExpiry - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [pulsing]);

  return active ? { pulsing: [...pulsing.keys()], added } : { pulsing: [], added: 0 };
}

/**
 * Delta-Poll für den Live-Puls (#253, ADR-020): fragt alle 2,5 s nur die Version ab. Zähler je Schule
 * kommen nur bei einer Änderung; sonst bleibt dasselbe Array-Objekt stehen, und es gibt kein Re-Render.
 */
export function useLiveCounts(active: boolean, sourceId: string | undefined) {
  const queryClient = useQueryClient();
  const key = ['aggregates', 'live-counts', sourceId ?? null] as const;
  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<LiveCounts> => {
      const previous = queryClient.getQueryData<LiveCounts>(key);
      const next = await getDataSource().getLiveCounts({ sourceId, knownVersion: previous?.version });
      return next.rows === null && previous ? { ...next, rows: previous.rows } : next;
    },
    enabled: active,
    refetchInterval: active ? LIVE_POLL_MS : false,
    // #251: im Hintergrund-Tab nicht pollen.
    refetchIntervalInBackground: false,
    // Gleiche Version → strukturell gleiche Daten → TanStack behält die alte Referenz.
    structuralSharing: true,
  });
  return query.data?.rows ?? undefined;
}

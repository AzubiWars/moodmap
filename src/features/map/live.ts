import { useEffect, useRef, useState } from 'react';
import type { AggregateRow } from '@/types';

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
  rows: readonly AggregateRow[],
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
export function useLivePulses(rows: readonly AggregateRow[] | undefined, active: boolean, resetKey: string) {
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

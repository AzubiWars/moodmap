import { getDataSource } from '@/data';
import type { ResponseInput } from '@/types';

/**
 * Offline-Puffer für Mood-Check-Abgaben (#36).
 * Enthält nur das anonyme `ResponseInput` – nie Freitext (docs/PRIVACY.md).
 */
const OUTBOX_KEY = 'moodmap:outbox:v1';
const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 5 * 60_000;
/** Server-Fehler (z. B. abgelaufene Welle) werden nicht ewig wiederholt; Netzfehler schon. */
export const MAX_ATTEMPTS = 8;

export interface OutboxEntry {
  id: string;
  input: ResponseInput;
  attempts: number;
  nextAttemptAt: number;
}

export interface FlushResult {
  sent: number;
  dropped: OutboxEntry[];
}

let memory: OutboxEntry[] = [];
const listeners = new Set<() => void>();

function read(): OutboxEntry[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
  } catch {
    return memory;
  }
}

function write(entries: OutboxEntry[]) {
  memory = entries;
  try {
    if (entries.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
    else localStorage.removeItem(OUTBOX_KEY);
  } catch {
    /* Privatmodus: der Puffer lebt dann nur bis zum Neuladen */
  }
  listeners.forEach((fn) => fn());
}

export function backoffDelay(attempts: number): number {
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1));
}

export function pendingCount(): number {
  return read().length;
}

export function subscribeOutbox(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function enqueueResponse(input: ResponseInput, now = Date.now()): OutboxEntry {
  const entry: OutboxEntry = { id: crypto.randomUUID(), input, attempts: 0, nextAttemptAt: now };
  write([...read(), entry]);
  return entry;
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

let flushing: Promise<FlushResult> | null = null;

/** Sendet alle fälligen Einträge nacheinander. Läuft höchstens einmal gleichzeitig. */
export function flushOutbox(now: () => number = Date.now): Promise<FlushResult> {
  flushing ??= run(now).finally(() => (flushing = null));
  return flushing;
}

async function run(now: () => number): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, dropped: [] };
  if (isOffline()) return result;
  for (const entry of read()) {
    if (entry.nextAttemptAt > now()) continue;
    let outcome: 'done' | 'network' | 'error';
    try {
      const res = await getDataSource().submitResponse(entry.input);
      // already_submitted: die Stimme ist schon gezählt, also ebenfalls erledigt.
      outcome = res.ok || res.reason === 'already_submitted' ? 'done' : 'error';
    } catch {
      outcome = 'network';
    }
    const rest = read().filter((e) => e.id !== entry.id);
    if (outcome === 'done') {
      result.sent += 1;
      write(rest);
      continue;
    }
    const attempts = entry.attempts + 1;
    if (outcome === 'error' && attempts >= MAX_ATTEMPTS) {
      result.dropped.push(entry);
      write(rest);
      continue;
    }
    write([...rest, { ...entry, attempts, nextAttemptAt: now() + backoffDelay(attempts) }]);
    // Netz weg: die übrigen Einträge scheitern genauso, also auf das nächste Signal warten.
    if (outcome === 'network') break;
  }
  return result;
}

/** Hängt den Puffer an `online`-Event und Backoff-Timer. Gibt eine Aufräumfunktion zurück. */
export function startOutbox(onSent?: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const schedule = () => {
    clearTimeout(timer);
    const next = Math.min(...read().map((e) => e.nextAttemptAt));
    // Offline wartet der Puffer auf das `online`-Event, statt im Kreis zu prüfen.
    if (stopped || isOffline() || !Number.isFinite(next)) return;
    timer = setTimeout(tick, Math.max(0, next - Date.now()));
  };
  const tick = () => {
    void flushOutbox().then(({ sent }) => {
      if (sent) onSent?.();
      schedule();
    });
  };
  const onOnline = () => {
    // Nach dem Wiederverbinden sofort senden, nicht erst nach Ablauf des Backoffs.
    write(read().map((e) => ({ ...e, nextAttemptAt: 0 })));
    tick();
  };

  window.addEventListener('online', onOnline);
  const unsubscribe = subscribeOutbox(() => {
    if (!flushing) schedule();
  });
  tick();
  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribe();
    window.removeEventListener('online', onOnline);
  };
}

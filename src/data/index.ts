import { DATA_MODE } from '@/lib/env';
import type { DataSource, DataSourceMode } from './api';
import { mockSource } from './mockBootstrap';

const sources = new Map<DataSourceMode, DataSource>([['mock', mockSource]]);

/**
 * Registriert eine DataSource-Implementierung.
 * Wird von #9 (`mockSource`) und #23 (`supabaseSource`) aufgerufen.
 */
export function registerDataSource(mode: DataSourceMode, source: DataSource): void {
  sources.set(mode, source);
}

/**
 * Validiert `VITE_DATA_MODE`. Alles außer `supabase` fällt bewusst auf `mock`
 * zurück – die Demo darf nicht an einer kaputten Env-Variable scheitern (ADR-003).
 */
export function resolveDataSourceMode(value: string | undefined = DATA_MODE): DataSourceMode {
  return value === 'supabase' ? 'supabase' : 'mock';
}

/**
 * Liefert die aktive DataSource. Ist der gewünschte Modus (noch) nicht
 * registriert, wird auf `mock` zurückgefallen (Demo-Versicherung).
 */
export function getDataSource(mode: DataSourceMode = resolveDataSourceMode()): DataSource {
  const source = sources.get(mode) ?? sources.get('mock');
  if (!source) {
    throw new Error(`Keine DataSource registriert (Modus "${mode}"). Siehe #9 (Mock) und #23 (Supabase).`);
  }
  return source;
}

/** Nur für Tests/HMR: Registry leeren. */
export function clearDataSources(): void {
  sources.clear();
}

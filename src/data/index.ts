import { DATA_MODE } from '@/lib/env';
import type { DataSource, DataSourceMode } from './api';
import { mockSource } from './mockBootstrap';
import { createConfiguredSupabaseSource } from './supabaseSource';

const sources = new Map<DataSourceMode, DataSource>([['mock', mockSource]]);
const supabaseSource = createConfiguredSupabaseSource();
if (supabaseSource) sources.set('supabase', supabaseSource);

/**
 * Registriert eine DataSource-Implementierung.
 * Wird von #9 (`mockSource`) und #23 (`supabaseSource`) aufgerufen.
 */
export function registerDataSource(mode: DataSourceMode, source: DataSource): void {
  sources.set(mode, source);
}

/**
 * `mock` ist nur noch ein expliziter Entwicklungs-/Testmodus. Jeder andere Wert
 * (auch ein Tippfehler) wird als Live-Modus behandelt und fällt nicht auf Demo-Daten zurück.
 */
export function resolveDataSourceMode(value: string | undefined = DATA_MODE): DataSourceMode {
  return value === 'mock' ? 'mock' : 'supabase';
}

/**
 * Liefert die aktive DataSource. Live darf niemals still auf Demo-Daten zurückfallen:
 * fehlt die Supabase-Konfiguration, gibt es einen klaren Fehler statt Testdaten.
 */
export function getDataSource(mode: DataSourceMode = resolveDataSourceMode()): DataSource {
  const source = sources.get(mode);
  if (!source) {
    throw new Error(
      mode === 'supabase'
        ? 'Live-Daten sind nicht konfiguriert (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY fehlen).'
        : `Keine DataSource registriert (Modus "${mode}").`,
    );
  }
  return source;
}

/** Nur für Tests/HMR: Registry leeren. */
export function clearDataSources(): void {
  sources.clear();
}

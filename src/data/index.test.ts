import type { DataSource } from './api';
import { clearDataSources, getDataSource, registerDataSource, resolveDataSourceMode } from './index';

const mockSource = { kind: 'mock' } as unknown as DataSource;
const supabaseSource = { kind: 'supabase' } as unknown as DataSource;

describe('data source factory', () => {
  beforeEach(() => {
    clearDataSources();
  });

  it('treats only explicit mock as demo mode', () => {
    expect(resolveDataSourceMode('mock')).toBe('mock');
    expect(resolveDataSourceMode('')).toBe('supabase');
    expect(resolveDataSourceMode('something-else')).toBe('supabase');
    expect(resolveDataSourceMode()).toBe('mock'); // Testlauf ohne VITE_DATA_MODE
  });

  it('returns the registered source for the requested mode', () => {
    registerDataSource('mock', mockSource);
    registerDataSource('supabase', supabaseSource);

    expect(getDataSource('mock')).toBe(mockSource);
    expect(getDataSource('supabase')).toBe(supabaseSource);
  });

  it('never falls back to mock when live is requested', () => {
    registerDataSource('mock', mockSource);

    expect(() => getDataSource('supabase')).toThrow(/Live-Daten sind nicht konfiguriert/);
  });

  it('fails with a helpful message when nothing is registered', () => {
    expect(() => getDataSource('mock')).toThrow(/Keine DataSource registriert/);
  });
});

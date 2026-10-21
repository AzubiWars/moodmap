import type { DataSource } from './api';
import { clearDataSources, getDataSource, registerDataSource, resolveDataSourceMode } from './index';

const mockSource = { kind: 'mock' } as unknown as DataSource;
const supabaseSource = { kind: 'supabase' } as unknown as DataSource;

describe('data source factory', () => {
  beforeEach(() => {
    clearDataSources();
  });

  it('defaults to mock for missing, empty or unknown values', () => {
    expect(resolveDataSourceMode(undefined)).toBe('mock');
    expect(resolveDataSourceMode('')).toBe('mock');
    expect(resolveDataSourceMode('something-else')).toBe('mock');
  });

  it('selects supabase only for the exact value', () => {
    expect(resolveDataSourceMode('supabase')).toBe('supabase');
    expect(resolveDataSourceMode('Supabase')).toBe('mock');
  });

  it('returns the registered source for the requested mode', () => {
    registerDataSource('mock', mockSource);
    registerDataSource('supabase', supabaseSource);

    expect(getDataSource('mock')).toBe(mockSource);
    expect(getDataSource('supabase')).toBe(supabaseSource);
  });

  it('falls back to mock when supabase is not registered (demo safety)', () => {
    registerDataSource('mock', mockSource);

    expect(getDataSource('supabase')).toBe(mockSource);
  });

  it('fails with a helpful message when nothing is registered', () => {
    expect(() => getDataSource('mock')).toThrow(/Keine DataSource registriert/);
  });
});

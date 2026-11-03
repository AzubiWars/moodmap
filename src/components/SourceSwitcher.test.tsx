import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { DataSourceInfo } from '@/types';
import { anchorWave, periodLabel } from '@/lib/dataSources';
import { EmptySourceNotice, SourceSwitcher } from './SourceSwitcher';
import type { SelectedSource } from './useSelectedSource';

const source = (over: Partial<DataSourceInfo>): DataSourceInfo => ({
  id: 'live',
  label: 'Live-Abgaben',
  kind: 'live',
  periodStart: null,
  periodEnd: null,
  visibility: 'public',
  isDefault: true,
  aggregatedByProvider: false,
  n: 1234,
  ...over,
});
const LIVE = source({});
const IMPORT = source({
  id: 'schule-2026',
  label: 'Schulbefragung 2026',
  kind: 'import',
  isDefault: false,
  periodStart: '2026-03-02',
  periodEnd: '2026-04-30',
  n: 512,
});

const selection = (over: Partial<SelectedSource>): SelectedSource => ({
  sources: [LIVE, IMPORT],
  sourceId: undefined,
  selected: LIVE,
  unknown: false,
  setSource: vi.fn(),
  ...over,
});

describe('SourceSwitcher (#272)', () => {
  it('stays hidden with a single source', () => {
    const { container } = render(<SourceSwitcher selection={selection({ sources: [LIVE] })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows label, kind, period and size, and switches the source', () => {
    const setSource = vi.fn();
    render(<SourceSwitcher selection={selection({ selected: IMPORT, sourceId: IMPORT.id, setSource })} />);
    expect(screen.getByRole('combobox', { name: 'Datenquelle' })).toHaveValue('schule-2026');
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByText(/512 Teilnahmen/)).toBeInTheDocument();
    expect(screen.getByText(/2\. März 2026/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'live' } });
    expect(setSource).toHaveBeenCalledWith('live');
  });

  it('marks provider aggregates', () => {
    render(<SourceSwitcher selection={selection({ selected: { ...IMPORT, aggregatedByProvider: true } })} />);
    expect(screen.getByText(/vom Anbieter aggregiert/)).toBeInTheDocument();
  });

  it('says so instead of falling back when the URL names an unknown source', () => {
    const setSource = vi.fn();
    render(<SourceSwitcher selection={selection({ unknown: true, selected: undefined, setSource })} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/nicht freigegeben/);
    fireEvent.click(screen.getByRole('button', { name: 'Zur Standardquelle' }));
    expect(setSource).toHaveBeenCalledWith('live');
  });

  it('explains an empty source', () => {
    render(<EmptySourceNotice selection={selection({ selected: { ...IMPORT, n: 0 } })} />);
    expect(screen.getByRole('status')).toHaveTextContent(/noch keine Teilnahmen/);
  });
});

describe('data source helpers', () => {
  it('anchors timeline and periods on the last week of a finished import', () => {
    expect(anchorWave(IMPORT, '2026-W45')).toBe('2026-W18');
    expect(anchorWave(LIVE, '2026-W45')).toBe('2026-W45');
    expect(anchorWave({ kind: 'import', periodEnd: '2027-01-10' }, '2026-W45')).toBe('2026-W45');
    expect(anchorWave(undefined, undefined)).toBeUndefined();
  });

  it('formats periods', () => {
    expect(periodLabel({ periodStart: null, periodEnd: null })).toBeNull();
    expect(periodLabel({ periodStart: '2026-03-02', periodEnd: null })).toMatch(/^ab /);
  });
});

describe('useSelectedSource', () => {
  it('keeps the source in ?quelle= and drops it for the default', async () => {
    const { useSelectedSource } = await import('./useSelectedSource');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const data = await import('@/data');
    vi.spyOn(data.getDataSource(), 'getDataSources').mockResolvedValue([LIVE, IMPORT]);
    let search = '';
    function Probe() {
      const s = useSelectedSource();
      search = useLocation().search;
      return (
        <>
          <span data-testid="sel">{s.selected?.id ?? '-'}</span>
          <button onClick={() => s.setSource('schule-2026')}>import</button>
          <button onClick={() => s.setSource('live')}>live</button>
        </>
      );
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/map?wave=2026-W40']}>
          <Probe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('live')).toBeInTheDocument();
    expect(await screen.findByTestId('sel')).toHaveTextContent('live');
    fireEvent.click(screen.getByText('import'));
    expect(search).toBe('?quelle=schule-2026');
    expect(screen.getByTestId('sel')).toHaveTextContent('schule-2026');
    fireEvent.click(screen.getByRole('button', { name: 'live' }));
    expect(search).toBe('');
  });
});

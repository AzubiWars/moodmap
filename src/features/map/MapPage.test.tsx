import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { demoScores } from './demoScores';
import { MapPage } from './MapPage';
import type { Bounds, RegionCollection } from './geo';

vi.mock('./MoodMap', () => ({
  MoodMap: ({
    regions,
    selectedId,
    focusBounds,
    onSelect,
  }: {
    regions: RegionCollection | null;
    selectedId: string | null;
    focusBounds: Bounds;
    onSelect: (id: string) => void;
  }) => (
    <div>
      <output data-testid="map-data">{JSON.stringify(regions)}</output>
      <output data-testid="map-focus">{JSON.stringify(focusBounds)}</output>
      <output data-testid="map-selected">{selectedId ?? ''}</output>
      {regions?.features.map((f) => (
        <button key={f.properties.id} type="button" onClick={() => onSelect(f.properties.id)}>
          Fläche {f.properties.id}
        </button>
      ))}
    </div>
  ),
}));

function square(x: number, y: number) {
  return {
    type: 'Polygon' as const,
    coordinates: [
      [
        [x, y],
        [x + 1, y],
        [x + 1, y + 1],
        [x, y + 1],
        [x, y],
      ],
    ],
  };
}

const regbez: RegionCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { id: '051', name: 'Düsseldorf' }, geometry: square(6, 51) },
    { type: 'Feature', properties: { id: '053', name: 'Köln' }, geometry: square(6, 50) },
  ],
};

const regions: RegionCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: '05111', name: 'Düsseldorf', regbez_id: '051', type: 'kreisfreie_stadt' },
      geometry: square(6.7, 51.2),
    },
    {
      type: 'Feature',
      properties: { id: '05315', name: 'Köln', regbez_id: '053', type: 'kreisfreie_stadt' },
      geometry: square(6.9, 50.9),
    },
  ],
};

function openMap(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['geo', 'regbez'], regbez);
  client.setQueryData(['geo', 'kreis'], regions);
  const router = createMemoryRouter([{ path: '/map', element: <MapPage /> }], { initialEntries: [url] });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function openTopicDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Alle Themen' }));
  return screen.getByRole('dialog', { name: 'Thema wählen' });
}

describe('map topic filter', () => {
  it('restores a shared topic URL and changes map data without reloading', async () => {
    const router = openMap('/map?topic=ai&mode=mood');
    expect(screen.getByRole('button', { name: 'KI im Schulalltag' })).toHaveAttribute('aria-pressed', 'true');
    const expected = demoScores(['051'], 'ai').get('051')!;
    expect(screen.getByTestId('map-data')).toHaveTextContent(`"score":${expected.score ?? -1}`);
    const previousData = screen.getByTestId('map-data').textContent;

    const dialog = openTopicDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: /Digitale Ausstattung/ }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=digital&mode=mood'));
    expect(screen.queryByRole('dialog', { name: 'Thema wählen' })).not.toBeInTheDocument();
    expect(screen.getByTestId('map-data').textContent).not.toBe(previousData);

    await act(() => router.navigate(-1));
    expect(screen.getByRole('button', { name: 'KI im Schulalltag' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('map-data').textContent).toBe(previousData);
  });

  it('searches topics with regex and selects a result', async () => {
    const router = openMap('/map?topic=ai&mode=mood');
    const dialog = openTopicDialog();
    const search = within(dialog).getByRole('searchbox', { name: 'Thema suchen' });

    fireEvent.change(search, { target: { value: '/ki|stress/i' } });
    expect(within(dialog).getByRole('button', { name: /KI im Schulalltag/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Stress & Leistungsdruck/ })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Digitale Ausstattung/ })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /Stress & Leistungsdruck/ }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=stress&mode=mood'));
    expect(screen.getByRole('button', { name: /Stress & Leistungsdruck/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('resets to overall mood while retaining other filters', async () => {
    const router = openMap('/map?topic=ai&mode=mood');
    fireEvent.click(screen.getByRole('button', { name: 'Gesamt-Mood' }));
    await waitFor(() => expect(router.state.location.search).toBe('?mode=mood'));
    expect(screen.getByRole('button', { name: 'Gesamt-Mood' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to overall mood for an unknown topic', () => {
    openMap('/map?topic=unknown');
    expect(screen.getByRole('button', { name: 'Gesamt-Mood' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('map drill-down', () => {
  const mapData = () => JSON.parse(screen.getByTestId('map-data').textContent!) as RegionCollection;
  const focus = () => JSON.parse(screen.getByTestId('map-focus').textContent!) as Bounds;

  it('drills NRW → Regierungsbezirk → Kreis and keeps the topic', async () => {
    const router = openMap('/map?topic=ai');
    expect(mapData().features.map((f) => f.properties.id)).toEqual(['051', '053']);
    expect(screen.queryByRole('button', { name: 'Zurück zu NRW' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fläche 053' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai&regbez=053'));
    expect(mapData().features.map((f) => [f.properties.id, (f.properties as { dim?: boolean }).dim])).toEqual(
      [
        ['05111', true],
        ['05315', false],
      ],
    );
    expect(focus()).toEqual([
      [6, 50],
      [7, 51],
    ]);
    expect(screen.getByText('Reg.-Bez. Köln')).toHaveAttribute('aria-current', 'location');

    fireEvent.click(screen.getByRole('button', { name: 'Fläche 05315' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai&regbez=053&kreis=05315'));
    expect(screen.getByTestId('map-selected')).toHaveTextContent('05315');
    expect(screen.getByText('Stadt Köln')).toHaveAttribute('aria-current', 'location');
    expect(focus()).toEqual([
      [6.9, 50.9],
      [7.9, 51.9],
    ]);
  });

  it('navigates up via breadcrumb, „Zurück zu NRW“ and browser back', async () => {
    const router = openMap('/map?topic=ai&regbez=053&kreis=05315');
    expect(screen.getByText('Stadt Köln')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reg.-Bez. Köln' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai&regbez=053'));

    fireEvent.click(screen.getByRole('button', { name: 'Zurück zu NRW' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai'));
    expect(mapData().features.map((f) => f.properties.id)).toEqual(['051', '053']);

    await act(() => router.navigate(-1));
    expect(screen.getByText('Reg.-Bez. Köln')).toHaveAttribute('aria-current', 'location');
  });

  it('ignores unknown drill ids from a shared link', () => {
    openMap('/map?regbez=999&kreis=00000');
    expect(screen.getByText('NRW')).toHaveAttribute('aria-current', 'location');
    expect(mapData().features).toHaveLength(2);
  });
});

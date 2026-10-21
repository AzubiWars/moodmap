import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { demoScores } from './demoScores';
import { MapPage } from './MapPage';
import type { RegionCollection } from './geo';

vi.mock('./MoodMap', () => ({
  MoodMap: ({ regions }: { regions: RegionCollection | null }) => (
    <output data-testid="map-data">{JSON.stringify(regions)}</output>
  ),
}));

const regions: RegionCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: '05111', name: 'Düsseldorf' },
      geometry: { type: 'Point', coordinates: [6.78, 51.23] },
    },
  ],
};

function openMap(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

describe('map topic filter', () => {
  it('restores a shared topic URL and changes map data without reloading', async () => {
    const router = openMap('/map?topic=ai&mode=mood');
    expect(screen.getByRole('button', { name: 'KI im Schulalltag' })).toHaveAttribute('aria-pressed', 'true');
    const expected = demoScores(['05111'], 'ai').get('05111')!;
    expect(screen.getByTestId('map-data')).toHaveTextContent(`"score":${expected.score ?? -1}`);
    const previousData = screen.getByTestId('map-data').textContent;

    fireEvent.click(screen.getByRole('button', { name: 'Digitale Ausstattung' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=digital&mode=mood'));
    expect(screen.getByTestId('map-data').textContent).not.toBe(previousData);

    await act(() => router.navigate(-1));
    expect(screen.getByRole('button', { name: 'KI im Schulalltag' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('map-data').textContent).toBe(previousData);
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

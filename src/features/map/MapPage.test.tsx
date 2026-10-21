import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { AggregateQuery, AggregateRow } from '@/types';
import { MapPage } from './MapPage';
import type { School } from '@/types';
import type { Bounds, RegionCollection } from './geo';
import type { SchoolCollection } from './schools';

/** Deterministische Fake-Aggregate: Score hängt von ID und Thema ab, damit Themenwechsel sichtbar umfärbt. */
function fakeScore(id: string, topic: string) {
  const sum = [...`${id}:${topic}`].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return 20 + (sum % 70);
}

const aggregateCalls: AggregateQuery[] = [];
let liveCallback: (() => void) | null = null;

vi.mock('@/data', () => ({
  getDataSource: () => ({
    getAggregates: async (query: AggregateQuery): Promise<AggregateRow[]> => {
      aggregateCalls.push(query);
      const ids =
        query.level === 'regbez'
          ? ['051', '053']
          : query.level === 'kreis'
            ? ['05111', '05315']
            : ['900001', '900002'];
      return ids.map((id) => ({ id, n: 50, score: fakeScore(id, query.topic), delta: null }));
    },
    subscribeToNewResponses: (callback: () => void) => {
      liveCallback = callback;
      return () => {
        liveCallback = null;
      };
    },
  }),
}));

vi.mock('./MoodMap', () => ({
  MoodMap: ({
    regions,
    selectedId,
    focusBounds,
    onSelect,
    schools,
    selectedSchoolId,
    onSelectSchool,
  }: {
    regions: RegionCollection | null;
    selectedId: string | null;
    focusBounds: Bounds;
    onSelect: (id: string) => void;
    schools: SchoolCollection | null;
    selectedSchoolId: string | null;
    onSelectSchool: (id: string) => void;
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
      <output data-testid="map-selected-school">{selectedSchoolId ?? ''}</output>
      {schools?.features.map((f) => (
        <button key={f.properties.id} type="button" onClick={() => onSelectSchool(f.properties.id)}>
          Schule {f.properties.id}
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

const school = (id: string, kreisId: string, lon: number, lat: number): School => ({
  id,
  name: `Schule ${id}`,
  schoolForm: 'gymnasium',
  kreisId,
  city: 'Testort',
  lat,
  lon,
  studentCount: 500,
  joinCode: `J${id}`,
});

const schools: School[] = [school('900001', '05111', 6.8, 51.25), school('900002', '05315', 6.95, 50.94)];

function openMap(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['geo', 'regbez'], regbez);
  client.setQueryData(['geo', 'kreis'], regions);
  client.setQueryData(['schools'], schools);
  const router = createMemoryRouter([{ path: '/map', element: <MapPage /> }], { initialEntries: [url] });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

/** Breadcrumb-Navigation – Namen tauchen zusätzlich im Detail-Panel (#19) auf */
const crumbs = () => within(screen.getByRole('navigation', { name: 'Kartenebene' }));

beforeEach(() => {
  aggregateCalls.length = 0;
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
    await waitFor(() =>
      expect(screen.getByTestId('map-data')).toHaveTextContent(`"score":${fakeScore('051', 'ai')}`),
    );
    const previousData = screen.getByTestId('map-data').textContent;

    const dialog = openTopicDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: /Digitale Ausstattung/ }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=digital&mode=mood'));
    expect(screen.queryByRole('dialog', { name: 'Thema wählen' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('map-data').textContent).not.toBe(previousData));

    await act(() => router.navigate(-1));
    expect(screen.getByRole('button', { name: 'KI im Schulalltag' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(screen.getByTestId('map-data').textContent).toBe(previousData));
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
    expect(crumbs().getByText('Reg.-Bez. Köln')).toHaveAttribute('aria-current', 'location');

    fireEvent.click(screen.getByRole('button', { name: 'Fläche 05315' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai&regbez=053&kreis=05315'));
    expect(screen.getByTestId('map-selected')).toHaveTextContent('05315');
    expect(crumbs().getByText('Stadt Köln')).toHaveAttribute('aria-current', 'location');
    expect(focus()).toEqual([
      [6.9, 50.9],
      [7.9, 51.9],
    ]);
  });

  it('navigates up via breadcrumb, „Zurück zu NRW“ and browser back', async () => {
    const router = openMap('/map?topic=ai&regbez=053&kreis=05315');
    expect(crumbs().getByText('Stadt Köln')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reg.-Bez. Köln' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai&regbez=053'));

    fireEvent.click(screen.getByRole('button', { name: 'Zurück zu NRW' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai'));
    expect(mapData().features.map((f) => f.properties.id)).toEqual(['051', '053']);

    await act(() => router.navigate(-1));
    expect(crumbs().getByText('Reg.-Bez. Köln')).toHaveAttribute('aria-current', 'location');
  });

  it('ignores unknown drill ids from a shared link', () => {
    openMap('/map?regbez=999&kreis=00000');
    expect(crumbs().getByText('NRW')).toHaveAttribute('aria-current', 'location');
    expect(mapData().features).toHaveLength(2);
  });
});

describe('school markers (#18)', () => {
  const schoolButtons = () => screen.queryAllByRole('button', { name: /^Schule / }).map((b) => b.textContent);

  it('shows no schools on NRW level and only the regbez schools after drilling in', async () => {
    const router = openMap('/map');
    expect(schoolButtons()).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Fläche 053' }));
    await waitFor(() => expect(router.state.location.search).toBe('?regbez=053'));
    expect(schoolButtons()).toEqual(['Schule 900002']);
  });

  it('opens a school with breadcrumb and goes back to the kreis', async () => {
    const router = openMap('/map?topic=ai&regbez=053&kreis=05315');
    fireEvent.click(screen.getByRole('button', { name: 'Schule 900002' }));
    await waitFor(() =>
      expect(router.state.location.search).toBe('?topic=ai&regbez=053&kreis=05315&school=900002'),
    );
    expect(screen.getByTestId('map-selected-school')).toHaveTextContent('900002');
    expect(crumbs().getByText('Schule 900002', { selector: '[aria-current]' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Stadt Köln' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai&regbez=053&kreis=05315'));
    expect(screen.getByTestId('map-selected-school')).toBeEmptyDOMElement();
  });
});

describe('aggregates from the DataSource (#68)', () => {
  const scoreOf = (id: string) =>
    (JSON.parse(screen.getByTestId('map-data').textContent!) as RegionCollection).features.find(
      (f) => f.properties.id === id,
    )?.properties as unknown as { score: number; n: number };

  it('colors regbez on NRW level and kreise after drilling in', async () => {
    const router = openMap('/map?topic=stress');
    await waitFor(() => expect(scoreOf('053').score).toBe(fakeScore('053', 'stress')));
    expect(aggregateCalls).toContainEqual(expect.objectContaining({ level: 'regbez', topic: 'stress' }));

    fireEvent.click(screen.getByRole('button', { name: 'Fläche 053' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=stress&regbez=053'));
    await waitFor(() => expect(scoreOf('05315').score).toBe(fakeScore('05315', 'stress')));
    expect(aggregateCalls).toContainEqual(expect.objectContaining({ level: 'school', topic: 'stress' }));
  });

  it('asks only for the schools of the kreis on kreis level', async () => {
    openMap('/map?regbez=053&kreis=05315');
    await waitFor(() =>
      expect(aggregateCalls).toContainEqual(expect.objectContaining({ level: 'school', parentId: '05315' })),
    );
  });

  it('refetches aggregates when a new response arrives', async () => {
    openMap('/map');
    await waitFor(() => expect(aggregateCalls.length).toBeGreaterThan(0));
    const before = aggregateCalls.length;
    act(() => liveCallback?.());
    await waitFor(() => expect(aggregateCalls.length).toBeGreaterThan(before));
  });
});

describe('detail panel (#19)', () => {
  it('is hidden on NRW level and shows the drilled unit with its votes', async () => {
    const router = openMap('/map');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fläche 053' }));
    await waitFor(() => expect(router.state.location.search).toBe('?regbez=053'));
    const panel = await screen.findByRole('complementary', { name: 'Details: Reg.-Bez. Köln' });
    await waitFor(() => expect(within(panel).getByText('50 Stimmen')).toBeInTheDocument());
  });

  it('shows school facts on school level', async () => {
    openMap('/map?regbez=053&kreis=05315&school=900002');
    const panel = await screen.findByRole('complementary', { name: 'Details: Schule 900002' });
    expect(within(panel).getByText('Gymnasium · Testort · Schulnummer 900002')).toBeInTheDocument();
    // 50 Stimmen bei 500 Schüler:innen
    await waitFor(() => expect(within(panel).getByText(/10 % Beteiligung/)).toBeInTheDocument());
  });
});

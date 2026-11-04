import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { AggregateQuery, AggregateRow } from '@/types';
import { useRoleStore } from '@/store/role';
import { MapPage } from './MapPage';
import { needsSchoolData } from './schools';
import type { School } from '@/types';
import type { Bounds, RegionCollection } from './geo';
import type { SchoolCollection } from './schools';

/** Deterministische Fake-Aggregate: Score hängt von ID und Thema ab, damit Themenwechsel sichtbar umfärbt. */
function fakeScore(id: string, topic: string) {
  const sum = [...`${id}:${topic}`].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return 20 + (sum % 70);
}

const aggregateCalls: AggregateQuery[] = [];
/** Zusätzliche Stimmen je Schule – simuliert neue Abgaben im Live-Modus */
const extraVotes = new Map<string, number>();
let liveCallback: (() => void) | null = null;
let liveCountCalls = 0;

vi.mock('@/data', () => ({
  getDataSource: () => ({
    getAggregates: async (query: AggregateQuery): Promise<AggregateRow[]> => {
      aggregateCalls.push(query);
      const ids =
        query.level === 'nrw'
          ? ['nrw']
          : query.level === 'regbez'
            ? ['051', '053']
            : query.level === 'kreis'
              ? ['05111', '05315']
              : ['900001', '900002'];
      return ids.map((id) => ({
        id,
        n: 50 + (extraVotes.get(id) ?? 0),
        score: fakeScore(id, query.topic),
        // Trend (#21): 053 verschlechtert sich, 051 ohne Vorwoche
        delta: id === '053' ? -6 : null,
        // #160: Köln hat echte Stimmen (≥ K_MIN), alles andere ist Demo
        ...(id === '05315' ? { liveN: 12 } : {}),
      }));
    },
    getTensionIndex: async (query: AggregateQuery) => {
      aggregateCalls.push({ ...query, topic: 'tension' as AggregateQuery['topic'] });
      const ids =
        query.level === 'regbez'
          ? ['051', '053']
          : query.level === 'kreis'
            ? ['05111', '05315']
            : ['900001', '900002'];
      return ids.map((id) => ({
        id,
        index: id.endsWith('3') || id.endsWith('5') || id === '900002' ? 64 : 30,
        level: id.endsWith('3') || id.endsWith('5') || id === '900002' ? 'talk' : 'stable',
        trend: 4,
        drivers: ['voice', 'safety'],
      }));
    },
    // #253: Delta-Poll – Zeilen nur, wenn sich die Version geändert hat
    getLiveCounts: async ({ knownVersion }: { knownVersion?: string }) => {
      liveCountCalls += 1;
      const rows = ['900001', '900002'].map((id) => ({ id, n: 50 + (extraVotes.get(id) ?? 0) }));
      const version = `2026-W43:${rows.reduce((sum, row) => sum + row.n, 0)}`;
      return { version, rows: knownVersion === version ? null : rows };
    },
    getCurrentWave: async () => ({ id: '2026-W43', startsAt: '2026-10-19', endsAt: '2026-10-26' }),
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
    pulses,
    is3d,
    onPitchChange,
    directorySchools,
  }: {
    regions: RegionCollection | null;
    selectedId: string | null;
    focusBounds: Bounds;
    onSelect: (id: string) => void;
    schools: SchoolCollection | null;
    selectedSchoolId: string | null;
    onSelectSchool: (id: string) => void;
    pulses?: { id: string }[];
    is3d?: boolean;
    onPitchChange?: (value: boolean) => void;
    directorySchools?: { features: { properties: { id: string } }[] } | null;
  }) => (
    <div>
      <output data-testid="map-directory">
        {(directorySchools?.features ?? []).map((f) => f.properties.id).join(',')}
      </output>
      <output data-testid="map-data">{JSON.stringify(regions)}</output>
      <output data-testid="map-focus">{JSON.stringify(focusBounds)}</output>
      <output data-testid="map-selected">{selectedId ?? ''}</output>
      {regions?.features.map((f) => (
        <button key={f.properties.id} type="button" onClick={() => onSelect(f.properties.id)}>
          Fläche {f.properties.id}
        </button>
      ))}
      <output data-testid="map-selected-school">{selectedSchoolId ?? ''}</output>
      <output data-testid="map-pulses">{(pulses ?? []).map((p) => p.id).join(',')}</output>
      <output data-testid="map-3d">{String(is3d ?? false)}</output>
      <button
        type="button"
        aria-label="3D-Ansicht umschalten"
        aria-pressed={is3d ?? false}
        onClick={() => onPitchChange?.(!is3d)}
      >
        {is3d ? '2D' : '3D'}
      </button>
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
    {
      type: 'Feature',
      properties: { id: '05358', name: 'Düren', regbez_id: '053', type: 'kreis' },
      geometry: square(6.3, 50.7),
    },
  ],
};

/** Gemeinden des Kreises Düren (Ebene Stadt), wie loadGemeinden sie liefert. */
const dueren: RegionCollection = {
  type: 'FeatureCollection',
  features: ['05358008', '05358024'].map((id, i) => ({
    type: 'Feature',
    properties: { id, name: i ? 'Jülich' : 'Düren', kreis_id: '05358', regbez_id: '053', type: 'gemeinde' },
    geometry: square(6.3 + i * 0.5, 50.7),
  })),
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

const schools: School[] = [
  school('900001', '05111', 6.8, 51.25),
  school('900002', '05315', 6.95, 50.94),
  { ...school('900003', '05358', 6.45, 50.8), gemeindeId: '05358008', city: 'Düren' },
  { ...school('900004', '05358', 6.9, 50.8), gemeindeId: '05358024', city: 'Jülich' },
];

function openMap(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['geo', 'regbez'], regbez);
  client.setQueryData(['geo', 'kreis'], regions);
  client.setQueryData(['schools'], schools);
  client.setQueryData(['geo', 'gemeinden', '05358'], dueren);
  client.setQueryData(
    ['schools', 'directory'],
    [
      {
        ...school('199916', '05111', 6.90098, 51.14707),
        name: 'Städtische Gesamtschule Stettiner Straße',
        city: 'Düsseldorf',
      },
      { ...school('199917', '05358', 6.46, 50.81), gemeindeId: '05358008', city: 'Düren' },
    ],
  );
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
  extraVotes.clear();
  liveCountCalls = 0;
  Element.prototype.scrollIntoView = vi.fn();
});

function openTopicDialog() {
  fireEvent.click(screen.getByRole('button', { name: /^Thema: / }));
  return screen.getByRole('dialog', { name: 'Thema wählen' });
}

describe('map topic filter', () => {
  it('restores a shared topic URL and changes map data without reloading', async () => {
    const router = openMap('/map?topic=ai&mode=mood');
    expect(screen.getByRole('button', { name: 'Thema: KI im Schulalltag' })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Thema: KI im Schulalltag' })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Thema: Stress & Leistungsdruck' })).toBeInTheDocument();
  });

  it('resets to overall mood while retaining other filters', async () => {
    const router = openMap('/map?topic=ai&mode=mood');
    fireEvent.click(within(openTopicDialog()).getByRole('button', { name: /Gesamt-Mood/ }));
    await waitFor(() => expect(router.state.location.search).toBe('?mode=mood'));
    expect(screen.getByRole('button', { name: 'Thema: Gesamt-Mood' })).toBeInTheDocument();
  });

  it('falls back to overall mood for an unknown topic', () => {
    openMap('/map?topic=unknown');
    expect(screen.getByRole('button', { name: 'Thema: Gesamt-Mood' })).toBeInTheDocument();
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
        ['05358', false],
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

  it('navigates up via breadcrumb, the back arrow and browser back', async () => {
    const router = openMap('/map?topic=ai&regbez=053&kreis=05315');
    expect(crumbs().getByText('Stadt Köln')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reg.-Bez. Köln' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai&regbez=053'));

    // ← führt eine Ebene hoch: vom Regierungsbezirk nach NRW
    fireEvent.click(screen.getByRole('button', { name: 'Eine Ebene zurück' }));
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

  it('shows schools only from city level on: none on NRW or regbez, all of a kreisfreie Stadt', async () => {
    const router = openMap('/map');
    expect(schoolButtons()).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Fläche 053' }));
    await waitFor(() => expect(router.state.location.search).toBe('?regbez=053'));
    expect(schoolButtons()).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Fläche 05315' }));
    await waitFor(() => expect(router.state.location.search).toBe('?regbez=053&kreis=05315'));
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
    // Auf Bezirksebene noch keine Schulen (erst ab Stadt)
    expect(aggregateCalls).not.toContainEqual(expect.objectContaining({ level: 'school' }));
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

describe('directory search focus', () => {
  it('zooms to the selected real school and enables 3D', async () => {
    openMap('/map');
    const search = screen.getByRole('searchbox', { name: 'Schule oder Stadt suchen' });
    fireEvent.change(search, { target: { value: 'Stettiner' } });
    fireEvent.click(await screen.findByRole('button', { name: /Stettiner/ }));
    await waitFor(() => {
      const focus = JSON.parse(screen.getByTestId('map-focus').textContent!) as number[][];
      expect(focus[0]![0]).toBeCloseTo(6.90098 - 0.0025 * 1.6, 5);
      expect(focus[0]![1]).toBeCloseTo(51.14707 - 0.0025, 5);
    });
    expect(screen.getByTestId('map-3d')).toHaveTextContent('true');
  });
});

describe('map search', () => {
  it('finds a school and opens it directly on the map', async () => {
    const router = openMap('/map');
    const search = screen.getByRole('searchbox', { name: 'Schule oder Stadt suchen' });
    fireEvent.change(search, { target: { value: '900002' } });

    fireEvent.click(await screen.findByRole('button', { name: /Schule 900002/ }));
    await waitFor(() => expect(router.state.location.search).toBe('?regbez=053&kreis=05315&school=900002'));
    expect(screen.getByTestId('map-selected-school')).toHaveTextContent('900002');
    expect(crumbs().getByText('Schule 900002', { selector: '[aria-current]' })).toBeInTheDocument();
  });

  it('jumps to a city and shows its schools', async () => {
    const router = openMap('/map');
    const search = screen.getByRole('searchbox', { name: 'Schule oder Stadt suchen' });
    fireEvent.change(search, { target: { value: 'Testort' } });

    const cityGroup = await screen.findByRole('region', { name: 'Städte' });
    fireEvent.click(within(cityGroup).getByRole('button', { name: /Testort/ }));
    // Kreisfreie Stadt: Kreis = Stadt, die Schulen erscheinen direkt
    await waitFor(() => expect(router.state.location.search).toBe('?regbez=051&kreis=05111'));
    expect(screen.getByTestId('map-selected')).toHaveTextContent('05111');
    expect(screen.getAllByRole('button', { name: /^Schule / }).map((button) => button.textContent)).toEqual([
      'Schule 900001',
    ]);
  });

  it('jumps into the Gemeinde of a city in a Kreis', async () => {
    const router = openMap('/map');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Schule oder Stadt suchen' }), {
      target: { value: 'Jülich' },
    });
    const cityGroup = await screen.findByRole('region', { name: 'Städte' });
    fireEvent.click(within(cityGroup).getByRole('button', { name: /Jülich/ }));
    await waitFor(() =>
      expect(router.state.location.search).toBe('?regbez=053&kreis=05358&gemeinde=05358024'),
    );
    expect(screen.getAllByRole('button', { name: /^Schule / }).map((b) => b.textContent)).toEqual([
      'Schule 900004',
    ]);
  });
});

describe('Ebene Stadt/Gemeinde', () => {
  const schoolButtons = () => screen.queryAllByRole('button', { name: /^Schule / }).map((b) => b.textContent);

  it('shows the Gemeinden of a Kreis with their own aggregates, without schools', async () => {
    openMap('/map?regbez=053&kreis=05358');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Fläche 05358008' })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Fläche 05358' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fläche 05315' })).toBeInTheDocument();
    await waitFor(() =>
      expect(aggregateCalls).toContainEqual(
        expect.objectContaining({ level: 'gemeinde', parentId: '05358' }),
      ),
    );
    expect(schoolButtons()).toEqual([]);
    expect(screen.getByTestId('map-directory')).toBeEmptyDOMElement();
  });

  it('opens a Gemeinde: its schools, grey directory locations and a breadcrumb step', async () => {
    const router = openMap('/map?regbez=053&kreis=05358');
    fireEvent.click(await screen.findByRole('button', { name: 'Fläche 05358008' }));
    await waitFor(() =>
      expect(router.state.location.search).toBe('?regbez=053&kreis=05358&gemeinde=05358008'),
    );
    expect(schoolButtons()).toEqual(['Schule 900003']);
    await waitFor(() => expect(screen.getByTestId('map-directory')).toHaveTextContent('199917'));
    expect(aggregateCalls).toContainEqual(expect.objectContaining({ level: 'school', parentId: '05358008' }));
    expect(crumbs().getByText('Düren', { selector: '[aria-current]' })).toBeInTheDocument();
  });

  it('hides all schools without values when switched off in the filter (?standorte=aus)', async () => {
    // 900003 hat im Fake keine Werte → mit dem Schalter aus bleibt die Stadt ohne Punkte
    openMap('/map?regbez=053&kreis=05358&gemeinde=05358008&standorte=aus');
    await screen.findByRole('complementary', { name: 'Details: Düren' });
    expect(schoolButtons()).toEqual([]);
    expect(screen.getByTestId('map-directory')).toBeEmptyDOMElement();
  });

  it('never shows a school twice (directory entry of a school that already has a marker)', async () => {
    openMap('/map?regbez=053&kreis=05358&gemeinde=05358008');
    await waitFor(() => expect(schoolButtons()).toEqual(['Schule 900003']));
    expect(screen.getByTestId('map-directory')).not.toHaveTextContent('900003');
  });
});

describe('3D toggle (#153)', () => {
  it('toggles the map between 2D and 3D without auto-pitch', () => {
    openMap('/map');
    const button = screen.getByRole('button', { name: '3D-Ansicht umschalten' });
    expect(button).toHaveTextContent('3D');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('map-3d')).toHaveTextContent('false');
    fireEvent.click(button);
    expect(button).toHaveTextContent('2D');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('map-3d')).toHaveTextContent('true');
  });
});

describe('release view (#295)', () => {
  it('shows only topic and search by default and reveals the rest with ?erweitert=1', () => {
    openMap('/map');
    expect(screen.queryByRole('radio', { name: 'Trend' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Live' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeInTheDocument();
    cleanup();
    openMap('/map?erweitert=1');
    expect(screen.getByRole('radio', { name: 'Trend' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
  });

  it('keeps advanced controls visible while a mode is active via URL', () => {
    openMap('/map?mode=trend');
    expect(screen.getByRole('radio', { name: 'Trend' })).toBeChecked();
  });
});

describe('live mode (#24)', () => {
  it('toggles via ?live=1 without a history entry', async () => {
    const router = openMap('/map?topic=ai&erweitert=1');
    fireEvent.click(screen.getByRole('button', { name: 'Live' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai&erweitert=1&live=1'));
    expect(router.state.historyAction).toBe('REPLACE');
    expect(screen.getByRole('button', { name: 'Live' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('wartet auf Stimmen …')).toBeInTheDocument();
  });

  it('pulses a school and counts votes when its n grows, even on NRW level', async () => {
    openMap('/map?live=1');
    await waitFor(() => expect(liveCountCalls).toBeGreaterThan(0));
    // Kein NRW-weiter Poll aller Schul-Aggregate mehr (#253)
    expect(aggregateCalls).not.toContainEqual(expect.objectContaining({ level: 'school', topic: 'all' }));
    expect(screen.getByTestId('map-pulses')).toBeEmptyDOMElement();
    // Erst die Basis (n = 50) ankommen lassen – sonst sieht der Diff nur den Endstand
    await waitFor(() => expect(screen.getByTestId('map-data')).toHaveTextContent('"score"'));
    await act(async () => {});

    extraVotes.set('900002', 2);
    act(() => liveCallback?.());
    await waitFor(() => expect(screen.getByTestId('map-pulses')).toHaveTextContent('900002'));
    expect(screen.getByText('+2 neue Stimmen')).toBeInTheDocument();
  });
});

describe('early-warning radar mode (#42)', () => {
  const mapData = () => JSON.parse(screen.getByTestId('map-data').textContent!) as RegionCollection;
  const tensionOf = (id: string) =>
    (mapData().features.find((f) => f.properties.id === id)?.properties as { tension?: string } | undefined)
      ?.tension;

  afterEach(() => {
    useRoleStore.setState({ role: 'student' });
  });

  it('switches to radar via ?mode=radar, hides the topic filter and colors regions by tension level', async () => {
    const router = openMap('/map?topic=ai&erweitert=1');
    fireEvent.click(screen.getByRole('radio', { name: 'Frühwarn-Radar' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai&erweitert=1&mode=radar'));
    expect(screen.queryByRole('button', { name: 'KI im Schulalltag' })).not.toBeInTheDocument();
    await waitFor(() => expect(tensionOf('053')).toBe('talk'));
    expect(tensionOf('051')).toBe('stable');
    expect(screen.getByRole('group', { name: 'Legende Frühwarn-Radar' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Stimmung' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai&erweitert=1'));
  });

  it('shows index, drivers and the publish-answer link in the panel', async () => {
    openMap('/map?mode=radar&regbez=053&kreis=05315');
    const panel = await screen.findByRole('complementary', { name: 'Details: Stadt Köln' });
    const radar = await within(panel).findByRole('region', { name: 'Frühwarn-Radar' });
    expect(within(radar).getByText('64 · Gespräch suchen')).toBeInTheDocument();
    expect(within(radar).getByText('Dialogrunde mit den Schülervertretungen anbieten')).toBeInTheDocument();
    expect(within(radar).getByRole('link', { name: /Antwort veröffentlichen/ })).toHaveAttribute(
      'href',
      '/dashboard?publish=1&scope=kreis&region=05315&topic=voice',
    );
  });

  it('shows school markers in radar mode only for the ministry', async () => {
    const schoolButtons = () => screen.queryAllByRole('button', { name: /^Schule / });
    openMap('/map?mode=radar&regbez=053&kreis=05315');
    await screen.findByRole('complementary');
    expect(schoolButtons()).toHaveLength(0);
  });

  it('shows tension per school for the ministry', async () => {
    useRoleStore.setState({ role: 'ministry' });
    openMap('/map?mode=radar&regbez=053&kreis=05315&school=900002');
    const panel = await screen.findByRole('complementary', { name: 'Details: Schule 900002' });
    expect(await within(panel).findByText('64 · Gespräch suchen')).toBeInTheDocument();
  });
});

describe('trend and participation modes (#21)', () => {
  const props = (id: string) =>
    (JSON.parse(screen.getByTestId('map-data').textContent!) as RegionCollection).features.find(
      (f) => f.properties.id === id,
    )?.properties as unknown as { tdelta: number; rate: number };

  it('keeps the topic filter for trend and passes the delta to the map', async () => {
    const router = openMap('/map?topic=ai&erweitert=1');
    fireEvent.click(screen.getByRole('radio', { name: 'Trend' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai&erweitert=1&mode=trend'));
    expect(screen.getByRole('button', { name: 'Thema: KI im Schulalltag' })).toBeInTheDocument();
    await waitFor(() => expect(props('053').tdelta).toBe(-6));
    expect(props('051').tdelta).toBe(-999);
    expect(screen.getByRole('group', { name: 'Legende Trend zur Vorwoche' })).toBeInTheDocument();
  });

  it('computes participation from votes and student counts and hides the topic filter', async () => {
    openMap('/map?mode=participation&regbez=053');
    expect(screen.queryByRole('button', { name: /^Thema: / })).not.toBeInTheDocument();
    // Kreis 05315: 50 Stimmen bei einer Schule mit 500 Schüler:innen → 10 %
    await waitFor(() => expect(props('05315').rate).toBe(10));
    expect(screen.getByRole('group', { name: 'Legende Beteiligung diese Woche' })).toBeInTheDocument();
  });
});

describe('live data labelling (#160)', () => {
  it('marks units with real votes as live and everything else as demo data', async () => {
    openMap('/map?regbez=053&kreis=05315');
    const live = await screen.findByRole('complementary', { name: 'Details: Stadt Köln' });
    expect(await within(live).findByText('Live-Stimmen')).toBeInTheDocument();
  });

  it('shows no live badge and the source note without real votes', async () => {
    openMap('/map?regbez=053');
    const panel = await screen.findByRole('complementary', { name: 'Details: Reg.-Bez. Köln' });
    expect(within(panel).queryByText('Live-Stimmen')).not.toBeInTheDocument();
    expect(screen.getByText(/Anonyme Live-Befragung/)).toBeInTheDocument();
  });
});

describe('more filters (#20)', () => {
  it('applies school form, grade and period to the queries and keeps them in the URL', async () => {
    const router = openMap('/map?topic=ai&erweitert=1');
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    const dialog = screen.getByRole('dialog', { name: 'Filter' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gymnasium' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai&erweitert=1&form=gymnasium'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Klasse 8–10' }));
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Letzte 4 Wochen' }));
    await waitFor(() =>
      expect(router.state.location.search).toBe(
        '?topic=ai&erweitert=1&form=gymnasium&grade=8-10&period=month',
      ),
    );
    await waitFor(() =>
      expect(aggregateCalls).toContainEqual(
        expect.objectContaining({
          level: 'regbez',
          schoolForm: ['gymnasium'],
          gradeBand: ['8-10'],
          waveIds: ['2026-W40', '2026-W41', '2026-W42', '2026-W43'],
        }),
      ),
    );
    expect(screen.getByRole('button', { name: 'Filter (3 aktiv)' })).toBeInTheDocument();
    expect(screen.getByText(/gefiltert/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Zurücksetzen' }));
    await waitFor(() => expect(router.state.location.search).toBe('?topic=ai&erweitert=1'));
  });

  it('hides school markers of other school forms', async () => {
    openMap('/map?regbez=053&form=realschule');
    // Beide Testschulen sind Gymnasien
    await screen.findByRole('complementary');
    expect(screen.queryAllByRole('button', { name: /^Schule / })).toHaveLength(0);
  });

  it('offers the filter also in modes without topic bar', () => {
    openMap('/map?mode=radar');
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
  });
});

describe('lazy school data (#250)', () => {
  it('keeps the plain NRW start view free of school requests', () => {
    expect(needsSchoolData(new URLSearchParams(''), 'mood', false)).toBe(false);
    // Bezirksebene zeigt nur Kreisflächen (Schulen erst ab Stadt)
    expect(needsSchoolData(new URLSearchParams('regbez=053'), 'mood', false)).toBe(false);
    expect(needsSchoolData(new URLSearchParams('topic=stress&period=month'), 'mood', false)).toBe(false);
  });

  const needed: [string, 'mood' | 'participation', boolean][] = [
    ['kreis=05315', 'mood', false],
    ['regbez=053&kreis=05358&gemeinde=05358008', 'mood', false],
    ['school=900002&kreis=05315&regbez=053', 'mood', false],
    ['live=1', 'mood', false],
    ['', 'participation', false],
    ['', 'mood', true],
  ];
  it.each(needed)('needs school data for %s (%s, search open: %s)', (search, mode, searchOpen) => {
    expect(needsSchoolData(new URLSearchParams(search), mode, searchOpen)).toBe(true);
  });

  it('does not fetch schools on the plain NRW view', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['geo', 'regbez'], regbez);
    client.setQueryData(['geo', 'kreis'], regions);
    const router = createMemoryRouter([{ path: '/map', element: <MapPage /> }], {
      initialEntries: ['/map'],
    });
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    await screen.findByText('Moodmap NRW');
    // Die Query ist angelegt, aber deaktiviert: kein Request, kein Fehler trotz fehlendem getSchools-Mock.
    expect(client.getQueryState(['schools'])?.status).toBe('pending');
    expect(client.getQueryState(['schools'])?.fetchStatus).toBe('idle');
  });
});

describe('timeline (#34)', () => {
  it('queries a single week chosen on the timeline and keeps it in the URL', async () => {
    // Die Zeitachse gibt es im Trend-Modus (dort zählen Wochen)
    const router = openMap('/map?topic=stress&period=month&mode=trend');
    const slider = await screen.findByRole('slider', { name: 'Woche wählen' });
    // Schuljahr ab KW 35 → Index 6 = KW 41
    fireEvent.change(slider, { target: { value: '6' } });
    await waitFor(() =>
      expect(router.state.location.search).toBe('?topic=stress&period=month&mode=trend&wave=2026-W41'),
    );
    expect(router.state.historyAction).toBe('REPLACE');
    await waitFor(() =>
      expect(aggregateCalls).toContainEqual(
        expect.objectContaining({ level: 'regbez', topic: 'stress', waveIds: ['2026-W41'] }),
      ),
    );
    expect(screen.getByText(/· KW 41/)).toBeInTheDocument();
  });
});

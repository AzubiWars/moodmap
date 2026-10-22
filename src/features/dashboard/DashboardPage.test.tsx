import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { clearDataSources, registerDataSource } from '@/data';
import type { DataSource } from '@/data/api';
import type { AggregateQuery, AggregateRow, MoodDistribution, Topic } from '@/types';
import { DashboardPage } from './DashboardPage';

const topic = (slug: string, title: string, icon: string, sort: number): Topic => ({
  slug,
  title,
  icon,
  sort,
  audience: ['student'],
  mandatory: false,
  priority: 'P0',
});

const TOPICS = [
  topic('ai', 'KI im Schulalltag', '🤖', 1),
  topic('stress', 'Stress & Leistungsdruck', '😮‍💨', 2),
  topic('food', 'Mensa & Pausen', '🍝', 3),
];

const DIST: Record<string, MoodDistribution | null> = {
  ai: { 1: 30, 2: 28, 3: 21, 4: 15, 5: 6 }, // 58 % unzufrieden · 21 % zufrieden
  stress: { 1: 10, 2: 20, 3: 40, 4: 20, 5: 10 },
  food: null, // unter K_MIN
};

function row(id: string, query: AggregateQuery): AggregateRow {
  const gym = query.schoolForm?.[0] === 'gymnasium';
  if (query.topic === 'all') return { id, n: id === 'nrw' ? 100 : 50, score: 50, delta: -2 };
  if (query.topic === 'food') return { id, n: 2, score: null, delta: null, distribution: null };
  return {
    id,
    n: 50,
    score: query.topic === 'ai' ? 35 : 50,
    delta: query.topic === 'ai' ? -4 : 1,
    distribution: gym ? { 1: 40, 2: 30, 3: 20, 4: 10, 5: 0 } : DIST[query.topic]!,
  };
}

const fake = {
  getTopics: async () => TOPICS,
  getCurrentWave: async () => ({ id: '2026-W43', startsAt: '', endsAt: '' }),
  getAggregates: async (query: AggregateQuery) => {
    if (query.level === 'school')
      return [1, 2, 3].map((i) => ({ id: `s${i}`, n: i === 3 ? 0 : 5, score: null, delta: null }));
    if (query.schoolForm && !['gymnasium', 'realschule'].includes(query.schoolForm[0]!)) return [];
    return (query.level === 'nrw' ? ['nrw'] : ['051', '053']).map((id) => row(id, query));
  },
  subscribeToNewResponses: () => () => {},
} as unknown as DataSource;

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage – Lagebild NRW', () => {
  beforeEach(() => registerDataSource('mock', fake));
  afterEach(() => clearDataSources());

  it('zeigt KPIs, Brennpunkte und Prozentwerte als Text', async () => {
    renderPage();
    expect(await screen.findByText('Teilnahmen')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // Teilnahmen aus der NRW-Zeile
    expect(screen.getByText('2')).toBeInTheDocument(); // Schulen mit n > 0

    const hotspots = screen.getByRole('region', { name: /Brennpunkt-Themen/ });
    const links = within(hotspots).getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/map?topic=ai');
    expect(within(links[0]!).getByText('58 % unzufrieden')).toBeInTheDocument();
    expect(within(links[0]!).getByText('· 100 Stimmen')).toBeInTheDocument();

    const percent = screen.getByRole('region', { name: 'Themen in Prozent' });
    expect(
      within(percent).getByRole('img', { name: '58 % unzufrieden, 21 % teils-teils, 21 % zufrieden' }),
    ).toBeInTheDocument();
  });

  it('zeigt unter K_MIN keine Werte, sondern „zu wenige Daten“', async () => {
    renderPage();
    const percent = await screen.findByRole('region', { name: 'Themen in Prozent' });
    const food = within(percent).getByText('Mensa & Pausen').closest('li')!;
    expect(within(food).getByText('zu wenige Daten')).toBeInTheDocument();
    expect(within(food).queryByText(/%/)).toBeNull();
    // Food taucht weder in den Brennpunkten noch in der Themenauswahl des Vergleichs auf.
    expect(
      within(screen.getByRole('region', { name: /Brennpunkt/ })).queryByText('Mensa & Pausen'),
    ).toBeNull();
    expect(screen.queryByRole('option', { name: /Mensa/ })).toBeNull();
  });

  it('renders a labelled rule-based report', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Lagebericht erstellen' }));
    expect(screen.getByText('Regelbasiert · aus Live-Aggregaten')).toBeInTheDocument();
    expect(screen.getByText(/Hier sollte zuerst ein Dialogformat/)).toBeInTheDocument();
  });

  it('vergleicht Schulformen für das Story-Thema Stress', async () => {
    renderPage();
    const comparison = await screen.findByRole('region', { name: 'Vergleich' });
    expect(within(comparison).getByRole('combobox')).toHaveValue('stress');
    const gym = (await within(comparison).findByText('Gymnasium')).closest('li')!;
    expect(within(gym).getByText('70 % unzufrieden')).toBeInTheDocument();
    expect(within(comparison).getByText('Realschule')).toBeInTheDocument();
    // Schulformen ohne Teilnahmen werden nicht gezeigt.
    expect(within(comparison).queryByText('Hauptschule')).toBeNull();
  });
});

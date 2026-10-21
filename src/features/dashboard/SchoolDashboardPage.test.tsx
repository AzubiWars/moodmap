import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearDataSources, registerDataSource } from '@/data';
import type { DataSource } from '@/data/api';
import { useParticipantStore } from '@/store/participant';
import { useRoleStore } from '@/store/role';
import type { AggregateQuery, AggregateRow, School, Topic } from '@/types';
import { SchoolDashboardPage } from './SchoolDashboardPage';
import { SchoolPosterPage } from './SchoolPosterPage';

const school = {
  id: '111',
  name: 'Testgymnasium',
  city: 'Köln',
  schoolForm: 'gymnasium',
  kreisId: '05315',
  joinCode: 'ABC123',
} as School;

const topics: Topic[] = [
  {
    slug: 'ai',
    title: 'KI im Schulalltag',
    icon: '🤖',
    audience: ['student'],
    mandatory: true,
    sort: 1,
    priority: 'P0',
  },
  {
    slug: 'food',
    title: 'Mensa & Pausen',
    icon: '🥪',
    audience: ['student'],
    mandatory: false,
    sort: 2,
    priority: 'P1',
  },
];

function source(own: AggregateRow): DataSource {
  return {
    getSchoolByCode: async (code: string) => (code === 'ABC123' ? school : null),
    getCurrentWave: async () => ({ id: '2026-W43', startsAt: '2026-10-19', endsAt: '2026-10-25' }),
    getTopics: async () => topics,
    getAggregates: async (query: AggregateQuery) =>
      query.level === 'nrw'
        ? [{ id: 'nrw', n: 300, score: 60, delta: 0, topicScores: { ai: 50, food: 55 } }]
        : [own, { id: '999', n: 50, score: 11, delta: 0, topicScores: { ai: 11, food: 11 } }],
    getTrend: async () => [
      { id: '111', waveId: '2026-W42', n: 20, score: 60 },
      { id: '111', waveId: '2026-W43', n: 20, score: 66 },
    ],
    subscribeToNewResponses: () => () => {},
  } as unknown as DataSource;
}

const ENOUGH: AggregateRow = { id: '111', n: 20, score: 66, delta: 3, topicScores: { ai: 40, food: null } };

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard/school" element={<SchoolDashboardPage />} />
          <Route path="/dashboard/school/poster" element={<SchoolPosterPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SchoolDashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useRoleStore.setState({ role: 'school' });
    useParticipantStore.getState().reset();
    useParticipantStore.getState().setSchool({ id: '111', code: 'ABC123', name: 'Testgymnasium' });
  });
  afterEach(() => clearDataSources());

  it('shows the own school against the average of its school form, per topic', async () => {
    registerDataSource('mock', source(ENOUGH));
    renderAt('/dashboard/school');

    expect(await screen.findByRole('heading', { level: 1, name: 'Testgymnasium' })).toBeInTheDocument();
    expect(await screen.findByText('Ø Schulform Gymnasium')).toBeInTheDocument();
    expect(screen.getByText(/▲ 6 Punkte über dem Ø/)).toBeInTheDocument();
    // Thema ohne Wert der Schule: „zu wenige Daten“ statt einer Zahl; Thema mit Wert: Zahl + Ø.
    expect(screen.getByText('Ihre Schule: 40 · Ø Gymnasium: 50')).toBeInTheDocument();
    expect(screen.getByText(/^zu wenige Daten · Ø Gymnasium: 55$/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /KW 42: 60; KW 43: 66/ })).toBeInTheDocument();
    // Datenschutz: andere Schulen (Score 11) tauchen nirgends auf.
    expect(screen.queryByText(/11/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'QR-Plakat drucken' })).toHaveAttribute(
      'href',
      '/dashboard/school/poster',
    );
  });

  it('shows "zu wenige Daten" instead of numbers when the school is below K_MIN', async () => {
    registerDataSource(
      'mock',
      source({ id: '111', n: 4, score: null, delta: null, topicScores: { ai: null, food: null } }),
    );
    renderAt('/dashboard/school');

    expect(await screen.findByText(/Werte erst ab 10 Stimmen$/)).toBeInTheDocument();
    expect(screen.queryByText(/▲|▼/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/zu wenige Daten/).length).toBeGreaterThanOrEqual(4);
  });

  it('is only available in the "Schule" view and offers to switch', async () => {
    useRoleStore.setState({ role: 'student' });
    registerDataSource('mock', source(ENOUGH));
    renderAt('/dashboard/school');

    expect(screen.getByRole('heading', { name: 'Diese Ansicht ist für Schulen' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ansicht „Schule“ wählen' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Testgymnasium' })).toBeInTheDocument();
    expect(useRoleStore.getState().role).toBe('school');
  });
});

describe('SchoolPosterPage', () => {
  beforeEach(() => {
    useRoleStore.setState({ role: 'school' });
    useParticipantStore.getState().reset();
    registerDataSource('mock', source(ENOUGH));
  });
  afterEach(() => clearDataSources());

  it('prints the school name and a QR code that opens the join link of the school', async () => {
    renderAt('/dashboard/school/poster?code=abc123');

    const poster = await screen.findByRole('article', { name: 'QR-Plakat Testgymnasium' });
    expect(poster).toHaveTextContent('Wie geht’s dir?');
    expect(poster).toHaveTextContent('Scan mich!');
    expect(poster).toHaveTextContent(`${window.location.origin}/s/ABC123`);
    expect(screen.getByTitle(`QR-Code zu ${window.location.origin}/s/ABC123`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plakat drucken' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zurück zum Schul-Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard/school?code=abc123',
    );
  });

  it('rejects unknown school codes', async () => {
    renderAt('/dashboard/school/poster?code=NOPE');
    expect(await screen.findByText('Diesen Schulcode kennen wir nicht')).toBeInTheDocument();
  });
});

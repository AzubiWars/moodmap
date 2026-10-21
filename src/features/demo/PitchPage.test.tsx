import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PitchAggregate } from '@/types';
import { PitchPage, PITCH_POLL_MS } from './PitchPage';
import { PitchEntry } from './PitchEntry';

const mocks = vi.hoisted(() => ({
  source: {
    getPitchAggregate: vi.fn(),
    getFreetextClusters: vi.fn(),
    resetPitchTest: vi.fn(),
    subscribeToNewResponses: vi.fn(),
  },
  mockSource: {},
  local: false,
}));
vi.mock('@/data', () => ({
  getDataSource: (mode?: string) => (mode === 'mock' && !mocks.local ? mocks.mockSource : mocks.source),
}));
vi.mock('./PitchLocationMap', () => ({
  PitchLocationMap: ({ score }: { score: number | null }) => (
    <p data-testid="pitch-map-score">{score ?? 'masked'}</p>
  ),
}));

const initial: PitchAggregate = {
  school: {
    id: 'pitch-test',
    name: 'Teststandort',
    city: 'Berlin',
    lat: 52.52,
    lon: 13.405,
    isTest: true,
    joinCode: 'CUSTOM42',
  },
  waveId: '2026-W43',
  n: 9,
  scoredN: 9,
  score: null,
  topicScores: {},
};
let row: PitchAggregate;
const clients: QueryClient[] = [];
function open(element = <PitchPage />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mocks.local = false;
  row = structuredClone(initial);
  mocks.source.getPitchAggregate.mockImplementation(async () => row);
  mocks.source.getFreetextClusters.mockResolvedValue([]);
  mocks.source.subscribeToNewResponses.mockReturnValue(() => {});
  mocks.source.resetPitchTest.mockImplementation(async () => {
    row = { ...initial, n: 0, scoredN: 0 };
    return { ok: true };
  });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.useRealTimers();
});

describe('Pitch projector', () => {
  it('shows the configured QR link and masks all score displays until ten scored participants', async () => {
    row = { ...initial, n: 12, score: 90, topicScores: { stress: 90 } };
    open();
    expect(await screen.findByText('Noch 1 Stimme bis zur ersten Auswertung')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Teilnahmen' })).getByText('12')).toBeInTheDocument();
    expect(screen.getByTestId('pitch-map-score')).toHaveTextContent('masked');
    expect(screen.queryByText('Stress & Leistungsdruck')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /\/s\/CUSTOM42$/ })).toHaveAttribute(
      'href',
      `${window.location.origin}/s/CUSTOM42`,
    );
    expect(mocks.source.getFreetextClusters).toHaveBeenCalledWith({ level: 'school', id: 'pitch-test' });
  });

  it('polls at 2.5 seconds and unmasks the board at the threshold', async () => {
    vi.useFakeTimers();
    open();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByText('Noch 1 Stimme bis zur ersten Auswertung')).toBeInTheDocument();
    row = {
      ...initial,
      n: 10,
      scoredN: 10,
      score: 73,
      topicScores: { stress: 22, voice: 30, ai: 55, learning: 80 },
    };
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PITCH_POLL_MS);
    });
    expect(mocks.source.getPitchAggregate).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('pitch-map-score')).toHaveTextContent('73');
    expect(screen.getByText('Stress & Leistungsdruck')).toBeInTheDocument();
    expect(screen.queryByText('Lernstoff & Unterricht')).not.toBeInTheDocument();
    expect(screen.queryByText(/bis zur ersten Auswertung/)).not.toBeInTheDocument();
  });

  it('marks cached values stale when polling fails instead of substituting mock results', async () => {
    vi.useFakeTimers();
    open();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    mocks.source.getPitchAggregate.mockRejectedValue(new Error('private backend error'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PITCH_POLL_MS + 1_100);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Die Aktualisierung ist unterbrochen.');
    expect(screen.getByText(/letzten erfolgreichen Abruf/)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Teilnahmen' })).getByText('9')).toBeInTheDocument();
    expect(screen.queryByText('private backend error')).not.toBeInTheDocument();
  });

  it('suppresses small clusters and renders moderated examples as text with at most two examples', async () => {
    const example = '<img src=x onerror=alert(1)>';
    mocks.source.getFreetextClusters.mockResolvedValue([
      { cluster: 'Zu klein', count: 9, topics: [], examples: ['Unsichtbar'] },
      {
        cluster: 'Pausen',
        count: 10,
        topics: ['stress'],
        examples: [example, 'Mehr Pausen.', 'Drittes Beispiel'],
      },
    ]);
    open();
    expect(await screen.findByText('10 Nennungen')).toBeInTheDocument();
    expect(screen.queryByText('Zu klein')).not.toBeInTheDocument();
    expect(screen.getByText(`„${example}“`)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.queryByText(/Drittes Beispiel/)).not.toBeInTheDocument();
  });

  it('clears the PIN after one request, refetches the round and leaves no PIN in cache or storage', async () => {
    const client = open();
    await screen.findByText('Noch 1 Stimme bis zur ersten Auswertung');
    fireEvent.click(screen.getByRole('button', { name: 'Pitch-Test zurücksetzen' }));
    fireEvent.change(screen.getByLabelText('Admin-PIN'), { target: { value: 'synthetic-admin-pin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pitch-Runde endgültig löschen' }));
    expect(
      await screen.findByText('Pitch-Test zurückgesetzt. Du kannst erneut teilnehmen.'),
    ).toBeInTheDocument();
    expect(mocks.source.resetPitchTest).toHaveBeenCalledExactlyOnceWith('synthetic-admin-pin');
    await waitFor(() =>
      expect(within(screen.getByRole('region', { name: 'Teilnahmen' })).getByText('0')).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText('Admin-PIN')).not.toBeInTheDocument();
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((query) => query.state.data),
      ),
    ).not.toContain('synthetic-admin-pin');
    expect(JSON.stringify(localStorage)).not.toContain('synthetic-admin-pin');
  });

  it('keeps the round when reset is denied and never exposes the rejected PIN', async () => {
    mocks.source.resetPitchTest.mockResolvedValue({ ok: false });
    open();
    await screen.findByText('Noch 1 Stimme bis zur ersten Auswertung');
    fireEvent.click(screen.getByRole('button', { name: 'Pitch-Test zurücksetzen' }));
    fireEvent.change(screen.getByLabelText('Admin-PIN'), { target: { value: 'wrong-secret-pin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pitch-Runde endgültig löschen' }));
    expect(
      await screen.findByText('Zurücksetzen fehlgeschlagen. Bitte PIN und Verbindung prüfen.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Admin-PIN')).toHaveValue('');
    expect(within(screen.getByRole('region', { name: 'Teilnahmen' })).getByText('9')).toBeInTheDocument();
  });

  it('explains the local fallback and resets it without claiming PIN authentication', async () => {
    mocks.local = true;
    open();
    expect(await screen.findByText(/Nur Tabs desselben Browsers/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pitch-Test zurücksetzen' }));
    expect(screen.queryByLabelText('Admin-PIN')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pitch-Runde endgültig löschen' }));
    await screen.findByText('Pitch-Test zurückgesetzt. Du kannst erneut teilnehmen.');
    expect(mocks.source.resetPitchTest).toHaveBeenCalledExactlyOnceWith('');
  });

  it('offers the Beamer and verified Pitch QR on /demo without polling there', async () => {
    open(<PitchEntry />);
    expect(await screen.findByRole('link', { name: `${window.location.origin}/s/CUSTOM42` })).toHaveAttribute(
      'href',
      `${window.location.origin}/s/CUSTOM42`,
    );
    expect(screen.getByRole('link', { name: 'Beamer-Ansicht öffnen' })).toHaveAttribute('href', '/demo/live');
    expect(mocks.source.getFreetextClusters).not.toHaveBeenCalled();
  });
});

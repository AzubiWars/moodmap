import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useAggregates, useTension } from './useAggregates';

const { getAggregates, getTensionIndex } = vi.hoisted(() => ({
  getAggregates: vi.fn(),
  getTensionIndex: vi.fn(),
}));

vi.mock('@/data', () => ({
  getDataSource: () => ({ getAggregates, getTensionIndex }),
}));

const POLL_MS = 1_000;

/** Fokus-Refetch ausschalten: hier zählt nur, was der Poll-Intervall auslöst. */
function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
}

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

/** Ein Intervall-Durchlauf mit auflaufenden Promises, damit Folgerefetches zählbar sind. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  getAggregates.mockReset().mockResolvedValue([{ id: 'nrw', n: 50, score: 60 }]);
  getTensionIndex.mockReset().mockResolvedValue([{ id: 'nrw', index: 40, level: 'stable' }]);
  focusManager.setFocused(true);
});

afterEach(() => {
  focusManager.setFocused(undefined);
  vi.useRealTimers();
});

it('polls aggregates while the tab is visible and pauses in the background (#251)', async () => {
  const client = createClient();
  renderHook(() => useAggregates('nrw', 'all', { refetchInterval: POLL_MS }), {
    wrapper: wrapper(client),
  });

  await advance(0);
  expect(getAggregates).toHaveBeenCalledTimes(1);

  // Sichtbarer Tab: der nächste Tick lädt nach.
  await advance(POLL_MS);
  expect(getAggregates).toHaveBeenCalledTimes(2);

  // Hintergrund-Tab: Timer feuern weiter, aber es geht kein Request raus.
  focusManager.setFocused(false);
  await advance(POLL_MS * 5);
  expect(getAggregates).toHaveBeenCalledTimes(2);

  // Zurück im Vordergrund: das Polling läuft wieder an.
  focusManager.setFocused(true);
  await advance(POLL_MS);
  expect(getAggregates).toHaveBeenCalledTimes(3);
});

it('pauses the tension poll in the background too (#251)', async () => {
  const client = createClient();
  renderHook(() => useTension('regbez', { refetchInterval: POLL_MS }), {
    wrapper: wrapper(client),
  });

  await advance(0);
  expect(getTensionIndex).toHaveBeenCalledTimes(1);

  focusManager.setFocused(false);
  await advance(POLL_MS * 3);
  expect(getTensionIndex).toHaveBeenCalledTimes(1);
});

it('sets the background pause explicitly instead of relying on the library default (#251)', async () => {
  const client = createClient();
  renderHook(() => useAggregates('nrw', 'all', { refetchInterval: POLL_MS }), {
    wrapper: wrapper(client),
  });
  await advance(0);

  const observer = client.getQueryCache().findAll({ queryKey: ['aggregates'] })[0]?.observers[0];
  expect(observer?.options.refetchIntervalInBackground).toBe(false);
});

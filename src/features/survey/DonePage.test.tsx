import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDataSources, registerDataSource } from '@/data';
import type { DataSource } from '@/data/api';
import { useLastAnswersStore } from '@/store/lastAnswers';
import { useParticipantStore } from '@/store/participant';
import type { AggregateQuery, AggregateRow } from '@/types';
import { DonePage } from './DonePage';
import { pickComparisonTopics } from './pickTopics';

const row = (id: string, n: number, score: number | null): AggregateRow => ({ id, n, score, delta: null });

function setup(schoolRow: AggregateRow) {
  registerDataSource('mock', {
    getCurrentWave: async () => ({ id: '2026-W43', startsAt: '2026-10-19', endsAt: '2026-10-25' }),
    getSchoolByCode: async () => ({ id: '900000', kreisId: '05111' }),
    getAggregates: async (query: AggregateQuery) =>
      query.level === 'nrw' ? [row('nrw', 500, 60)] : [schoolRow],
  } as unknown as DataSource);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DonePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DonePage (#29)', () => {
  beforeEach(() => {
    localStorage.clear();
    useParticipantStore.setState({
      schoolId: '900000',
      schoolCode: 'DEMO42',
      schoolName: 'Demo',
      isTest: false,
    });
    useLastAnswersStore.setState({ answers: [{ questionId: 'wellbeing.core', value: 1 }] });
  });
  afterEach(() => {
    clearDataSources();
    vi.unstubAllGlobals();
  });

  it('shows the comparison with values only from K_MIN', async () => {
    setup(row('900000', 25, 42));
    expect(await screen.findByText('Schon 25 Stimmen an deiner Schule.')).toBeTruthy();
    expect(screen.getAllByRole('meter').length).toBe(3);
  });

  it('shows no values below K_MIN', async () => {
    setup(row('900000', 3, null));
    expect((await screen.findAllByText(/Noch zu wenige Stimmen/)).length).toBe(3);
    expect(screen.queryByRole('meter')).toBeNull();
    expect(screen.getByText('Stimmen an deiner Schule: noch unter 10.')).toBeTruthy();
  });

  it('shares via navigator.share, else copies the link', async () => {
    setup(row('900000', 25, 42));
    const share = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { share });
    fireEvent.click(await screen.findByRole('button', { name: 'Link teilen' }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${window.location.origin}/s/DEMO42` }),
    );

    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    fireEvent.click(screen.getByRole('button', { name: 'Link teilen' }));
    expect(await screen.findByText('Link kopiert')).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/s/DEMO42`);
  });
});

describe('pickComparisonTopics', () => {
  it('prefers the worst own topics and falls back to mandatory ones', () => {
    const picked = pickComparisonTopics([
      { questionId: 'wellbeing.core', value: 1 },
      { questionId: 'overall.core', value: 1 },
    ]);
    expect(picked[0]).toBe('wellbeing');
    expect(picked).not.toContain('overall');
    expect(new Set(picked).size).toBe(picked.length);
    expect(picked.length).toBe(3);
  });
});

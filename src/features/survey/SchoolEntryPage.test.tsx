import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';

import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DataSource } from '@/data/api';
import { clearDataSources, registerDataSource } from '@/data';
import { useParticipantStore } from '@/store/participant';
import type { School } from '@/types';
import { CheckPage } from './CheckPage';
import { SchoolEntryPage } from './SchoolEntryPage';

const school = { id: '123456', name: 'Testschule', city: 'Köln', joinCode: 'ABC123' } as School;

function fakeSource(): DataSource {
  return {
    getSchoolByCode: async (code: string) => (code === 'ABC123' ? school : null),
    getCurrentWave: async () => ({ id: '2026-W43', startsAt: '2026-10-19', endsAt: '2026-10-25' }),
  } as unknown as DataSource;
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/s/:schoolCode" element={<SchoolEntryPage />} />
          <Route path="/check" element={<CheckPage />} />
          <Route path="/" element={<p>Startseite</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SchoolEntryPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useParticipantStore.getState().reset();
    registerDataSource('mock', fakeSource());
  });
  afterEach(() => clearDataSources());

  it('stores the school and optional grade band, then navigates to /check', async () => {
    renderAt('/s/abc123');
    expect(await screen.findByRole('heading', { name: 'Testschule' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Oberstufe' }));
    fireEvent.click(screen.getByRole('button', { name: "Los geht's" }));

    const s = useParticipantStore.getState();
    expect(s.schoolId).toBe('123456');
    expect(s.schoolCode).toBe('ABC123');
    expect(s.schoolName).toBe('Testschule');
    expect(s.gradeBand).toBe('oberstufe');
    expect(await screen.findByRole('heading', { name: /Schule insgesamt/ })).toBeInTheDocument();
  });

  it('works without a grade band', async () => {
    renderAt('/s/ABC123');
    fireEvent.click(await screen.findByRole('button', { name: "Los geht's" }));
    expect(useParticipantStore.getState().gradeBand).toBeUndefined();
    expect(useParticipantStore.getState().schoolId).toBe('123456');
  });

  it('shows an error for an unknown code', async () => {
    renderAt('/s/NOPE');
    expect(await screen.findByText('Diesen Schulcode kennen wir nicht')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zur Startseite' })).toHaveAttribute('href', '/');
    expect(useParticipantStore.getState().schoolId).toBeNull();
  });
});

describe('CheckPage guard', () => {
  beforeEach(() => useParticipantStore.getState().reset());

  it('points to the demo school when no school is stored', () => {
    renderAt('/check');
    expect(screen.getByRole('link', { name: 'Demo-Schule ausprobieren' })).toHaveAttribute(
      'href',
      '/s/DEMO42',
    );
  });
});

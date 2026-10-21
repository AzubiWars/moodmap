import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataSource } from '@/data/api';
import { clearDataSources, registerDataSource } from '@/data';
import { getDeviceToken } from '@/lib/device';
import { useParticipantStore } from '@/store/participant';
import type { DeleteResult, OwnResponseInput } from '@/types';
import { CheckPage } from './CheckPage';
import { DonePage } from './DonePage';
import { hasSubmitted } from './useCheckFlow';
import { selectQuestions } from './selectQuestions';
import { WithdrawResponse } from './WithdrawResponse';

const WAVE = '2026-W43';

function setup(result: DeleteResult | Error = { ok: true }, start = '/check') {
  const deleteOwnResponse = vi.fn<(input: OwnResponseInput) => Promise<DeleteResult>>(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  registerDataSource('mock', {
    getCurrentWave: async () => ({ id: WAVE, startsAt: '2026-10-19', endsAt: '2026-10-25' }),
    submitResponse: async () => ({ ok: true }),
    deleteOwnResponse,
  } as unknown as DataSource);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[start]}>
        <Routes>
          <Route path="/check" element={<CheckPage />} />
          <Route path="/check/done" element={<DonePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return deleteOwnResponse;
}

const firstQuestion = () => selectQuestions(getDeviceToken(), WAVE)[0]!.text;
const confirmDelete = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Meine Antworten löschen' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ja, löschen' }));
};

describe('WithdrawResponse (#161)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(`moodmap:submitted:${WAVE}`, '1');
    localStorage.setItem('moodmap.freetext.v1', JSON.stringify({ cleaned: 'Mehr Pausen' }));
    useParticipantStore.setState({
      schoolId: '900000',
      schoolCode: 'DEMO42',
      schoolName: 'Demo',
      isTest: false,
      gradeBand: '8-10',
    });
  });
  afterEach(() => clearDataSources());

  it('deletes the own response from "already done" and starts a fresh Mood-Check', async () => {
    const remove = setup();
    await screen.findByText(/schon mitgemacht/);
    await confirmDelete();

    expect(await screen.findByRole('heading', { name: firstQuestion() })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Deine Antworten wurden gelöscht');
    expect(remove).toHaveBeenCalledWith({ waveId: WAVE, deviceToken: getDeviceToken() });
    expect(hasSubmitted(WAVE)).toBe(false);
    expect(localStorage.getItem('moodmap.freetext.v1')).toBeNull();
  });

  it('also frees the Mood-Check when nothing was stored any more', async () => {
    setup({ ok: false, reason: 'not_found' });
    await confirmDelete();
    expect(await screen.findByRole('status')).toHaveTextContent('keine Antworten mehr gespeichert');
    expect(hasSubmitted(WAVE)).toBe(false);
  });

  it.each([
    ['a server error', { ok: false, reason: 'error' } as DeleteResult],
    ['a network failure', new Error('offline')],
  ])('keeps everything on %s and offers a retry', async (_, result) => {
    const remove = setup(result);
    await confirmDelete();
    expect(await screen.findByText('Das Löschen hat nicht geklappt.')).toBeInTheDocument();
    expect(hasSubmitted(WAVE)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Nochmal versuchen' }));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(2));
  });

  it('asks for confirmation and can be cancelled', async () => {
    const remove = setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Meine Antworten löschen' }));
    expect(screen.getByText(/Sie zählen dann nicht mehr auf der Karte/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.getByRole('button', { name: 'Meine Antworten löschen' })).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
  });

  it('is not offered for the pitch test location, which the PIN reset clears (#171, #178)', async () => {
    useParticipantStore.setState({ schoolId: 'TEST-PITCH', schoolCode: 'PITCH', isTest: true });
    // The component itself renders nothing (synchronous, so not a vacuous check) …
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <WithdrawResponse waveId={WAVE} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(container).toBeEmptyDOMElement();
    // … and the thank-you page leaves out its card once the wave has loaded.
    const remove = setup({ ok: true }, '/check/done');
    await screen.findByText('Danke! Deine Stimme zählt.');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button', { name: 'Meine Antworten löschen' })).toBeNull();
    expect(remove).not.toHaveBeenCalled();
  });

  it('is offered on the thank-you page right after submitting', async () => {
    setup({ ok: true }, '/check/done');
    await screen.findByText('Danke! Deine Stimme zählt.');
    await confirmDelete();
    expect(await screen.findByRole('heading', { name: firstQuestion() })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Deine Antworten wurden gelöscht');
  });
});

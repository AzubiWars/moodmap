import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataSource } from '@/data/api';
import { clearDataSources, registerDataSource } from '@/data';
import { getDeviceToken } from '@/lib/device';
import { useParticipantStore } from '@/store/participant';
import type { ResponseInput, SubmitResult } from '@/types';
import { CheckPage } from './CheckPage';
import { selectQuestions } from './selectQuestions';

const WAVE = '2026-W43';

function setup(result: SubmitResult = { ok: true }) {
  const submitResponse = vi.fn<(input: ResponseInput) => Promise<SubmitResult>>(async () => result);
  registerDataSource('mock', {
    getCurrentWave: async () => ({ id: WAVE, startsAt: '2026-10-19', endsAt: '2026-10-25' }),
    submitResponse,
  } as unknown as DataSource);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/check']}>
        <Routes>
          <Route path="/check" element={<CheckPage />} />
          <Route path="/check/done" element={<p>FERTIG</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return submitResponse;
}

const firstCall = (submit: ReturnType<typeof setup>) => submit.mock.calls[0]?.[0] as ResponseInput;

const questions = () => selectQuestions(getDeviceToken(), WAVE);

/** Beantwortet die aktuelle Karte mit dem Skalenwert (Auto-Weiter nach ~250 ms). */
async function answerScale(text: string, label: string) {
  fireEvent.click(
    await screen.findByRole('heading', { name: text }).then(() => screen.getByRole('radio', { name: label })),
  );
}

describe('CheckPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useParticipantStore.setState({
      schoolId: '900000',
      schoolCode: 'DEMO42',
      schoolName: 'Demo',
      gradeBand: '8-10',
    });
  });
  afterEach(() => {
    clearDataSources();
    vi.useRealTimers();
  });

  it('submits the full run with the right payload; "weiß nicht" sends no answer', async () => {
    const submit = setup();
    const qs = questions();
    for (const [i, q] of qs.entries()) {
      if (i === 1) {
        await screen.findByRole('heading', { name: q.text });
        fireEvent.click(screen.getByRole('button', { name: /weiß nicht/ }));
      } else {
        await answerScale(q.text, 'eher gut');
      }
    }
    await screen.findByText('FERTIG');
    expect(submit).toHaveBeenCalledTimes(1);
    const input = firstCall(submit);
    expect(input).toMatchObject({
      schoolId: '900000',
      waveId: WAVE,
      role: 'student',
      gradeBand: '8-10',
      deviceToken: getDeviceToken(),
    });
    expect(input.answers).toHaveLength(qs.length - 1);
    expect(input.answers.map((a) => a.questionId)).not.toContain(qs[1]?.id);
    expect(input.answers.every((a) => 'value' in a && a.value === 4)).toBe(true);
    expect(localStorage.getItem(`moodmap:submitted:${WAVE}`)).toBe('1');
  });

  it('offers a deep question for the worst topic and sends it as choice', async () => {
    const submit = setup();
    const qs = questions();
    for (const [i, q] of qs.entries()) await answerScale(q.text, i === 3 ? 'eher schlecht' : 'richtig gut');
    expect(await screen.findByText('Noch eine kurze Frage')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { pressed: false }).at(0) as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    await screen.findByText('FERTIG');
    const last = firstCall(submit).answers.at(-1);
    expect(last?.questionId).toBe(`${qs[3]?.topicSlug}.deep`);
    expect(last).toHaveProperty('choice');
  });

  it('shows a gentle hint for a low wellbeing answer and continues afterwards', async () => {
    setup();
    const qs = questions();
    const idx = qs.findIndex((q) => q.id === 'wellbeing.core');
    for (const q of qs.slice(0, idx)) await answerScale(q.text, 'geht so');
    await answerScale(qs[idx]?.text ?? '', 'richtig mies');
    expect(await screen.findByText(/116 111/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(await screen.findByRole('heading', { name: qs[idx + 1]?.text })).toBeInTheDocument();
  });

  it('shows a thank-you instead of the form when this wave was already answered', async () => {
    localStorage.setItem(`moodmap:submitted:${WAVE}`, '1');
    const submit = setup();
    expect(await screen.findByText(/Nächster Mood-Check ab Montag/)).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('handles already_submitted from the server', async () => {
    setup({ ok: false, reason: 'already_submitted' });
    for (const q of questions()) await answerScale(q.text, 'geht so');
    // Tiefe Frage kann nur bei ≤ 3 erscheinen: „geht so" = 3
    fireEvent.click(await screen.findByRole('button', { name: 'Überspringen' }));
    expect(await screen.findByText(/Nächster Mood-Check ab Montag/)).toBeInTheDocument();
  });

  it('offers a retry after an error and keeps the answers', async () => {
    const submit = setup({ ok: false, reason: 'error' });
    for (const q of questions()) await answerScale(q.text, 'richtig gut');
    fireEvent.click(await screen.findByRole('button', { name: 'Nochmal versuchen' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    expect(submit.mock.calls[1]?.[0].answers).toEqual(firstCall(submit).answers);
  });
});

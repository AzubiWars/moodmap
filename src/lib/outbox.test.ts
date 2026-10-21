import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataSource } from '@/data/api';
import { clearDataSources, registerDataSource } from '@/data';
import type { ResponseInput, SubmitResult } from '@/types';
import {
  MAX_ATTEMPTS,
  backoffDelay,
  enqueueResponse,
  flushOutbox,
  pendingCount,
  startOutbox,
} from './outbox';

const INPUT: ResponseInput = {
  schoolId: '900000',
  waveId: '2026-W43',
  role: 'student',
  deviceToken: 'device-1',
  answers: [{ questionId: 'overall.core', value: 4 }],
};

function fakeSource(impl: () => Promise<SubmitResult>) {
  const submitResponse = vi.fn<(input: ResponseInput) => Promise<SubmitResult>>(impl);
  registerDataSource('mock', { submitResponse } as unknown as DataSource);
  return submitResponse;
}

function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
}

const stored = () => JSON.parse(localStorage.getItem('moodmap:outbox:v1') ?? '[]') as unknown[];

describe('outbox', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    clearDataSources();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('buffers only the anonymous response payload under moodmap:outbox:v1', () => {
    enqueueResponse(INPUT);
    expect(pendingCount()).toBe(1);
    expect(stored()).toEqual([expect.objectContaining({ input: INPUT, attempts: 0 })]);
    expect(Object.keys((stored()[0] as { input: object }).input).sort()).toEqual(
      ['answers', 'deviceToken', 'role', 'schoolId', 'waveId'].sort(),
    );
  });

  it('does not send while offline', async () => {
    setOnline(false);
    const submit = fakeSource(async () => ({ ok: true }));
    enqueueResponse(INPUT);
    await flushOutbox();
    expect(submit).not.toHaveBeenCalled();
    expect(pendingCount()).toBe(1);
  });

  it('sends on the online event and empties the buffer', async () => {
    setOnline(false);
    const submit = fakeSource(async () => ({ ok: true }));
    const onSent = vi.fn();
    const stop = startOutbox(onSent);
    enqueueResponse(INPUT);
    await flushOutbox();
    expect(submit).not.toHaveBeenCalled();

    setOnline(true);
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(pendingCount()).toBe(0));
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(INPUT);
    expect(onSent).toHaveBeenCalled();
    stop();
  });

  it('treats already_submitted as success (double send)', async () => {
    const submit = fakeSource(async () => ({ ok: false, reason: 'already_submitted' }));
    enqueueResponse(INPUT);
    const result = await flushOutbox();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
    expect(pendingCount()).toBe(0);
  });

  it('never sends one entry twice when flushes overlap', async () => {
    const submit = fakeSource(async () => ({ ok: true }));
    enqueueResponse(INPUT);
    await Promise.all([flushOutbox(), flushOutbox(), flushOutbox()]);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('keeps the entry with exponential backoff after a network error', async () => {
    let t = 1_000;
    const submit = fakeSource(async () => {
      throw new TypeError('Failed to fetch');
    });
    enqueueResponse(INPUT, t);
    await flushOutbox(() => t);
    expect(stored()).toEqual([expect.objectContaining({ attempts: 1, nextAttemptAt: t + backoffDelay(1) })]);

    // Vor Ablauf des Backoffs kein neuer Versuch.
    await flushOutbox(() => t + 1);
    expect(submit).toHaveBeenCalledTimes(1);

    t += backoffDelay(1);
    submit.mockResolvedValueOnce({ ok: true });
    await flushOutbox(() => t);
    expect(submit).toHaveBeenCalledTimes(2);
    expect(pendingCount()).toBe(0);
  });

  it('retries on the backoff timer without an online event', async () => {
    vi.useFakeTimers();
    const submit = fakeSource(async () => {
      throw new TypeError('Failed to fetch');
    });
    enqueueResponse(INPUT);
    const stop = startOutbox();
    await vi.advanceTimersByTimeAsync(0);
    expect(submit).toHaveBeenCalledTimes(1);

    submit.mockResolvedValue({ ok: true });
    await vi.advanceTimersByTimeAsync(backoffDelay(1));
    expect(submit).toHaveBeenCalledTimes(2);
    expect(pendingCount()).toBe(0);
    stop();
  });

  it('drops an entry after MAX_ATTEMPTS server errors (e.g. expired wave)', async () => {
    let t = 0;
    fakeSource(async () => ({ ok: false, reason: 'error' }));
    enqueueResponse(INPUT, t);
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      await flushOutbox(() => t);
      t += backoffDelay(i);
    }
    expect(pendingCount()).toBe(1);
    const result = await flushOutbox(() => t);
    expect(result.dropped).toHaveLength(1);
    expect(pendingCount()).toBe(0);
  });

  it('caps the backoff at five minutes', () => {
    expect(backoffDelay(1)).toBe(2_000);
    expect(backoffDelay(2)).toBe(4_000);
    expect(backoffDelay(50)).toBe(300_000);
  });
});

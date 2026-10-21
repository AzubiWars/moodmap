// @vitest-environment node
// End-to-end submission flow with a mocked backend + LLM (#126). No network, no real data.
import { describe, expect, it, vi } from 'vitest';
import { submitFreetext, type SubmitFreetextDeps } from '../functions/_shared/submitFreetext.ts';
import { DISCARDED, type ModerationResult } from '../functions/_shared/moderation.ts';

const SUPABASE = 'https://test.supabase.co';
const SERVICE_KEY = 'service-role-key';
const TOKEN = 'device-token-00000001';

const rawText = 'Herr Müller ist ein Idiot und die Toiletten sind kaputt.';
const cleanedText = 'Eine Lehrkraft ist oft unpassend und die Toiletten sind kaputt.';

const input = {
  schoolId: '900000',
  waveId: '2026-W43',
  deviceToken: TOKEN,
  text: rawText,
};

const moderation = (overrides: Partial<ModerationResult> = {}): ModerationResult => ({
  allowed: true,
  reason: '',
  cleaned: cleanedText,
  topics: ['learning', 'building'],
  cluster: 'Unterricht & Gebäude',
  concern: false,
  ...overrides,
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function llmResponse(payload: unknown): Response {
  return json({ choices: [{ message: { content: JSON.stringify(payload) } }] });
}

interface BackendOptions {
  responses?: unknown;
  existing?: unknown;
  record?: unknown;
  lookupStatus?: number;
  recordStatus?: number;
  moderation?: unknown;
}

function backend(options: BackendOptions = {}) {
  const calls: Array<{ url: string; body?: unknown }> = [];
  const fetchImpl = vi.fn<typeof fetch>(async (url, init) => {
    const target = String(url);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: target, body });

    if (target.includes('/rest/v1/responses?')) {
      if (options.lookupStatus && options.lookupStatus !== 200)
        return new Response('lookup failed', { status: options.lookupStatus });
      return json(options.responses ?? [{ id: 'resp-1' }]);
    }
    if (target.includes('/rest/v1/freetext_entries?')) return json(options.existing ?? []);
    if (target.includes('/rest/v1/rpc/record_freetext')) {
      if (options.recordStatus && options.recordStatus !== 200)
        return new Response('record failed', { status: options.recordStatus });
      return json(options.record ?? { ok: true });
    }
    if (target.includes('openrouter.ai')) {
      return llmResponse(options.moderation ?? moderation());
    }
    throw new Error(`unexpected request: ${target}`);
  });
  return { fetchImpl, calls };
}

function deps(fetchImpl: typeof fetch, overrides: Partial<SubmitFreetextDeps> = {}): SubmitFreetextDeps {
  return {
    supabaseUrl: SUPABASE,
    serviceRoleKey: SERVICE_KEY,
    openRouterKey: 'openrouter-key',
    fetchImpl,
    ...overrides,
  };
}

describe('submitFreetext', () => {
  it('verifies the participant, moderates and stores only the cleaned text', async () => {
    const { fetchImpl, calls } = backend();
    const result = await submitFreetext(input, deps(fetchImpl));

    expect(result).toEqual({
      status: 200,
      body: {
        ok: true,
        stored: true,
        concern: false,
        cluster: 'Unterricht & Gebäude',
        topics: ['learning', 'building'],
      },
    });
    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      '/rest/v1/responses',
      '/rest/v1/freetext_entries',
      '/api/v1/chat/completions',
      '/rest/v1/rpc/record_freetext',
    ]);

    const stored = calls.at(-1)!.body as { input: Record<string, unknown> };
    expect(stored.input).toMatchObject({
      schoolId: '900000',
      waveId: '2026-W43',
      deviceToken: TOKEN,
      cleaned: cleanedText,
      topics: ['learning', 'building'],
      cluster: 'Unterricht & Gebäude',
      concern: false,
    });
    // The raw text (including the name and the insult) never reaches the database layer.
    const persisted = JSON.stringify(stored);
    expect(persisted).not.toContain(rawText);
    expect(persisted).not.toContain('Müller');
    expect(persisted).not.toContain('Idiot');
  });

  it('does not call the LLM without an existing participation', async () => {
    const { fetchImpl, calls } = backend({ responses: [] });
    const result = await submitFreetext(input, deps(fetchImpl));

    expect(result).toEqual({ status: 403, body: { ok: false, reason: 'no_response' } });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain('/rest/v1/responses');
  });

  it('does not spend another LLM call for an already stored text', async () => {
    const { fetchImpl, calls } = backend({ existing: [{ response_id: 'resp-1' }] });
    const result = await submitFreetext(input, deps(fetchImpl));

    expect(result).toEqual({
      status: 200,
      body: { ok: true, stored: false, reason: 'already_submitted' },
    });
    expect(calls).toHaveLength(2);
    expect(calls.some((call) => call.url.includes('openrouter.ai'))).toBe(false);
  });

  it('stores nothing when moderation rejects the text', async () => {
    const { fetchImpl, calls } = backend({
      moderation: {
        allowed: false,
        reason: 'Beleidigung',
        cleaned: '',
        topics: [],
        cluster: '',
        concern: false,
      },
    });
    const result = await submitFreetext(input, deps(fetchImpl));

    expect(result).toEqual({
      status: 200,
      body: { ok: true, stored: false, reason: 'Beleidigung', concern: false },
    });
    expect(calls.some((call) => call.url.includes('/rpc/record_freetext'))).toBe(false);
  });

  it('stores nothing when the moderation is unavailable (timeout)', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (url, init) => {
      const target = String(url);
      if (target.includes('/rest/v1/responses?')) return json([{ id: 'resp-1' }]);
      if (target.includes('/rest/v1/freetext_entries?')) return json([]);
      if (target.includes('openrouter.ai')) {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('timeout')));
        });
      }
      throw new Error(`unexpected request: ${target}`);
    });

    const result = await submitFreetext(input, deps(fetchImpl, { timeoutMs: 5 }));
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, stored: false, concern: false });
    expect(result.body.reason).toBe(DISCARDED.reason);
  });

  it('does not fail the survey when storing fails', async () => {
    const { fetchImpl } = backend({ recordStatus: 500 });
    const result = await submitFreetext(input, deps(fetchImpl));

    expect(result).toEqual({
      status: 200,
      body: { ok: true, stored: false, reason: 'storage_failed', concern: false },
    });
  });

  it('returns already_submitted when the RPC enforces the one-entry rule', async () => {
    const { fetchImpl } = backend({ record: { ok: false, reason: 'already_submitted' } });
    const result = await submitFreetext(input, deps(fetchImpl));

    expect(result).toEqual({
      status: 200,
      body: { ok: true, stored: false, reason: 'already_submitted', concern: false },
    });
  });

  it('rejects invalid input without any backend call', async () => {
    const { fetchImpl, calls } = backend();

    await expect(submitFreetext({ ...input, deviceToken: 'short' }, deps(fetchImpl))).resolves.toEqual({
      status: 400,
      body: { ok: false, reason: 'invalid' },
    });
    await expect(submitFreetext({ ...input, text: '   ' }, deps(fetchImpl))).resolves.toEqual({
      status: 400,
      body: { ok: false, reason: 'invalid' },
    });
    await expect(submitFreetext({ ...input, text: 'x'.repeat(281) }, deps(fetchImpl))).resolves.toEqual({
      status: 400,
      body: { ok: false, reason: 'invalid' },
    });
    expect(calls).toHaveLength(0);
  });

  it('does not call the LLM when the participant lookup is unavailable', async () => {
    const { fetchImpl, calls } = backend({ lookupStatus: 503 });
    const result = await submitFreetext(input, deps(fetchImpl));

    expect(result).toEqual({ status: 503, body: { ok: false, reason: 'unavailable' } });
    expect(calls).toHaveLength(1);
  });

  it('discards the text without an OpenRouter key', async () => {
    const { fetchImpl, calls } = backend();
    const result = await submitFreetext(input, deps(fetchImpl, { openRouterKey: undefined }));

    expect(result).toEqual({
      status: 200,
      body: { ok: true, stored: false, reason: DISCARDED.reason, concern: false },
    });
    expect(calls.some((call) => call.url.includes('openrouter.ai'))).toBe(false);
  });

  it('keeps concern for the client but still stores the cleaned text', async () => {
    const { fetchImpl, calls } = backend({
      moderation: moderation({
        cleaned: 'Ich brauche gerade Hilfe.',
        topics: ['wellbeing'],
        cluster: 'Belastung',
        concern: true,
      }),
    });
    const result = await submitFreetext(input, deps(fetchImpl));

    expect(result.body).toMatchObject({ ok: true, stored: true, concern: true });
    const stored = calls.at(-1)!.body as { input: { concern: boolean } };
    expect(stored.input.concern).toBe(true);
  });
});

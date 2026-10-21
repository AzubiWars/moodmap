// @vitest-environment node
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { loadTestHeaders, runPitchLoadTest, summarizeSamples } from './lib/pitch-loadtest.ts';

const key = `test.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.signature`;
const pin = 'synthetic-reset-pin';
const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  servers.length = 0;
});

async function backend(
  options: {
    isTest?: boolean;
    initialN?: number;
    submissionFails?: boolean;
    textFails?: boolean;
    resetFails?: boolean;
    leakNrw?: boolean;
    publicKey?: string;
  } = {},
) {
  let tokens = new Set<string>();
  let n = options.initialN ?? 0;
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>;
    const path = req.url!;
    calls.push({ path, body });
    const reply = (value: unknown, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(value));
    };
    const expectedKey = options.publicKey ?? key;
    const expectedBearer = expectedKey.startsWith('sb_publishable_') ? undefined : `Bearer ${expectedKey}`;
    if (req.headers.apikey !== expectedKey || req.headers.authorization !== expectedBearer)
      return reply({}, 401);
    if (path.endsWith('/get_school_by_code'))
      return reply({ id: 'pitch-test', isTest: options.isTest ?? true });
    if (path.endsWith('/get_pitch_aggregate'))
      return reply({ school: { id: 'pitch-test', isTest: true }, waveId: '2026-W43', n });
    if (path.endsWith('/get_aggregates'))
      return reply([{ id: 'nrw', n: options.leakNrw ? n : 50, score: 60 }]);
    if (path.endsWith('/submit_response')) {
      const input = body.input as Record<string, unknown>;
      if (input.schoolId !== 'pitch-test') return reply({ ok: false });
      if (options.submissionFails) return reply({ error: 'sensitive backend detail' }, 429);
      if (tokens.has(String(input.deviceToken))) return reply({ ok: false, reason: 'already_submitted' });
      tokens.add(String(input.deviceToken));
      n++;
      return reply({ ok: true });
    }
    if (path.endsWith('/submit-freetext'))
      return options.textFails
        ? reply({ ok: true, stored: false, reason: 'secret vendor detail' })
        : reply({ ok: true, stored: true });
    if (path.endsWith('/pitch-reset')) {
      if (body.pin !== pin || options.resetFails) return reply({ error: 'sensitive reset detail' }, 401);
      tokens = new Set();
      n = 0;
      return reply({ ok: true });
    }
    return reply({}, 404);
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  return { url: `http://127.0.0.1:${address.port}`, calls, count: () => n };
}

describe('synthetic Pitch load runner', () => {
  it('sends 200 isolated submissions and 60 texts over HTTP, verifies duplicate/reset/reuse and reports no credentials', async () => {
    const test = await backend();
    const report = await runPitchLoadTest({
      url: test.url,
      anonKey: key,
      durationMs: 40,
      pollMs: 10,
      resetAfter: true,
      resetPin: pin,
    });
    expect(report.passed).toBe(true);
    expect(report.participants).toBe(200);
    expect(report.plannedTextCount).toBe(60);
    expect(report.metrics.submitResponse.requests).toBe(200);
    expect(report.metrics.moderation.requests).toBe(60);
    expect(report.metrics.aggregatePolling.requests).toBeGreaterThanOrEqual(2);
    expect(Object.values(report.checks)).toEqual([true, true, true, true, true]);
    expect(test.count()).toBe(0);
    const writes = test.calls.filter((call) => call.path.endsWith('/submit_response'));
    const inputs = writes.map((call) => call.body.input as Record<string, unknown>);
    expect(new Set(inputs.slice(0, 200).map((input) => input.deviceToken)).size).toBe(200);
    expect(inputs.every((input) => input.schoolId === 'pitch-test' && input.waveId === '2026-W43')).toBe(
      true,
    );
    expect(inputs[0]!.deviceToken).toBe(inputs.at(-1)!.deviceToken);
    const serialized = JSON.stringify(report);
    for (const secret of [key, pin, String(inputs[0]!.deviceToken), 'Ich wünsche mir', 'sensitive'])
      expect(serialized).not.toContain(secret);
    expect(report.beamerVisualCheck).toBe('manual_required');
    expect(report.elapsedMs).toBeGreaterThanOrEqual(40);
  });

  it.each([{ isTest: false }, { initialN: 1 }])(
    'rejects unsafe or occupied rounds before any write (%j)',
    async (options) => {
      const test = await backend(options);
      await expect(runPitchLoadTest({ url: test.url, anonKey: key, durationMs: 0 })).rejects.toThrow();
      expect(test.calls.some((call) => /submit|reset/.test(call.path))).toBe(false);
    },
  );

  it.each(['sb_secret_bad', `a.${Buffer.from('{"role":"service_role"}').toString('base64url')}.b`])(
    'rejects admin/secret credentials before a request',
    async (anonKey) => {
      const test = await backend();
      await expect(runPitchLoadTest({ url: test.url, anonKey })).rejects.toThrow('public_key_required');
      expect(test.calls).toEqual([]);
    },
  );

  it('supports publishable keys without sending them as Bearer', () => {
    expect(loadTestHeaders('sb_publishable_public')).toEqual({
      apikey: 'sb_publishable_public',
      'Content-Type': 'application/json',
    });
    expect(loadTestHeaders(key)).toMatchObject({
      apikey: key,
      Authorization: `Bearer ${key}`,
    });
  });

  it('uses publishable authentication through real local HTTP for REST, moderation and reset', async () => {
    const publicKey = 'sb_publishable_local_test';
    const test = await backend({ publicKey });
    const report = await runPitchLoadTest({
      url: test.url,
      anonKey: publicKey,
      count: 10,
      durationMs: 0,
      resetAfter: true,
      resetPin: pin,
    });
    expect(report.passed).toBe(true);
    expect(report.metrics.submitResponse.requests).toBe(10);
    expect(report.metrics.moderation.requests).toBe(3);
    expect(report.checks.resetVerified).toBe(true);
    expect(report.checks.resubmissionVerified).toBe(true);
    expect(test.count()).toBe(0);
    expect(JSON.stringify(report)).not.toContain(publicKey);
  });

  it('reports HTTP errors and skips moderation for failed submissions without a retry', async () => {
    const test = await backend({ submissionFails: true });
    const report = await runPitchLoadTest({ url: test.url, anonKey: key, count: 10, durationMs: 0 });
    expect(report.passed).toBe(false);
    expect(report.metrics.submitResponse).toMatchObject({
      requests: 10,
      failed: 10,
      failureRate: 1,
      failures: { http_429: 10 },
    });
    expect(report.metrics.moderation.requests).toBe(0);
    expect(report.checks.resetVerified).toBeNull();
    expect(test.calls.some((call) => call.path.endsWith('/pitch-reset'))).toBe(false);
  });

  it('counts discarded moderation and detects NRW contamination', async () => {
    const test = await backend({ textFails: true, leakNrw: true });
    const report = await runPitchLoadTest({ url: test.url, anonKey: key, count: 10, durationMs: 0 });
    expect(report.passed).toBe(false);
    expect(report.metrics.moderation).toMatchObject({
      requests: 3,
      failed: 3,
      failures: { text_not_stored: 3 },
    });
    expect(report.checks.nrwUnchanged).toBe(false);
    expect(JSON.stringify(report)).not.toContain('secret vendor detail');
  });

  it('retains load measurements when reset fails and never reports success', async () => {
    const test = await backend({ resetFails: true });
    const report = await runPitchLoadTest({
      url: test.url,
      anonKey: key,
      count: 10,
      durationMs: 0,
      resetAfter: true,
      resetPin: pin,
    });
    expect(report.passed).toBe(false);
    expect(report.metrics.submitResponse.requests).toBe(10);
    expect(report.controlFailures).toEqual(['control_request_failed']);
  });

  it('calculates nearest-rank latency percentiles and empty measurements', () => {
    expect(summarizeSamples([])).toMatchObject({ requests: 0, p95Ms: null, maxMs: null });
    expect(summarizeSamples([1, 2, 3, 4, 100].map((ms) => ({ ms, failure: null })))).toMatchObject({
      p50Ms: 3,
      p95Ms: 100,
      maxMs: 100,
    });
  });
});

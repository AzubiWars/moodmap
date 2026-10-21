// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createResetHandler } from '../functions/pitch-reset/handler.ts';

const options = {
  pin: 'synthetic-test-pin',
  supabaseUrl: 'https://project.example',
  serviceKey: 'test-service-key',
  allowedOrigin: 'https://app.example',
};
const request = (body: unknown, origin = options.allowedOrigin) =>
  new Request('https://edge.example/pitch-reset', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('pitch-reset HTTP gate', () => {
  it('rejects a wrong PIN without contacting the database', async () => {
    const fetcher = vi.fn();
    const response = await createResetHandler({ ...options, fetcher })(request({ pin: 'wrong' }));
    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('fails closed if the secret is absent or too short', async () => {
    const fetcher = vi.fn();
    for (const pin of [undefined, '', '1234']) {
      expect((await createResetHandler({ ...options, pin, fetcher })(request({ pin: '1234' }))).status).toBe(
        503,
      );
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('only invokes the fixed service-role reset RPC after valid authorization', async () => {
    const fetcher = vi.fn(async () => Response.json({ ok: true, deletedResponses: 12 }));
    const response = await createResetHandler({ ...options, fetcher })(
      request({ pin: options.pin, schoolId: '900000' }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, deletedResponses: 12 });
    expect(fetcher).toHaveBeenCalledWith(
      'https://project.example/rest/v1/rpc/reset_pitch_test',
      expect.objectContaining({
        body: '{}',
        headers: expect.objectContaining({
          apikey: options.serviceKey,
          Authorization: `Bearer ${options.serviceKey}`,
        }),
      }),
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('rejects another browser origin and malformed JSON', async () => {
    const fetcher = vi.fn();
    const handler = createResetHandler({ ...options, fetcher });
    expect((await handler(request({ pin: options.pin }, 'https://other.example'))).status).toBe(403);
    expect(
      (await handler(new Request('https://edge.example', { method: 'POST', body: 'null' }))).status,
    ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not leak server errors or credentials on database failures', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('sensitive database details');
    });
    const response = await createResetHandler({ ...options, fetcher })(request({ pin: options.pin }));
    expect(response.status).toBe(502);
    expect(await response.text()).toBe('{"error":"reset_failed"}');
  });
});

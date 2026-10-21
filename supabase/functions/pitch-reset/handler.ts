interface ResetOptions {
  pin?: string;
  supabaseUrl?: string;
  serviceKey?: string;
  allowedOrigin: string;
  fetcher?: typeof fetch;
}

async function matchesSecret(candidate: string, secret: string): Promise<boolean> {
  const digest = (value: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const [a, b] = await Promise.all([digest(candidate), digest(secret)]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i]! ^ right[i]!;
  return difference === 0;
}

/** Fixed-target admin action. Neither a school ID nor SQL is accepted from the caller. */
export function createResetHandler(options: ResetOptions) {
  const fetcher = options.fetcher ?? fetch;
  const headers = {
    'Access-Control-Allow-Origin': options.allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
  const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    if (origin && origin !== options.allowedOrigin) return reply(403, { error: 'origin_not_allowed' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
    if (!options.pin || options.pin.length < 8 || !options.supabaseUrl || !options.serviceKey) {
      return reply(503, { error: 'reset_not_configured' });
    }
    let pin: unknown;
    try {
      pin = (await request.json()).pin;
    } catch {
      return reply(400, { error: 'invalid_request' });
    }
    if (typeof pin !== 'string' || pin.length > 200 || !(await matchesSecret(pin, options.pin))) {
      return reply(401, { error: 'invalid_pin' });
    }
    try {
      const response = await fetcher(
        `${options.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/reset_pitch_test`,
        {
          method: 'POST',
          headers: {
            apikey: options.serviceKey,
            Authorization: `Bearer ${options.serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
          signal: AbortSignal.timeout(5_000),
        },
      );
      if (!response.ok) return reply(502, { error: 'reset_failed' });
      const result: unknown = await response.json();
      if (!result || typeof result !== 'object' || !('ok' in result) || result.ok !== true) {
        return reply(502, { error: 'reset_failed' });
      }
      return reply(200, result);
    } catch {
      // Do not log requests, PINs, service credentials or database errors.
      return reply(502, { error: 'reset_failed' });
    }
  };
}

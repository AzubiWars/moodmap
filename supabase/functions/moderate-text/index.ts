/**
 * Supabase Edge Function: moderiert anonyme Freitexte vor dem Speichern.
 *
 * Secret (NIE im Repo/Frontend):
 *   supabase secrets set OPENROUTER_API_KEY=...
 *   optional: OPENROUTER_MODEL=openai/gpt-4o-mini
 *
 * Deploy:  supabase functions deploy moderate-text
 * Lokal:   supabase functions serve moderate-text --env-file .env.local
 *
 * Antwort: { allowed: boolean, reason: string }
 * Fail-closed: bei fehlendem Key/API-Fehler wird der Text nicht freigegeben.
 */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const MAX_TEXT_LENGTH = 500;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ModerationResult {
  allowed: boolean;
  reason: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function parseModeration(content: string): ModerationResult {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  try {
    const parsed = JSON.parse(cleaned) as { allowed?: unknown; reason?: unknown };
    return {
      allowed: parsed.allowed === true,
      reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 240) : '',
    };
  } catch {
    return { allowed: false, reason: 'Antwort konnte nicht geprüft werden.' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    return json({ allowed: false, reason: 'Moderation ist nicht konfiguriert.' }, 503);
  }

  let payload: { text?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Ungültiger JSON-Body' }, 400);
  }

  const text = typeof payload.text === 'string' ? payload.text.trim() : '';
  if (!text) return json({ error: 'text fehlt' }, 400);
  if (text.length > MAX_TEXT_LENGTH) {
    return json({ allowed: false, reason: `Maximal ${MAX_TEXT_LENGTH} Zeichen.` }, 400);
  }

  const model = Deno.env.get('OPENROUTER_MODEL') ?? DEFAULT_MODEL;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('APP_URL') ?? 'https://moodmap-cyan.vercel.app',
        'X-Title': 'Moodmap NRW',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 120,
        messages: [
          {
            role: 'system',
            content:
              'Du prüfst einen kurzen anonymen Freitext aus einer Schul-Umfrage. ' +
              'Erlaube sachliche Kritik, Sorgen, Wünsche und Beschwerden. ' +
              'Blockiere Beleidigungen, Hassrede, Drohungen, sexuelle Inhalte, ' +
              'Aufforderungen zu Gewalt, personenbezogene Daten (Namen, Adressen, ' +
              'Telefonnummern) und Spam. Antworte ausschließlich mit JSON: ' +
              '{"allowed": true|false, "reason": "kurz auf Deutsch"}.',
          },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      return json({ allowed: false, reason: 'Moderation ist derzeit nicht verfügbar.' }, 502);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    return json(parseModeration(content));
  } catch {
    return json({ allowed: false, reason: 'Moderation ist derzeit nicht verfügbar.' }, 502);
  }
});

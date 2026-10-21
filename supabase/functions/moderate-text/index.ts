/**
 * Supabase Edge Function: moderiert optionale Freitexte vor dem Speichern.
 *
 * Policy: ADR-016 / docs/PRODUCT_SPEC.md §3.13 / docs/PRIVACY.md §6b.
 * - max. 280 Zeichen
 * - strukturiertes JSON: allowed, reason, cleaned, topics, cluster, concern
 * - Rohtext wird nie gespeichert/geloggt
 * - Timeout 5 s; bei Fehler wird nur der Freitext verworfen, die Umfrage läuft weiter
 *
 * Secret (NIE im Repo/Frontend):
 *   supabase secrets set OPENROUTER_API_KEY=...
 *   optional: OPENROUTER_MODEL=openai/gpt-4o-mini
 *
 * Deploy:  supabase functions deploy moderate-text
 * Lokal:   supabase functions serve moderate-text --env-file .env.local
 */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const MAX_TEXT_LENGTH = 280;
const TIMEOUT_MS = 5_000;

const TOPIC_SLUGS = [
  'overall',
  'learning',
  'stress',
  'ai',
  'wellbeing',
  'community',
  'teachers',
  'digital',
  'building',
  'cancellation',
  'participation',
  'future',
  'safety',
  'food',
  'phones',
  'voice',
] as const;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export interface ModerationResult {
  allowed: boolean;
  reason: string;
  cleaned: string;
  topics: string[];
  cluster: string;
  concern: boolean;
}

const DISCARDED: ModerationResult = {
  allowed: false,
  reason: 'Freitext konnte nicht geprüft werden und wurde verworfen.',
  cleaned: '',
  topics: [],
  cluster: '',
  concern: false,
};

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
    const parsed = JSON.parse(cleaned) as {
      allowed?: unknown;
      reason?: unknown;
      cleaned?: unknown;
      topics?: unknown;
      cluster?: unknown;
      concern?: unknown;
    };

    const allowed = parsed.allowed === true;
    const topics = Array.isArray(parsed.topics)
      ? parsed.topics.filter(
          (topic): topic is string =>
            typeof topic === 'string' && (TOPIC_SLUGS as readonly string[]).includes(topic),
        )
      : [];

    return {
      allowed,
      reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 240) : '',
      cleaned: allowed && typeof parsed.cleaned === 'string' ? parsed.cleaned.slice(0, 280) : '',
      topics: allowed ? [...new Set(topics)].slice(0, 3) : [],
      cluster: allowed && typeof parsed.cluster === 'string' ? parsed.cluster.slice(0, 60) : '',
      concern: allowed && parsed.concern === true,
    };
  } catch {
    return DISCARDED;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let payload: { text?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Ungültiger JSON-Body' }, 400);
  }

  const text = typeof payload.text === 'string' ? payload.text.trim() : '';
  if (!text) return json({ error: 'text fehlt' }, 400);
  if (text.length > MAX_TEXT_LENGTH) {
    return json({ ...DISCARDED, reason: `Maximal ${MAX_TEXT_LENGTH} Zeichen.` });
  }

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) return json(DISCARDED);

  const model = Deno.env.get('OPENROUTER_MODEL') ?? DEFAULT_MODEL;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('APP_URL') ?? 'https://moodmap-cyan.vercel.app',
        'X-Title': 'Moodmap NRW',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 260,
        messages: [
          {
            role: 'system',
            content:
              'Du moderierst einen optionalen Freitext aus einer anonymen Schul-Umfrage. ' +
              'Entferne und neutralisiere Beleidigungen, Schimpfwörter, unpassende Jugendsprache, ' +
              'Hassrede, Drohungen, sexuelle Inhalte, Aufforderungen zu Gewalt sowie Namen, ' +
              'Klassen, Adressen, Telefonnummern und andere persönliche Angaben. ' +
              'Behalte die sachliche Bedeutung und formulieren den Text neutral um. ' +
              'Erkenne Krisen-/Gefährdungshinweise (z. B. Selbstverletzung, Gewalt gegen sich oder andere) ' +
              'und setze concern=true; dann keine Details wiedergeben. ' +
              `Ordne bis zu 3 Themen aus dieser Liste zu: ${TOPIC_SLUGS.join(', ')}. ` +
              'Antworte ausschließlich mit JSON: ' +
              '{"allowed": true|false, "reason": "kurz", "cleaned": "bereinigter Text", ' +
              '"topics": ["slug"], "cluster": "kurzes Cluster-Label", "concern": true|false}.',
          },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) return json(DISCARDED);

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    return json(parseModeration(content));
  } catch {
    return json(DISCARDED);
  }
});

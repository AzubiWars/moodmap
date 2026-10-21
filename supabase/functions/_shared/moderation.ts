/**
 * Shared moderation logic for optional free texts (ADR-016, PRODUCT_SPEC §3.13).
 *
 * This module has no Deno or DOM dependencies so it can be unit-tested with Vitest.
 * Raw text must never be logged or persisted; callers only receive the structured result.
 */

export const MAX_TEXT_LENGTH = 280;
export const DEFAULT_TIMEOUT_MS = 5_000;
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export const TOPIC_SLUGS = [
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

export interface ModerationResult {
  allowed: boolean;
  reason: string;
  cleaned: string;
  topics: string[];
  cluster: string;
  concern: boolean;
}

export const DISCARDED: ModerationResult = {
  allowed: false,
  reason: 'Freitext konnte nicht geprüft werden und wurde verworfen.',
  cleaned: '',
  topics: [],
  cluster: '',
  concern: false,
};

export const MODERATION_PROMPT =
  'Du moderierst einen optionalen Freitext aus einer anonymen Schul-Umfrage. ' +
  'Entferne und neutralisiere Beleidigungen, Schimpfwörter, unpassende Jugendsprache, ' +
  'Hassrede, Drohungen, sexuelle Inhalte, Aufforderungen zu Gewalt sowie Namen, ' +
  'Klassen, Adressen, Telefonnummern und andere persönliche Angaben. ' +
  'Behalte die sachliche Bedeutung und formuliere den Text neutral um. ' +
  'Erkenne Krisen-/Gefährdungshinweise (z. B. Selbstverletzung, Gewalt gegen sich oder andere) ' +
  'und setze concern=true; dann keine Details wiedergeben. ' +
  `Ordne bis zu 3 Themen aus dieser Liste zu: ${TOPIC_SLUGS.join(', ')}. ` +
  'Antworte ausschließlich mit JSON: ' +
  '{"allowed": true|false, "reason": "kurz", "cleaned": "bereinigter Text", ' +
  '"topics": ["slug"], "cluster": "kurzes Cluster-Label", "concern": true|false}.';

/** Parses the LLM answer defensively; anything unexpected becomes a discarded text. */
export function parseModeration(content: string): ModerationResult {
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
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return DISCARDED;

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
      cleaned: allowed && typeof parsed.cleaned === 'string' ? parsed.cleaned.slice(0, MAX_TEXT_LENGTH) : '',
      topics: allowed ? [...new Set(topics)].slice(0, 3) : [],
      // A missing cluster label must not discard an otherwise valid text; the RPC requires a label.
      cluster:
        allowed && typeof parsed.cluster === 'string' && parsed.cluster.trim()
          ? parsed.cluster.trim().slice(0, 60)
          : allowed
            ? 'Sonstiges'
            : '',
      // Crisis help must also show for rejected texts (PRODUCT_SPEC §3.13, PRIVACY §5).
      concern: parsed.concern === true,
    };
  } catch {
    return DISCARDED;
  }
}

export interface ModerateTextOptions {
  text: string;
  apiKey: string | undefined;
  model?: string;
  appUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Sends one text to OpenRouter and returns the structured moderation result.
 * Fail-closed for the free text: missing key, timeout, HTTP error or broken JSON → DISCARDED.
 * The caller must not persist `text`; only the returned `cleaned` value may be stored.
 */
export async function moderateText(options: ModerateTextOptions): Promise<ModerationResult> {
  const text = options.text.trim();
  if (!text || text.length > MAX_TEXT_LENGTH) {
    return {
      ...DISCARDED,
      reason: text ? `Maximal ${MAX_TEXT_LENGTH} Zeichen.` : 'Leerer Freitext.',
    };
  }
  if (!options.apiKey) return DISCARDED;

  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(OPENROUTER_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': options.appUrl ?? 'https://moodmap-cyan.vercel.app',
        'X-Title': 'Moodmap NRW',
      },
      body: JSON.stringify({
        model: options.model ?? DEFAULT_MODEL,
        temperature: 0,
        max_tokens: 260,
        messages: [
          { role: 'system', content: MODERATION_PROMPT },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) return DISCARDED;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return parseModeration(data.choices?.[0]?.message?.content ?? '');
  } catch {
    return DISCARDED;
  }
}

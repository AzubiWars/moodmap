/**
 * Submission flow for optional free texts (#126, ADR-016).
 *
 * The public endpoint is `submit-freetext`; it only calls OpenRouter for participants who already
 * have a response for the current wave. Therefore the endpoint cannot be used as a free LLM proxy.
 * Only the moderated `cleaned` text leaves this module; the raw text is never stored or logged.
 *
 * Dependency-injected so the whole flow can be tested with a mocked fetch (Vitest).
 */
import { MAX_TEXT_LENGTH, moderateText, type ModerationResult } from './moderation.ts';

export interface SubmitFreetextDeps {
  supabaseUrl: string;
  serviceRoleKey: string;
  openRouterKey?: string;
  openRouterModel?: string;
  appUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface FreetextSubmitResponse {
  ok: boolean;
  stored?: boolean;
  reason?: string;
  concern?: boolean;
  cluster?: string;
  topics?: string[];
}

export interface SubmitFreetextResult {
  status: number;
  body: FreetextSubmitResponse;
}

interface ParsedInput {
  schoolId: string;
  waveId: string;
  deviceToken: string;
  text: string;
}

function parseInput(input: unknown): ParsedInput | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  if (typeof value.schoolId !== 'string' || !value.schoolId.trim()) return null;
  if (typeof value.waveId !== 'string' || !/^\d{4}-W\d{2}$/.test(value.waveId)) return null;
  if (
    typeof value.deviceToken !== 'string' ||
    value.deviceToken.length < 16 ||
    value.deviceToken.length > 200
  )
    return null;
  if (typeof value.text !== 'string') return null;
  const text = value.text.trim();
  if (!text || text.length > MAX_TEXT_LENGTH) return null;
  return { schoolId: value.schoolId, waveId: value.waveId, deviceToken: value.deviceToken, text };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function restHeaders(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

/**
 * Returns the response id of the participant, `null` if there is none, or `'unavailable'` if the
 * lookup itself failed (then the caller must not spend an LLM call).
 */
async function findResponseId(
  input: ParsedInput,
  deps: SubmitFreetextDeps,
  fetchImpl: typeof fetch,
): Promise<string | null | 'unavailable'> {
  try {
    const url = new URL(`${deps.supabaseUrl}/rest/v1/responses`);
    url.searchParams.set('select', 'id');
    url.searchParams.set('school_id', `eq.${input.schoolId}`);
    url.searchParams.set('wave_id', `eq.${input.waveId}`);
    const normalHash = await sha256Hex(`${input.deviceToken}:${input.waveId}`);
    const pitchHash = await sha256Hex(`${input.deviceToken}:${input.waveId}:pitch`);
    // Both namespaces stay bound to the exact school and wave; SQL decides which one may store text.
    url.searchParams.set('device_hash', `in.(${normalHash},${pitchHash})`);
    const response = await fetchImpl(url, { headers: restHeaders(deps.serviceRoleKey) });
    if (!response.ok) return 'unavailable';
    const rows = (await response.json()) as Array<{ id?: unknown }>;
    return typeof rows[0]?.id === 'string' ? rows[0].id : null;
  } catch {
    return 'unavailable';
  }
}

/** Repeat calls for an already stored text must not trigger another LLM request. */
async function hasFreetext(
  responseId: string,
  deps: SubmitFreetextDeps,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  try {
    const url = new URL(`${deps.supabaseUrl}/rest/v1/freetext_entries`);
    url.searchParams.set('select', 'response_id');
    url.searchParams.set('response_id', `eq.${responseId}`);
    url.searchParams.set('limit', '1');
    const response = await fetchImpl(url, { headers: restHeaders(deps.serviceRoleKey) });
    if (!response.ok) return false;
    const rows = (await response.json()) as unknown[];
    return rows.length > 0;
  } catch {
    // Do not block the text just because the pre-check failed; record_freetext still enforces
    // the one-entry-per-response rule.
    return false;
  }
}

async function recordFreetext(
  input: ParsedInput,
  moderation: ModerationResult,
  deps: SubmitFreetextDeps,
  fetchImpl: typeof fetch,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const response = await fetchImpl(`${deps.supabaseUrl}/rest/v1/rpc/record_freetext`, {
      method: 'POST',
      headers: restHeaders(deps.serviceRoleKey),
      body: JSON.stringify({
        input: {
          schoolId: input.schoolId,
          waveId: input.waveId,
          deviceToken: input.deviceToken,
          // Only the moderated text is sent to the database. Never `input.text`.
          cleaned: moderation.cleaned,
          topics: moderation.topics,
          cluster: moderation.cluster,
          concern: moderation.concern,
        },
      }),
    });
    if (!response.ok) return { ok: false, reason: 'storage_failed' };
    const result = (await response.json()) as { ok?: unknown; reason?: unknown };
    if (result?.ok === true) return { ok: true };
    return {
      ok: false,
      reason: typeof result?.reason === 'string' ? result.reason : 'storage_failed',
    };
  } catch {
    return { ok: false, reason: 'storage_failed' };
  }
}

export async function submitFreetext(
  input: unknown,
  deps: SubmitFreetextDeps,
): Promise<SubmitFreetextResult> {
  const parsed = parseInput(input);
  if (!parsed) return { status: 400, body: { ok: false, reason: 'invalid' } };
  if (!deps.supabaseUrl || !deps.serviceRoleKey) {
    return { status: 503, body: { ok: false, reason: 'unavailable' } };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const responseId = await findResponseId(parsed, deps, fetchImpl);
  if (responseId === 'unavailable') {
    return { status: 503, body: { ok: false, reason: 'unavailable' } };
  }
  if (responseId === null) {
    // No survey participation for this device/wave: do not call the LLM at all.
    return { status: 403, body: { ok: false, reason: 'no_response' } };
  }
  if (await hasFreetext(responseId, deps, fetchImpl)) {
    return { status: 200, body: { ok: true, stored: false, reason: 'already_submitted' } };
  }

  const moderation = await moderateText({
    text: parsed.text,
    apiKey: deps.openRouterKey,
    model: deps.openRouterModel,
    appUrl: deps.appUrl,
    timeoutMs: deps.timeoutMs,
    fetchImpl,
  });

  if (!moderation.allowed || !moderation.cleaned.trim()) {
    // Fail-open for the survey, fail-closed for the free text.
    return {
      status: 200,
      body: { ok: true, stored: false, reason: moderation.reason || 'rejected', concern: moderation.concern },
    };
  }

  const stored = await recordFreetext(parsed, moderation, deps, fetchImpl);
  if (!stored.ok) {
    return {
      status: 200,
      body: {
        ok: true,
        stored: false,
        reason: stored.reason,
        concern: moderation.concern,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      stored: true,
      concern: moderation.concern,
      cluster: moderation.cluster,
      topics: moderation.topics,
    },
  };
}

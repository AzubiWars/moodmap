// @vitest-environment node
// Moderation unit tests with a mocked LLM (#126). No network, no real personal data.
import { describe, expect, it, vi } from 'vitest';
import { TOPICS } from '../../src/data/topics.ts';
import {
  DISCARDED,
  MAX_TEXT_LENGTH,
  TOPIC_SLUGS,
  moderateText,
  parseModeration,
  type ModerationResult,
} from '../functions/_shared/moderation.ts';

const valid = (overrides: Partial<ModerationResult> = {}): ModerationResult => ({
  allowed: true,
  reason: '',
  cleaned: 'Eine Lehrkraft ist oft zu schnell und die Toiletten sind kaputt.',
  topics: ['learning', 'building'],
  cluster: 'Unterricht & Gebäude',
  concern: false,
  ...overrides,
});

function llmResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const apiKey = 'test-key';

describe('TOPIC_SLUGS', () => {
  it('matches the survey topic catalog', () => {
    // Freitext gibt es nur für Schüler:innen; Lehrkräfte-Themen (`t_*`, #37) gehören nicht dazu.
    const studentTopics = TOPICS.filter((topic) => topic.audience.includes('student'));
    expect([...TOPIC_SLUGS].sort()).toEqual(studentTopics.map((topic) => topic.slug).sort());
  });
});

describe('parseModeration', () => {
  it.each([
    [
      'insult → rejected',
      { allowed: false, reason: 'Beleidigung', cleaned: '', topics: [], cluster: '', concern: false },
      { allowed: false, cleaned: '', topics: [], cluster: '' },
    ],
    [
      'youth language → neutralised',
      {
        allowed: true,
        reason: '',
        cleaned: 'Das ist sehr unpassend ausgedrückt.',
        topics: ['community'],
        cluster: 'Umgangston',
        concern: false,
      },
      { allowed: true, cleaned: 'Das ist sehr unpassend ausgedrückt.', topics: ['community'] },
    ],
    [
      'name → removed',
      {
        allowed: true,
        reason: '',
        cleaned: 'Eine Lehrkraft ist oft zu schnell.',
        topics: ['learning'],
        cluster: 'Unterricht',
        concern: false,
      },
      { allowed: true, cleaned: 'Eine Lehrkraft ist oft zu schnell.', topics: ['learning'] },
    ],
    [
      'crisis signal → concern',
      {
        allowed: true,
        reason: '',
        cleaned: 'Ich brauche gerade Hilfe.',
        topics: ['wellbeing'],
        cluster: 'Belastung',
        concern: true,
      },
      { allowed: true, concern: true, cluster: 'Belastung' },
    ],
    [
      'rejected crisis signal → still concern',
      { allowed: false, reason: 'Gewalt', cleaned: '', topics: [], cluster: '', concern: true },
      { allowed: false, cleaned: '', concern: true },
    ],
  ])('%s', (_, payload, expected) => {
    expect(parseModeration(JSON.stringify(payload))).toMatchObject(expected);
  });

  it('filters unknown topics, de-duplicates and keeps at most three', () => {
    const result = parseModeration(
      JSON.stringify({
        allowed: true,
        cleaned: 'Text',
        topics: ['learning', 'learning', 'not-a-topic', 'stress', 'ai', 'voice'],
        cluster: 'Cluster',
        concern: false,
      }),
    );
    expect(result.topics).toEqual(['learning', 'stress', 'ai']);
  });

  it('strips markdown fences around the JSON object', () => {
    const payload = JSON.stringify({ allowed: true, cleaned: 'Text', topics: [], cluster: 'X' });
    expect(parseModeration('```json\n' + payload + '\n```')).toMatchObject({
      allowed: true,
      cleaned: 'Text',
    });
  });

  it('falls back to a neutral cluster when the LLM omits the label', () => {
    expect(parseModeration(JSON.stringify({ allowed: true, cleaned: 'Text', topics: [] }))).toMatchObject({
      allowed: true,
      cluster: 'Sonstiges',
    });
  });

  it('returns DISCARDED for broken JSON and non-object output', () => {
    expect(parseModeration('not json')).toEqual(DISCARDED);
    expect(parseModeration('null')).toEqual(DISCARDED);
    expect(parseModeration('[]')).toEqual(DISCARDED);
  });
});

describe('moderateText', () => {
  it('sends the text once and returns the structured result', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(llmResponse(valid()));
    const result = await moderateText({ text: '  Toiletten kaputt  ', apiKey, fetchImpl });

    expect(result).toEqual(valid());
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${apiKey}` });
    expect(init?.body).toContain('Toiletten kaputt');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ['timeout', () => Promise.reject(new Error('aborted'))],
    ['network error', () => Promise.reject(new Error('offline'))],
    ['http error', () => Promise.resolve(new Response('nope', { status: 500 }))],
    ['broken JSON', () => Promise.resolve(new Response('not json', { status: 200 }))],
  ])('fails closed on %s', async (_, impl) => {
    const result = await moderateText({
      text: 'Ein normaler Text',
      apiKey,
      fetchImpl: impl as unknown as typeof fetch,
    });
    expect(result).toEqual(DISCARDED);
  });

  it('times out after the configured limit', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const result = await moderateText({ text: 'Text', apiKey, timeoutMs: 5, fetchImpl });
    expect(result).toEqual(DISCARDED);
  });

  it('does not call the LLM without an API key', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const result = await moderateText({ text: 'Text', apiKey: undefined, fetchImpl });
    expect(result).toEqual(DISCARDED);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('does not call the LLM for empty or too long text', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    await expect(moderateText({ text: '   ', apiKey, fetchImpl })).resolves.toMatchObject({
      allowed: false,
    });
    await expect(
      moderateText({ text: 'x'.repeat(MAX_TEXT_LENGTH + 1), apiKey, fetchImpl }),
    ).resolves.toMatchObject({ allowed: false, reason: `Maximal ${MAX_TEXT_LENGTH} Zeichen.` });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

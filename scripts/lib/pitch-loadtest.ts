import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { MANDATORY_TOPIC_SLUGS } from '../../src/data/topics.ts';

interface Options {
  url: string;
  anonKey: string;
  joinCode?: string;
  resetPin?: string;
  resetAfter?: boolean;
  count?: number;
  durationMs?: number;
  pollMs?: number;
  fetcher?: typeof fetch;
}
interface Sample {
  ms: number;
  failure: string | null;
}
interface Pitch {
  school: { id: string; isTest: true };
  waveId: string;
  n: number;
}
type Body = Record<string, unknown>;
const object = (value: unknown): Body =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Body) : {};

/** Only fixed codes leave the runner. Never include responses, tokens, PINs or network error text. */
export class LoadTestError extends Error {}

/** Public REST/Edge headers for both supported key types (#195). */
export function loadTestHeaders(key: string): Record<string, string> {
  if (key.startsWith('sb_publishable_')) {
    // Deployed with --no-verify-jwt; the server still checks participation, claim and PIN.
    return { apikey: key, 'Content-Type': 'application/json' };
  }
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString()) as Body;
    if (key.split('.').length !== 3 || payload.role !== 'anon') throw new Error();
  } catch {
    throw new LoadTestError('public_key_required');
  }
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

function pitch(value: unknown): Pitch {
  const row = object(value);
  const school = object(row.school);
  if (
    school.id !== 'pitch-test' ||
    school.isTest !== true ||
    typeof row.waveId !== 'string' ||
    !/^\d{4}-W\d{2}$/.test(row.waveId) ||
    !Number.isInteger(row.n) ||
    Number(row.n) < 0
  )
    throw new LoadTestError('invalid_pitch_state');
  return row as unknown as Pitch;
}

export function summarizeSamples(samples: Sample[]) {
  const sorted = samples.map((sample) => sample.ms).sort((a, b) => a - b);
  const percentile = (p: number) =>
    sorted.length ? Math.round(sorted[Math.ceil(sorted.length * p) - 1]!) : null;
  const failures: Record<string, number> = {};
  for (const sample of samples)
    if (sample.failure) failures[sample.failure] = (failures[sample.failure] ?? 0) + 1;
  const failed = Object.values(failures).reduce((sum, count) => sum + count, 0);
  return {
    requests: samples.length,
    failed,
    failureRate: samples.length ? failed / samples.length : 0,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    maxMs: sorted.length ? Math.round(sorted.at(-1)!) : null,
    failures,
  };
}

/** Sends only synthetic submissions to the fixed is_test school, never to NRW schools. */
export async function runPitchLoadTest(options: Options) {
  const count = options.count ?? 200;
  const durationMs = options.durationMs ?? 120_000;
  const pollMs = options.pollMs ?? 2_500;
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 200 ||
    !Number.isFinite(durationMs) ||
    durationMs < 0 ||
    !Number.isFinite(pollMs) ||
    pollMs < 1
  )
    throw new LoadTestError('invalid_run_options');
  let url: URL;
  try {
    url = new URL(options.url);
  } catch {
    throw new LoadTestError('invalid_url');
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    !(
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    )
  ) {
    throw new LoadTestError('invalid_url');
  }
  const headers = loadTestHeaders(options.anonKey);
  if (
    options.resetAfter &&
    (!options.resetPin || options.resetPin.length < 8 || options.resetPin.length > 200)
  ) {
    throw new LoadTestError('reset_pin_required');
  }
  const fetcher = options.fetcher ?? fetch;
  async function request(path: string, body: unknown) {
    try {
      const response = await fetcher(`${url.origin}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
        cache: 'no-store',
      });
      if (!response.ok) return { body: {} as Body, failure: `http_${response.status}` };
      return { body: object(await response.json()), failure: null };
    } catch {
      return { body: {} as Body, failure: 'network_or_invalid_json' };
    }
  }
  async function required(path: string, body: unknown): Promise<Body> {
    const result = await request(path, body);
    if (result.failure) throw new LoadTestError('control_request_failed');
    return result.body;
  }
  const rpc = (name: string) => `/rest/v1/rpc/${name}`;
  const school = await required(rpc('get_school_by_code'), { code: options.joinCode ?? 'PITCH' });
  if (school.id !== 'pitch-test' || school.isTest !== true) throw new LoadTestError('test_school_required');
  const before = pitch(await required(rpc('get_pitch_aggregate'), {}));
  if (before.n !== 0) throw new LoadTestError('pitch_must_be_empty');
  // Preserve the array response; compare aggregate values only in memory, never in the report.
  const nrwRequest = async () => {
    try {
      const response = await fetcher(`${url.origin}${rpc('get_aggregates')}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: { level: 'nrw', topic: 'all' } }),
        signal: AbortSignal.timeout(15_000),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error();
      const rows: unknown = await response.json();
      if (!Array.isArray(rows) || rows.length !== 1 || object(rows[0]).id !== 'nrw') throw new Error();
      return JSON.stringify(rows);
    } catch {
      throw new LoadTestError('nrw_check_failed');
    }
  };
  const nrwBefore = await nrwRequest();
  const submissions: Sample[] = [],
    moderation: Sample[] = [],
    polling: Sample[] = [];
  const firstToken = `synthetic-pitch-${randomUUID()}`;
  const input = (index: number) => ({
    schoolId: 'pitch-test',
    waveId: before.waveId,
    deviceToken: index === 0 ? firstToken : `synthetic-pitch-${randomUUID()}`,
    role: 'student',
    gradeBand: ['5-7', '8-10', 'oberstufe', 'berufskolleg'][index % 4],
    answers: MANDATORY_TOPIC_SLUGS.map((slug, i) => ({
      questionId: `${slug}.core`,
      value: 1 + ((index + i) % 5),
    })),
  });
  let pollingBusy = false;
  let pendingPoll: Promise<void> = Promise.resolve();
  async function poll() {
    if (pollingBusy) return;
    pollingBusy = true;
    const start = performance.now();
    const result = await request(rpc('get_pitch_aggregate'), {});
    let failure = result.failure;
    try {
      if (!failure && pitch(result.body).waveId !== before.waveId) failure = 'wave_changed';
    } catch {
      failure = 'invalid_pitch_state';
    }
    polling.push({ ms: performance.now() - start, failure });
    pollingBusy = false;
  }
  const start = performance.now();
  const interval = setInterval(() => {
    if (!pollingBusy) pendingPoll = poll();
  }, pollMs);
  try {
    await poll();
    const jobs: Promise<void>[] = [];
    for (let i = 0; i < count; i++) {
      const due = count === 1 ? 0 : (i * durationMs) / (count - 1);
      await delay(Math.max(0, due - (performance.now() - start)));
      const payload = input(i);
      jobs.push(
        (async () => {
          const at = performance.now();
          const result = await request(rpc('submit_response'), { input: payload });
          const failure = result.failure ?? (result.body.ok === true ? null : 'submission_rejected');
          submissions.push({ ms: performance.now() - at, failure });
          // Exactly 30% at the full 200-person size; balanced across the arrival window.
          if (failure || i % 10 >= 3) return;
          const textStart = performance.now();
          const text = await request('/functions/v1/submit-freetext', {
            schoolId: payload.schoolId,
            waveId: payload.waveId,
            deviceToken: payload.deviceToken,
            text: [
              'Ich wünsche mir mehr Pausen und weniger Leistungsdruck.',
              'Bitte mehr Mitsprache bei Entscheidungen in der Schule.',
              'Wir brauchen klare Erklärungen zum Einsatz von KI.',
            ][i % 3],
          });
          moderation.push({
            ms: performance.now() - textStart,
            failure:
              text.failure ?? (text.body.ok === true && text.body.stored === true ? null : 'text_not_stored'),
          });
        })(),
      );
    }
    await Promise.all(jobs);
  } finally {
    clearInterval(interval);
    await pendingPoll;
  }
  await poll();
  const controlFailures: string[] = [];
  const checks = {
    countMatches: false,
    duplicateRejected: false,
    nrwUnchanged: false,
    resetVerified: null as boolean | null,
    resubmissionVerified: null as boolean | null,
  };
  try {
    const after = pitch(await required(rpc('get_pitch_aggregate'), {}));
    const duplicate = await request(rpc('submit_response'), { input: input(0) });
    checks.countMatches = after.n === count && after.waveId === before.waveId;
    checks.duplicateRejected =
      !duplicate.failure && duplicate.body.ok === false && duplicate.body.reason === 'already_submitted';
    checks.nrwUnchanged = (await nrwRequest()) === nrwBefore;
    if (options.resetAfter) {
      async function reset() {
        const result = await required('/functions/v1/pitch-reset', { pin: options.resetPin });
        if (result.ok !== true) throw new LoadTestError('reset_failed');
        return pitch(await required(rpc('get_pitch_aggregate'), {}));
      }
      checks.resetVerified = (await reset()).n === 0;
      if (checks.resetVerified) {
        const again = await request(rpc('submit_response'), { input: input(0) });
        checks.resubmissionVerified =
          !again.failure &&
          again.body.ok === true &&
          pitch(await required(rpc('get_pitch_aggregate'), {})).n === 1;
        checks.resetVerified = (await reset()).n === 0;
      }
      checks.nrwUnchanged = checks.nrwUnchanged && (await nrwRequest()) === nrwBefore;
    }
  } catch (error) {
    controlFailures.push(error instanceof LoadTestError ? error.message : 'control_request_failed');
  }
  const metrics = {
    submitResponse: summarizeSamples(submissions),
    moderation: summarizeSamples(moderation),
    aggregatePolling: summarizeSamples(polling),
  };
  return {
    mode: 'synthetic-pitch',
    participants: count,
    plannedTextCount: Math.floor(count / 10) * 3 + Math.min(count % 10, 3),
    scheduledDurationMs: durationMs,
    elapsedMs: Math.round(performance.now() - start),
    metrics,
    checks,
    controlFailures,
    beamerVisualCheck: 'manual_required',
    passed:
      controlFailures.length === 0 &&
      Object.values(metrics).every((entry) => entry.failed === 0) &&
      Object.values(checks).every((value) => value !== false),
  };
}

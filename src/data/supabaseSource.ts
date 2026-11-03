import type {
  AggregateRow,
  Distribution,
  FreetextCluster,
  PitchAggregate,
  PolicyAnswer,
  School,
  TrendPoint,
  Wave,
} from '@/types';
import { getDeviceToken } from '@/lib/device';
import { K_MIN } from '@/lib/env';
import type { DataSource, NewResponseEvent } from './api';
import { expandMinifiedSchools, type MinifiedSchools } from './schoolDirectory';

interface Options {
  url: string;
  anonKey: string;
  fetcher?: typeof fetch;
  /** Static school directory from the app origin; separate from the Supabase REST fetcher. */
  directoryFetcher?: typeof fetch;
  /** Supabase Auth JWT, when a future authenticated publisher is available. Never a service key. */
  accessToken?: () => string | undefined;
  channelFactory?: ((name: string) => BroadcastChannel) | null;
}

const CHANNEL = 'moodmap:supabase:updates:v1';
const minimum = Number.isInteger(K_MIN) ? Math.max(10, K_MIN) : 10;

/** REST uses only public master data and existing aggregate/write RPCs; never raw response tables. */
export function createSupabaseSource(options: Options): DataSource & { dispose(): void } {
  const base = options.url.replace(/\/$/, '');
  if (!base || !options.anonKey || options.anonKey.startsWith('sb_secret_')) {
    throw new Error('Supabase benötigt eine URL und einen öffentlichen anon/publishable Key.');
  }
  // Catch the other common accidental admin-key configuration before any request leaves the browser.
  let isServiceRole = false;
  try {
    const payload = options.anonKey.split('.')[1];
    isServiceRole =
      !!payload &&
      JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/'))).role === 'service_role';
  } catch {
    /* Non-JWT publishable keys have no payload. */
  }
  if (isServiceRole) {
    throw new Error('Ein service_role-Key darf nicht im Frontend verwendet werden.');
  }
  const fetcher = options.fetcher ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const directoryFetcher =
    options.directoryFetcher ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const listeners = new Set<(event: NewResponseEvent) => void>();
  const channelFactory =
    options.channelFactory === undefined
      ? typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
        ? (name: string) => new BroadcastChannel(name)
        : null
      : options.channelFactory;
  let channel: BroadcastChannel | undefined;
  const notify = (event: NewResponseEvent) => {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        /* A view refresh cannot change a successful submission. */
      }
    }
  };
  const connect = () => {
    if (channel || !channelFactory) return;
    try {
      channel = channelFactory(CHANNEL);
      channel.onmessage = ({ data }: MessageEvent<unknown>) => {
        if (data && typeof data === 'object' && 'schoolId' in data && typeof data.schoolId === 'string') {
          notify({ schoolId: data.schoolId });
        }
      };
    } catch {
      /* Polling works even if cross-tab notifications are unavailable. */
    }
  };
  const announce = (schoolId: string) => {
    notify({ schoolId });
    connect();
    try {
      channel?.postMessage({ schoolId });
    } catch {
      /* Submission is already stored. */
    }
    if (listeners.size === 0) {
      channel?.close();
      channel = undefined;
    }
  };
  async function request(path: string, init: RequestInit = {}, prefix = 'rest/v1'): Promise<Response> {
    const token = options.accessToken?.();
    const headers = new Headers(init.headers);
    headers.set('apikey', options.anonKey);
    // Publishable keys are not JWTs. Legacy anon keys can also serve as the anonymous bearer JWT.
    if (token || !options.anonKey.startsWith('sb_publishable_')) {
      headers.set('Authorization', `Bearer ${token || options.anonKey}`);
    }
    headers.set('Content-Type', 'application/json');
    try {
      const response = await fetcher(`${base}/${prefix}/${path}`, {
        ...init,
        headers,
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      });
      if (response.ok) return response;
    } catch {
      /* Do not expose request bodies, device tokens or backend error details. */
    }
    throw new Error('Die Live-Daten konnten nicht geladen oder gespeichert werden. Bitte erneut versuchen.');
  }
  const rpc = async <T>(name: string, body: object): Promise<T> => {
    const response = await request(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });
    return response.json() as Promise<T>;
  };
  const protect = <T extends AggregateRow | TrendPoint>(rows: T[]): T[] =>
    rows.map((row) =>
      row.n < minimum
        ? {
            ...row,
            score: null,
            ...('delta' in row
              ? {
                  delta: null,
                  topicScores: Object.fromEntries(
                    Object.keys(row.topicScores ?? {}).map((topic) => [topic, null]),
                  ),
                  distribution: null,
                }
              : {}),
          }
        : row,
    );
  const schoolSelect =
    'id,name,schoolForm:school_form,kreisId:kreis_id,city,lat,lon,studentCount:student_count';
  const withJoinCode = (rows: Omit<School, 'joinCode'>[]): School[] =>
    rows.map((school) => ({ ...school, joinCode: '' }));

  /** One cached static request instead of the previous ~11 sequential REST pages (#249). */
  async function loadStaticSchools(): Promise<School[]> {
    const response = await directoryFetcher('/data/schools.min.json', {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Schulverzeichnis: HTTP ${response.status}`);
    return expandMinifiedSchools((await response.json()) as MinifiedSchools);
  }

  async function loadSchoolsFromRest(): Promise<School[]> {
    const page = async (offset: number, limit: number, count = false) => {
      const params = new URLSearchParams({
        select: schoolSelect,
        order: 'id.asc',
        limit: String(limit),
        offset: String(offset),
      });
      const response = await request(
        `schools?${params}`,
        count ? { headers: { Prefer: 'count=exact' } } : {},
      );
      return {
        rows: (await response.json()) as Omit<School, 'joinCode'>[],
        total: response.headers.get('content-range')?.split('/')[1],
      };
    };

    const first = await page(0, 1000, true);
    if (first.rows.length === 0) return [];
    const total = Number(first.total);

    if (!Number.isFinite(total)) {
      // No usable count header: keep paging until an empty page, using the real page size.
      const rows = [...first.rows];
      const step = rows.length;
      for (;;) {
        const next = await page(rows.length, step);
        if (next.rows.length === 0) break;
        rows.push(...next.rows);
      }
      return withJoinCode(rows);
    }
    if (total <= first.rows.length) return withJoinCode(first.rows);

    // The server may cap a page below the requested limit. Use the actual first-page size as the
    // offset step and fetch the remaining pages in parallel.
    const pageSize = first.rows.length;
    const offsets: number[] = [];
    for (let offset = pageSize; offset < total; offset += pageSize) offsets.push(offset);
    const pages = await Promise.all(offsets.map((offset) => page(offset, pageSize)));
    return withJoinCode([...first.rows, ...pages.flatMap((page) => page.rows)]);
  }

  const source: DataSource & { dispose(): void } = {
    async getSchools() {
      try {
        return await loadStaticSchools();
      } catch {
        // Older deployments/caches may not have the compact file; the REST API stays the fallback.
        return loadSchoolsFromRest();
      }
    },
    getSchoolByCode: (code) => rpc('get_school_by_code', { code }),
    async getTopics() {
      const response = await request(
        'topics?select=slug,title,icon,audience,mandatory,sort,priority&order=sort.asc',
      );
      return response.json();
    },
    async getCurrentWave() {
      const wave = await rpc<Wave | null>('get_current_wave', {});
      if (!wave) throw new Error('Zurzeit ist keine Umfragewoche verfügbar. Bitte später erneut versuchen.');
      return wave;
    },
    async submitResponse(input) {
      try {
        const result = await rpc<{ ok: boolean; reason?: string }>('submit_response', { input });
        if (result.ok === true) {
          announce(input.schoolId);
          return { ok: true };
        }
        return { ok: false, reason: result.reason === 'already_submitted' ? 'already_submitted' : 'error' };
      } catch {
        return { ok: false, reason: 'error' };
      }
    },
    async deleteOwnResponse(input) {
      try {
        const result = await rpc<{ ok: boolean; reason?: string }>('delete_own_response', { input });
        if (result.ok === true) return { ok: true };
        return { ok: false, reason: result.reason === 'not_found' ? 'not_found' : 'error' };
      } catch {
        return { ok: false, reason: 'error' };
      }
    },
    getAggregates: async (query) => protect(await rpc<AggregateRow[]>('get_aggregates', { query })),
    getTrend: async (query) => protect(await rpc<TrendPoint[]>('get_trend', { query })),
    async getChoiceDistribution(questionId, scope) {
      const data = await rpc<Distribution | null>('get_choice_distribution', {
        question_id: questionId,
        scope,
      });
      if (!data || data.n < minimum) return null;
      return {
        ...data,
        options: data.options.map((option) => ({
          ...option,
          count: option.count !== null && option.count < 3 ? null : option.count,
        })),
      };
    },
    getTensionIndex: (query) => rpc('get_tension_index', { query }),
    async getPitchAggregate() {
      const data = await rpc<PitchAggregate>('get_pitch_aggregate', {});
      if (!data?.school || !data.waveId) throw new Error('Keine aktive Pitch-Runde verfügbar.');
      const masked = data.scoredN < minimum;
      return {
        ...data,
        score: masked ? null : data.score,
        topicScores: Object.fromEntries(
          Object.entries(data.topicScores ?? {}).map(([slug, score]) => [slug, masked ? null : score]),
        ),
      };
    },
    getFreetextClusters: (scope) => rpc<FreetextCluster[]>('get_freetext_clusters', { scope }),
    async resetPitchTest(pin) {
      if (typeof pin !== 'string' || pin.length < 8 || pin.length > 200) return { ok: false };
      try {
        const response = await request(
          'pitch-reset',
          { method: 'POST', body: JSON.stringify({ pin }) },
          'functions/v1',
        );
        const result: unknown = await response.json();
        if (!result || typeof result !== 'object' || !('ok' in result) || result.ok !== true)
          return { ok: false };
        announce('pitch-test');
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },
    async getPolicyAnswers(filter) {
      return (await rpc<PolicyAnswer[]>('get_policy_answers', { filter })).map((answer) => ({
        ...answer,
        resonance: {
          ...answer.resonance,
          score: answer.resonance.n < minimum ? null : answer.resonance.score,
        },
      }));
    },
    publishPolicyAnswer: (input) => rpc('publish_policy_answer', { input }),
    async ratePolicyAnswer(answerId, value) {
      try {
        return await rpc('rate_policy_answer', {
          answer_id: answerId,
          value,
          device_token: getDeviceToken(),
        });
      } catch {
        return { ok: false };
      }
    },
    subscribeToNewResponses(callback) {
      listeners.add(callback);
      connect();
      return () => {
        listeners.delete(callback);
        if (listeners.size === 0) {
          channel?.close();
          channel = undefined;
        }
      };
    },
    dispose() {
      listeners.clear();
      channel?.close();
      channel = undefined;
    },
  };
  return source;
}

export function createConfiguredSupabaseSource(): DataSource | undefined {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && anonKey ? createSupabaseSource({ url, anonKey }) : undefined;
}

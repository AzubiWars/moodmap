import type { AggregateQuery, AnswerInput, ResponseInput, SubmitResult, Wave } from '@/types';
import { isGradeBand, isRole } from '@/types';
import { hashDeviceToken } from '@/lib/device';
import { K_MIN } from '@/lib/env';
import type { DataSource, NewResponseEvent } from './api';
import { aggregateRows, schoolInScope } from './mockAggregates';
import { createMockPolicyApi } from './mockPolicy';
import type { MockDataset, StoredSubmission } from './mockRecords';
import { browserStorage, createMockStorage } from './mockStorage';
import { QUESTIONS_BY_ID, TOPICS } from './topics';

export const MOCK_CHANNEL = 'moodmap:mock:v1';
const kMin = Number.isInteger(K_MIN) ? Math.max(10, K_MIN) : 10;

export interface MockSourceOptions {
  loadData: () => Promise<MockDataset>;
  storage?: Storage | null;
  channel?: BroadcastChannel | null;
  now?: () => Date;
}

export function validAnswers(answers: AnswerInput[], role: ResponseInput['role']): boolean {
  if (!Array.isArray(answers) || new Set(answers.map((a) => a?.questionId)).size !== answers.length)
    return false;
  return answers.every((answer) => {
    const question = QUESTIONS_BY_ID[answer?.questionId];
    if (!question || (question.audience && question.audience !== role)) return false;
    if (question.type === 'choice') {
      return (
        !('value' in answer) &&
        Array.isArray(answer.choice) &&
        answer.choice.length > 0 &&
        (question.multiple || answer.choice.length === 1) &&
        new Set(answer.choice).size === answer.choice.length &&
        answer.choice.every((choice) => question.options?.some((option) => option.value === choice))
      );
    }
    return (
      !('choice' in answer) &&
      Number.isInteger(answer.value) &&
      (question.type === 'mood5'
        ? answer.value! >= 1 && answer.value! <= 5
        : answer.value === 0 || answer.value === 1)
    );
  });
}

function orderedWaves(data: MockDataset): Wave[] {
  return [...data.waves].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function previousWaves(data: MockDataset, selected: string[]): string[] {
  const waves = orderedWaves(data);
  const index = waves.findIndex((wave) => selected.includes(wave.id));
  return index < 0 ? [] : waves.slice(Math.max(0, index - selected.length), index).map((wave) => wave.id);
}

/** Vollständiger Mock-Vertrag. Seed bleibt privat; nur Aggregate verlassen diese API. */
export function createMockSource(options: MockSourceOptions): DataSource & { dispose(): void } {
  const storage = createMockStorage(options.storage === undefined ? browserStorage() : options.storage);
  const now = options.now ?? (() => new Date());
  let basePromise: Promise<MockDataset> | undefined;
  const base = () =>
    (basePromise ??= options.loadData().catch((error) => {
      basePromise = undefined;
      throw error;
    }));
  const listeners = new Set<(event: NewResponseEvent) => void>();
  let channel: BroadcastChannel | null = options.channel ?? null;
  const notify = (event: NewResponseEvent) => {
    for (const callback of listeners) {
      try {
        callback(event);
      } catch {
        /* Ein Subscriber darf die Abgabe nicht fehlschlagen lassen. */
      }
    }
  };
  const receive = (event: MessageEvent) => {
    if (event.data?.type === 'response' && typeof event.data.schoolId === 'string')
      notify({ schoolId: event.data.schoolId });
  };
  let listening = false;
  const startChannel = () => {
    if (!channel && options.channel === undefined && typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(MOCK_CHANNEL);
      } catch {
        /* Speicher-/Tab-API optional im Demo-Fallback. */
      }
    }
    if (channel && !listening) {
      channel.addEventListener('message', receive);
      listening = true;
    }
  };

  const currentWave = (data: MockDataset) => {
    const time = now().getTime();
    const wave = data.waves.find(
      (wave) => Date.parse(wave.startsAt) <= time && time < Date.parse(wave.endsAt),
    );
    if (!wave) throw new Error('Keine aktive Demo-Welle. Bitte den Demo-Seed aktualisieren.');
    return wave;
  };
  const waveIds = (data: MockDataset, query: AggregateQuery) => query.waveIds ?? [currentWave(data).id];
  const submissions = () =>
    storage
      .entries<StoredSubmission>('response')
      .map(([, entry]) => entry)
      .filter(
        (entry) =>
          entry?.response &&
          typeof entry.response.id === 'string' &&
          typeof entry.response.schoolId === 'string' &&
          typeof entry.response.waveId === 'string' &&
          isRole(entry.response.role) &&
          (entry.response.gradeBand == null || isGradeBand(entry.response.gradeBand)) &&
          validAnswers(entry.answers, entry.response.role),
      );
  const snapshot = async (): Promise<MockDataset> => {
    const seed = await base();
    const extra = submissions();
    return extra.length
      ? {
          ...seed,
          responses: [...seed.responses, ...extra.map((entry) => entry.response)],
          answers: [...seed.answers, ...extra.flatMap((entry) => entry.answers)],
        }
      : seed;
  };
  const rows = async (query: AggregateQuery) => {
    const data = await snapshot();
    const selected = waveIds(data, query);
    return aggregateRows(data, query, selected, previousWaves(data, selected), kMin);
  };

  const source: DataSource & { dispose(): void } = {
    async getSchools() {
      return structuredClone((await base()).schools.filter((school) => !school.isTest));
    },
    async getSchoolByCode(code) {
      const school = (await base()).schools.find((school) => school.joinCode === code.trim().toUpperCase());
      return school ? structuredClone(school) : null;
    },
    async getTopics() {
      return structuredClone([...TOPICS]);
    },
    async getCurrentWave() {
      return { ...currentWave(await base()) };
    },
    async submitResponse(input) {
      try {
        const data = await base();
        if (
          !input ||
          !isRole(input.role) ||
          (input.gradeBand !== undefined && !isGradeBand(input.gradeBand)) ||
          typeof input.deviceToken !== 'string' ||
          !input.deviceToken.trim() ||
          input.deviceToken.length > 200 ||
          !data.schools.some((school) => school.id === input.schoolId) ||
          input.waveId !== currentWave(data).id ||
          !validAnswers(input.answers, input.role)
        )
          return { ok: false, reason: 'error' };
        const test = data.schools.find((school) => school.id === input.schoolId)?.isTest;
        const key = await hashDeviceToken(input.deviceToken, input.waveId + (test ? ':pitch' : ''));
        const commit = (): SubmitResult => {
          // Ein separater Key je Gerät/Welle verhindert verlorene Updates anderer Geräte.
          if (storage.entries('response').some(([id]) => id === key))
            return { ok: false, reason: 'already_submitted' };
          const id = crypto.randomUUID();
          const submission: StoredSubmission = {
            response: {
              id,
              schoolId: input.schoolId,
              waveId: input.waveId,
              role: input.role,
              ...(input.gradeBand ? { gradeBand: input.gradeBand } : {}),
              createdAt: now().toISOString().slice(0, 10),
            },
            answers: input.answers.map((answer) =>
              'value' in answer
                ? { responseId: id, questionId: answer.questionId, value: answer.value! }
                : { responseId: id, questionId: answer.questionId, choice: [...answer.choice] },
            ),
          };
          storage.put('response', key, submission);
          const event = { schoolId: input.schoolId };
          notify(event);
          startChannel();
          try {
            channel?.postMessage({ type: 'response', ...event });
          } catch {
            /* Lokale Abgabe bleibt erfolgreich. */
          }
          return { ok: true };
        };
        return typeof navigator !== 'undefined' && navigator.locks
          ? await navigator.locks.request(`${MOCK_CHANNEL}:${key}`, commit)
          : commit();
      } catch {
        return { ok: false, reason: 'error' };
      }
    },
    getAggregates: rows,
    async getTrend(query) {
      const data = await snapshot();
      const selected = new Set(query.waveIds);
      return orderedWaves(data)
        .filter((wave) => selected.has(wave.id))
        .flatMap((wave) =>
          aggregateRows(data, query, [wave.id], [], kMin).map(({ id, n, score }) => ({
            id,
            waveId: wave.id,
            n,
            score,
          })),
        );
    },
    async getChoiceDistribution(questionId, scope) {
      const question = QUESTIONS_BY_ID[questionId];
      if (!question || question.type !== 'choice') return null;
      const data = await snapshot();
      const schools = new Set(
        data.schools.filter((school) => schoolInScope(school, scope)).map((school) => school.id),
      );
      const ids = new Set(
        data.responses
          .filter((response) => schools.has(response.schoolId) && response.waveId === currentWave(data).id)
          .map((response) => response.id),
      );
      const answers = data.answers.filter(
        (answer) => ids.has(answer.responseId) && answer.questionId === questionId && answer.choice?.length,
      );
      const n = new Set(answers.map((answer) => answer.responseId)).size;
      if (n < kMin) return null;
      return {
        questionId,
        n,
        options: (question.options ?? []).map((option) => {
          const count = new Set(
            answers
              .filter((answer) => answer.choice?.includes(option.value))
              .map((answer) => answer.responseId),
          ).size;
          return { value: option.value, count: count < 3 ? null : count };
        }),
      };
    },
    ...createMockPolicyApi({ snapshot, storage, now, kMin }),
    subscribeToNewResponses(callback) {
      listeners.add(callback);
      startChannel();
      return () => {
        listeners.delete(callback);
      };
    },
    dispose() {
      listeners.clear();
      channel?.removeEventListener('message', receive);
      channel?.close();
      channel = null;
      listening = false;
    },
  };
  return source;
}

import type { DataSource } from './api';
import type { AggregateQuery, PolicyAnswer, Scope } from '@/types';
import { isPolicyAnswerStatus, isPolicyScope } from '@/types';
import { getDeviceToken, hashDeviceToken } from '@/lib/device';
import { delta, tensionIndex } from '@/lib/score';
import { aggregateRows, schoolInScope, summarize } from './mockAggregates';
import type { MockDataset } from './mockRecords';
import type { createMockStorage } from './mockStorage';
import { TOPICS_BY_SLUG } from './topics';

type Rating = { answerId: string; value: number };
interface Options {
  snapshot(): Promise<MockDataset>;
  storage: ReturnType<typeof createMockStorage>;
  now(): Date;
  kMin: number;
}

function policyDelta(data: MockDataset, answer: PolicyAnswer, kMin: number): number | null {
  const scope: Scope = { level: answer.scope, id: answer.regionId };
  const schoolIds = new Set(
    data.schools.filter((school) => schoolInScope(school, scope)).map((school) => school.id),
  );
  const waves = [...data.waves].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const published = Date.parse(answer.publishedAt);
  const before = waves.filter((wave) => Date.parse(wave.endsAt) <= published).at(-1);
  const after = waves.filter((wave) => Date.parse(wave.startsAt) >= published).map((wave) => wave.id);
  const score = (waveIds: string[]) => {
    const ids = new Set(
      data.responses
        .filter((response) => schoolIds.has(response.schoolId) && waveIds.includes(response.waveId))
        .map((response) => response.id),
    );
    return summarize(
      data.answers.filter((entry) => ids.has(entry.responseId)),
      answer.topic,
      kMin,
    ).total;
  };
  return delta(score(after), score(before ? [before.id] : []), kMin);
}

function tensionRows(data: MockDataset, query: AggregateQuery, currentId: string, kMin: number) {
  const waves = [...data.waves].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const selected = query.waveIds ?? [currentId];
  const first = waves.findIndex((wave) => selected.includes(wave.id));
  const before =
    first < 0 ? [] : waves.slice(Math.max(0, first - selected.length), first).map((wave) => wave.id);
  const period = (ids: string[]) => {
    const end = waves.reduce((last, wave, index) => (ids.includes(wave.id) ? index : last), -1);
    const history = end < 0 ? [] : waves.slice(Math.max(0, end - 2), end + 1);
    const histories = ['voice', 'safety'].map((topic) =>
      history.map(
        (wave) =>
          new Map(
            aggregateRows(data, { ...query, topic }, [wave.id], [], kMin).map((row) => [row.id, row.score]),
          ),
      ),
    );
    return aggregateRows(data, { ...query, topic: 'all' }, ids, [], kMin).map((row) => {
      const declining = (points: Map<string, number | null>[]) => {
        const values = points.map((point) => point.get(row.id));
        return (
          values.length === 3 &&
          values.every((value): value is number => value != null) &&
          values[0]! > values[1]! &&
          values[1]! > values[2]!
        );
      };
      return {
        id: row.id,
        ...tensionIndex(
          Object.fromEntries(
            Object.entries(row.topicScores ?? {}).map(([topic, score]) => [
              topic,
              { n: score === null ? 0 : kMin, score },
            ]),
          ),
          { voiceDeclining3Waves: declining(histories[0]!), safetyDeclining3Waves: declining(histories[1]!) },
        ),
      };
    });
  };
  const previous = new Map(period(before).map((row) => [row.id, row.index]));
  return period(selected).map((row) => ({
    ...row,
    trend:
      row.index != null && previous.get(row.id) != null
        ? Math.round((row.index - previous.get(row.id)!) * 10) / 10
        : null,
  }));
}

/** Dialog-Methoden gehören zum vollständigen DataSource-Vertrag; nur synthetische Demo-Daten. */
export function createMockPolicyApi({
  snapshot,
  storage,
  now,
  kMin,
}: Options): Pick<
  DataSource,
  'getPolicyAnswers' | 'publishPolicyAnswer' | 'ratePolicyAnswer' | 'getTensionIndex'
> {
  const allAnswers = (data: MockDataset) => [
    ...new Map(
      [...(data.policyAnswers ?? []), ...storage.entries<PolicyAnswer>('policy').map(([, answer]) => answer)]
        .filter((answer) => answer && typeof answer.id === 'string')
        .map((answer) => [answer.id, answer]),
    ).values(),
  ];
  return {
    async getPolicyAnswers(filter) {
      const data = await snapshot();
      return allAnswers(data)
        .filter(
          (answer) =>
            (!filter.topics?.length || filter.topics.includes(answer.topic)) &&
            (!filter.regionIds?.length ||
              answer.scope === 'nrw' ||
              (answer.regionId != null && filter.regionIds.includes(answer.regionId))),
        )
        .map((answer) => {
          const ratings = storage
            .entries<Rating>('rating')
            .map(([, rating]) => rating)
            .filter(
              (rating) =>
                rating?.answerId === answer.id &&
                Number.isInteger(rating.value) &&
                rating.value >= 1 &&
                rating.value <= 5,
            );
          const n = answer.resonance.n + ratings.length;
          const sum = ratings.reduce((total, rating) => total + (rating.value - 1) * 25, 0);
          const score =
            n < kMin || (answer.resonance.n > 0 && answer.resonance.score === null)
              ? null
              : Math.round(((answer.resonance.n * (answer.resonance.score ?? 0) + sum) / n) * 10) / 10;
          return structuredClone({
            ...answer,
            resonance: { n, score },
            topicDeltaSincePublished: policyDelta(data, answer, kMin),
          });
        });
    },
    async publishPolicyAnswer(input) {
      const data = await snapshot();
      if (
        !input ||
        !TOPICS_BY_SLUG[input.topic] ||
        !isPolicyScope(input.scope) ||
        (input.status !== undefined && !isPolicyAnswerStatus(input.status)) ||
        !['ministerium', 'bezreg'].includes(input.authorRole) ||
        typeof input.title !== 'string' ||
        !input.title.trim() ||
        input.title.length > 120 ||
        typeof input.body !== 'string' ||
        !input.body.trim() ||
        input.body.length > 400 ||
        (input.scope === 'nrw'
          ? input.regionId !== null
          : !data.schools.some((school) => schoolInScope(school, { level: input.scope, id: input.regionId })))
      ) {
        throw new Error('Ungültige Demo-Antwort. Prüfe Thema, Region, Titel und Text.');
      }
      const answer: PolicyAnswer = {
        id: crypto.randomUUID(),
        topic: input.topic,
        scope: input.scope,
        regionId: input.regionId,
        title: input.title.trim(),
        body: input.body.trim(),
        status: input.status ?? 'listening',
        publishedAt: now().toISOString().slice(0, 10),
        resonance: { n: 0, score: null },
        topicDeltaSincePublished: null,
      };
      storage.put('policy', answer.id, answer);
      return structuredClone(answer);
    },
    async ratePolicyAnswer(answerId, value) {
      if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > 5 ||
        !allAnswers(await snapshot()).some((answer) => answer.id === answerId)
      )
        return { ok: false };
      const hash = await hashDeviceToken(getDeviceToken(), `policy:${answerId}`);
      storage.put('rating', `${answerId}:${hash}`, { answerId, value });
      return { ok: true };
    },
    async getTensionIndex(query) {
      const data = await snapshot();
      const time = now().getTime();
      const current = data.waves.find(
        (wave) => Date.parse(wave.startsAt) <= time && time < Date.parse(wave.endsAt),
      );
      if (!current && query.waveIds === undefined) throw new Error('Keine aktive Demo-Welle.');
      return tensionRows(data, query, current?.id ?? '', kMin);
    },
  };
}

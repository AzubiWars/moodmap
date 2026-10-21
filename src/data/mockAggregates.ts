import type { AggregateQuery, AggregateRow, MoodDistribution, Scope, School, TopicSlug } from '@/types';
import {
  delta,
  overallScore,
  scoreAnswer,
  topicScores,
  type AnswerScoreInput,
  type TopicScore,
} from '@/lib/score';
import { QUESTIONS_BY_ID } from './topics';
import type { MockAnswer, MockDataset, MockResponse } from './mockRecords';

export function schoolInScope(school: School, scope: Scope): boolean {
  if (scope.level === 'nrw') return scope.id === null;
  if (scope.level === 'school') return school.id === scope.id;
  if (scope.level === 'kreis') return school.kreisId === scope.id;
  return school.kreisId.slice(0, 3) === scope.id;
}

export function schoolGroupId(school: School, level: AggregateQuery['level']): string {
  if (level === 'nrw') return 'nrw';
  return level === 'school' ? school.id : level === 'kreis' ? school.kreisId : school.kreisId.slice(0, 3);
}

export function selectSchools(schools: School[], query: AggregateQuery): School[] {
  return schools.filter(
    (school) =>
      (!query.schoolForm?.length || query.schoolForm.includes(school.schoolForm)) &&
      (!query.parentId ||
        query.level === 'nrw' ||
        (query.level === 'school'
          ? school.kreisId === query.parentId
          : school.kreisId.slice(0, 3) === query.parentId)),
  );
}

export function selectResponses(
  responses: MockResponse[],
  schools: School[],
  query: AggregateQuery,
  waveIds: string[],
): MockResponse[] {
  const ids = new Set(schools.map((school) => school.id));
  const waves = new Set(waveIds);
  return responses.filter(
    (response) =>
      ids.has(response.schoolId) &&
      waves.has(response.waveId) &&
      (!query.role || response.role === query.role) &&
      (!query.gradeBand?.length ||
        (response.gradeBand != null && query.gradeBand.includes(response.gradeBand))),
  );
}

export function scoreInputs(answers: readonly MockAnswer[]): AnswerScoreInput[] {
  return answers.flatMap((answer) => {
    const question = QUESTIONS_BY_ID[answer.questionId];
    return question
      ? [
          {
            responseId: answer.responseId,
            topicSlug: question.topicSlug,
            type: question.type,
            value: answer.value,
            weight: question.weight,
            invert: question.invert,
          },
        ]
      : [];
  });
}

export function summarize(
  answers: readonly MockAnswer[],
  topic: TopicSlug,
  kMin: number,
): { total: TopicScore; topics: Record<TopicSlug, TopicScore> } {
  const inputs = scoreInputs(answers);
  const topics = topicScores(inputs, kMin);
  if (topic !== 'all') return { total: topics[topic] ?? { n: 0, score: null }, topics };
  const ids = new Set(
    inputs
      .filter((answer) => scoreAnswer(answer) !== null && (answer.weight ?? 1) > 0)
      .map((answer) => answer.responseId),
  );
  return { total: { n: ids.size, score: ids.size < kMin ? null : overallScore(topics) }, topics };
}

/**
 * Verteilung der gewerteten mood5-Antworten eines Themas auf die Stimmungsstufen 1–5.
 * `invert`-Fragen werden gedreht, damit Stufe 1 immer „schlecht" heißt. Unter `kMin` Teilnahmen → `null`.
 */
export function moodDistribution(
  answers: readonly MockAnswer[],
  topic: TopicSlug,
  n: number,
  kMin: number,
): MoodDistribution | null {
  if (n < kMin) return null;
  const counts: MoodDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  // Je Teilnahme und Frage zählt höchstens eine Antwort (wie `validAnswers`), auch wenn Daten doppelt sind.
  const seen = new Set<string>();
  for (const answer of answers) {
    const question = QUESTIONS_BY_ID[answer.questionId];
    const value = answer.value;
    if (question?.topicSlug !== topic || question.type !== 'mood5') continue;
    if (value == null || !Number.isInteger(value) || value < 1 || value > 5) continue;
    const key = `${answer.responseId}|${answer.questionId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    counts[(question.invert ? 6 - value : value) as keyof MoodDistribution] += 1;
  }
  return counts;
}

/** Gruppiert Rohantworten direkt auf der angefragten Ebene, keine Mittelwerte von Schul-Scores. */
export function aggregateRows(
  dataset: MockDataset,
  query: AggregateQuery,
  waveIds: string[],
  previousWaveIds: string[],
  kMin: number,
): AggregateRow[] {
  const schools = selectSchools(dataset.schools, query);
  const schoolById = new Map(schools.map((school) => [school.id, school]));
  const grouped = (waves: string[]) => {
    const groupByResponse = new Map(
      selectResponses(dataset.responses, schools, query, waves).map((response) => [
        response.id,
        schoolGroupId(schoolById.get(response.schoolId)!, query.level),
      ]),
    );
    const groups = new Map<string, MockAnswer[]>();
    for (const answer of dataset.answers) {
      const id = groupByResponse.get(answer.responseId);
      if (id) {
        const bucket = groups.get(id) ?? [];
        bucket.push(answer);
        groups.set(id, bucket);
      }
    }
    return groups;
  };
  const current = grouped(waveIds);
  const previous = grouped(previousWaveIds);
  return [...new Set(schools.map((school) => schoolGroupId(school, query.level)))].sort().map((id) => {
    const answers = current.get(id) ?? [];
    const result = summarize(answers, query.topic, kMin);
    const before = summarize(previous.get(id) ?? [], query.topic, kMin);
    return {
      id,
      ...result.total,
      delta: delta(result.total, before.total, kMin),
      topicScores: Object.fromEntries(
        Object.entries(result.topics).map(([slug, entry]) => [slug, entry.score]),
      ),
      ...(query.topic === 'all'
        ? {}
        : { distribution: moodDistribution(answers, query.topic, result.total.n, kMin) }),
    };
  });
}

import { MANDATORY_TOPIC_SLUGS, QUESTIONS_BY_ID } from '@/data/topics';
import type { AnswerInput } from '@/types';

/** Themen, zu denen die eigene Kernantwort am schlechtesten war (max. `count`), Fallback: Pflichtthemen. */
export function pickComparisonTopics(answers: AnswerInput[], count = 3): string[] {
  const scored = answers.flatMap((answer) => {
    if (!answer.questionId.endsWith('.core') || typeof answer.value !== 'number') return [];
    const question = QUESTIONS_BY_ID[answer.questionId];
    const slug = answer.questionId.split('.')[0]!;
    if (!question || slug === 'overall') return [];
    const points = (answer.value - 1) * 25;
    return [{ slug, points: question.invert ? 100 - points : points }];
  });
  const worst = scored.sort((a, b) => a.points - b.points).map((entry) => entry.slug);
  const fallback = MANDATORY_TOPIC_SLUGS.filter((slug) => slug !== 'overall');
  return [...new Set([...worst, ...fallback])].slice(0, count);
}

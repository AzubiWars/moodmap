import {
  MANDATORY_TOPIC_SLUGS,
  P0_TOPIC_SLUGS,
  P1_TOPIC_SLUGS,
  QUESTIONS,
  QUESTIONS_BY_ID,
  TOPICS,
  TOPICS_BY_SLUG,
  getCoreQuestion,
  getQuestionsForTopic,
  getTopic,
} from './topics';

describe('topics catalog', () => {
  it('has unique slugs and a dense sort order', () => {
    expect(new Set(TOPICS.map((topic) => topic.slug)).size).toBe(TOPICS.length);
    expect(TOPICS.map((topic) => topic.sort)).toEqual(TOPICS.map((_, index) => index));
  });

  it('splits P0 and P1 exactly like the spec', () => {
    expect(P0_TOPIC_SLUGS).toEqual([
      'overall',
      'learning',
      'stress',
      'ai',
      'wellbeing',
      'community',
      'teachers',
      'digital',
      'building',
      'voice',
    ]);
    expect(P1_TOPIC_SLUGS).toEqual([
      'cancellation',
      'participation',
      'future',
      'safety',
      'food',
      'phones',
    ]);
  });

  it('marks voice as mandatory', () => {
    expect(MANDATORY_TOPIC_SLUGS).toContain('voice');
    expect(getTopic('voice')?.mandatory).toBe(true);
  });

  it('has unique question ids and only known topics', () => {
    expect(new Set(QUESTIONS.map((question) => question.id)).size).toBe(QUESTIONS.length);
    for (const question of QUESTIONS) {
      expect(TOPICS_BY_SLUG[question.topicSlug], question.id).toBeDefined();
      expect(QUESTIONS_BY_ID[question.id]).toBe(question);
    }
  });

  it('gives every topic exactly one core mood5 question with weight 1', () => {
    for (const topic of TOPICS) {
      const coreQuestions = QUESTIONS.filter(
        (question) => question.topicSlug === topic.slug && question.type === 'mood5',
      );
      expect(coreQuestions, topic.slug).toHaveLength(1);
      expect(coreQuestions[0]?.id).toBe(`${topic.slug}.core`);
      expect(coreQuestions[0]?.weight).toBe(1);
      expect(getCoreQuestion(topic.slug)).toBe(coreQuestions[0]);
    }
  });

  it('models choice questions with options and explicit multi-select', () => {
    for (const question of QUESTIONS.filter((item) => item.type === 'choice')) {
      expect(question.options?.length, question.id).toBeGreaterThan(0);
      expect(question.weight).toBe(0);
      for (const option of question.options ?? []) {
        expect(option.value).toMatch(/^[a-z0-9_]+$/);
        expect(option.label.length).toBeGreaterThan(0);
      }
      const values = (question.options ?? []).map((option) => option.value);
      expect(new Set(values).size, `${question.id} option values`).toBe(values.length);
    }

    expect(QUESTIONS_BY_ID['ai.deep']?.multiple).toBe(true);
    expect(QUESTIONS_BY_ID['voice.deep']?.multiple).toBe(true);
    expect(QUESTIONS_BY_ID['learning.deep']?.multiple).toBe(false);
  });

  it('weights swipe statements 0.5, except the non-scoring voice.talk', () => {
    for (const question of QUESTIONS.filter((item) => item.type === 'swipe')) {
      expect(question.weight, question.id).toBe(
        question.id === 'voice.swipe.talk' ? 0 : 0.5,
      );
    }
  });

  it('returns all questions of a topic and an empty list for unknown slugs', () => {
    expect(getQuestionsForTopic('voice')).toHaveLength(4);
    expect(getQuestionsForTopic('unknown')).toEqual([]);
  });
});

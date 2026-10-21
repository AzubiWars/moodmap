import {
  DEFAULT_K_MIN,
  HOTSPOT,
  TENSION_WEIGHTS,
  delta,
  isHotspot,
  overallScore,
  resonance,
  scoreAnswer,
  tensionIndex,
  tensionLevel,
  topicDeltaSincePublished,
  topicScore,
  topicScores,
  type AnswerScoreInput,
  type TopicScore,
} from './score';

let nextResponseId = 0;

const mood = (value: number, topicSlug = 'ai', weight?: number, invert?: boolean): AnswerScoreInput => ({
  responseId: `mood-${nextResponseId++}`,
  topicSlug,
  type: 'mood5',
  value,
  weight,
  invert,
});

const swipe = (value: number, topicSlug = 'ai', weight?: number): AnswerScoreInput => ({
  responseId: `swipe-${nextResponseId++}`,
  topicSlug,
  type: 'swipe',
  value,
  weight,
});

const repeat = (count: number, factory: (index: number) => AnswerScoreInput): AnswerScoreInput[] =>
  Array.from({ length: count }, (_, index) => factory(index));

const topic = (score: number | null, n = DEFAULT_K_MIN): TopicScore => ({ n, score });

describe('scoreAnswer', () => {
  it('maps the mood5 scale to 0–100', () => {
    expect(scoreAnswer(mood(1))).toBe(0);
    expect(scoreAnswer(mood(3))).toBe(50);
    expect(scoreAnswer(mood(5))).toBe(100);
  });

  it('inverts when requested', () => {
    expect(scoreAnswer(mood(5, 'stress', undefined, true))).toBe(0);
    expect(scoreAnswer(mood(1, 'stress', undefined, true))).toBe(100);
  });

  it('maps swipe agreement to 100 and disagreement to 0', () => {
    expect(scoreAnswer(swipe(1))).toBe(100);
    expect(scoreAnswer(swipe(0))).toBe(0);
  });

  it('does not score choice, missing or invalid values', () => {
    expect(scoreAnswer({ ...mood(1), type: 'choice' })).toBeNull();
    expect(scoreAnswer({ ...mood(1), value: null })).toBeNull();
    expect(scoreAnswer({ ...mood(1), value: undefined })).toBeNull();
    expect(scoreAnswer(mood(0))).toBeNull();
    expect(scoreAnswer(mood(6))).toBeNull();
    expect(scoreAnswer(mood(2.5))).toBeNull();
    expect(scoreAnswer(swipe(2))).toBeNull();
  });
});

describe('topicScore', () => {
  it('uses the weighted mean of core and swipe answers', () => {
    const answers = [...repeat(10, () => mood(5, 'ai', 1)), ...repeat(10, () => swipe(0, 'ai', 0.5))];

    expect(topicScore(answers, 'ai')).toEqual({ n: 20, score: 66.7 });
  });

  it('uses default weights (mood5 = 1, swipe = 0.5)', () => {
    const answers = [...repeat(10, () => mood(5)), ...repeat(10, () => swipe(0))];

    expect(topicScore(answers, 'ai')).toEqual({ n: 20, score: 66.7 });
  });

  it('returns null below K_MIN but keeps n', () => {
    expect(
      topicScore(
        repeat(9, () => mood(5)),
        'ai',
      ),
    ).toEqual({ n: 9, score: null });
    expect(
      topicScore(
        repeat(10, () => mood(5)),
        'ai',
      ),
    ).toEqual({ n: 10, score: 100 });
  });

  it('respects a custom kMin', () => {
    expect(
      topicScore(
        repeat(5, () => mood(5)),
        'ai',
        5,
      ),
    ).toEqual({ n: 5, score: 100 });
  });

  it('suppresses four participants answering three questions each', () => {
    const answers = Array.from({ length: 4 }, (_, participant) =>
      [mood(5), swipe(1), swipe(0)].map((answer) => ({
        ...answer,
        responseId: `participant-${participant}`,
      })),
    ).flat();

    expect(topicScore(answers, 'ai')).toEqual({ n: 4, score: null });
    expect(topicScores(answers).ai).toEqual({ n: 4, score: null });
  });

  it('uses distinct participants for K_MIN while preserving answer weights', () => {
    const answers = Array.from({ length: 10 }, (_, participant) =>
      [mood(5), swipe(0)].map((answer) => ({
        ...answer,
        responseId: `participant-${participant}`,
      })),
    ).flat();

    expect(topicScore(answers.slice(0, 18), 'ai')).toEqual({ n: 9, score: null });
    expect(topicScore(answers, 'ai')).toEqual({ n: 10, score: 66.7 });
  });

  it('counts only participants with a scored answer to the requested topic', () => {
    const answers = [
      ...repeat(9, () => mood(5)),
      { ...mood(5), value: null },
      { ...swipe(1), weight: 0 },
      { ...mood(5), type: 'choice' as const },
      mood(5, 'stress'),
      { ...mood(5), responseId: '' },
      { ...mood(5), responseId: '  ' },
    ];

    expect(topicScore(answers, 'ai')).toEqual({ n: 9, score: null });
  });

  it('excludes weight 0 and unknown topics', () => {
    expect(
      topicScore(
        repeat(10, () => swipe(1, 'voice', 0)),
        'voice',
      ),
    ).toEqual({
      n: 0,
      score: null,
    });
    expect(
      topicScore(
        repeat(10, () => mood(5)),
        'stress',
      ),
    ).toEqual({ n: 0, score: null });
  });
});

describe('topicScores', () => {
  it('groups answers by topic', () => {
    const scores = topicScores([
      ...repeat(10, () => mood(5, 'overall')),
      ...repeat(10, () => mood(1, 'stress')),
    ]);

    expect(scores.overall).toEqual({ n: 10, score: 100 });
    expect(scores.stress).toEqual({ n: 10, score: 0 });
  });
});

describe('overallScore', () => {
  it('averages only topics with a score', () => {
    expect(
      overallScore({
        overall: topic(100),
        stress: topic(0),
        tiny: topic(null, 3),
      }),
    ).toBe(50);
  });

  it('returns null when no topic has enough data', () => {
    expect(overallScore({})).toBeNull();
    expect(overallScore({ a: topic(null), b: topic(null) })).toBeNull();
  });
});

describe('delta', () => {
  it('subtracts the previous score when both periods have enough data', () => {
    expect(delta(topic(60), topic(50))).toBe(10);
    expect(delta(topic(40), topic(55))).toBe(-15);
  });

  it('returns null when one period is below K_MIN or has no score', () => {
    expect(delta(topic(60), topic(50, 9))).toBeNull();
    expect(delta(topic(null), topic(50))).toBeNull();
    expect(delta(topic(60), topic(null))).toBeNull();
  });

  it('is also used for the effect of a published policy answer', () => {
    expect(topicDeltaSincePublished(topic(60), topic(50))).toBe(10);
  });
});

describe('isHotspot', () => {
  it('flags a low score with n ≥ 30', () => {
    expect(isHotspot({ score: 39, delta: 0, n: HOTSPOT.minN })).toBe(true);
  });

  it('flags a strong drop with n ≥ 30', () => {
    expect(isHotspot({ score: 50, delta: -10, n: 30 })).toBe(true);
    expect(isHotspot({ score: 50, delta: -9.9, n: 30 })).toBe(false);
  });

  it('ignores cells with too few answers or no score', () => {
    expect(isHotspot({ score: 39, delta: 0, n: 29 })).toBe(false);
    expect(isHotspot({ score: null, delta: null, n: 30 })).toBe(false);
  });
});

describe('tensionLevel', () => {
  it('maps the index to the three levels', () => {
    expect(tensionLevel(null)).toBeNull();
    expect(tensionLevel(44.9)).toBe('stable');
    expect(tensionLevel(45)).toBe('watch');
    expect(tensionLevel(59.9)).toBe('watch');
    expect(tensionLevel(60)).toBe('talk');
  });
});

describe('tensionIndex', () => {
  const allAt = (score: number): Record<string, TopicScore> =>
    Object.fromEntries(Object.keys(TENSION_WEIGHTS).map((slug) => [slug, topic(score)]));

  it('computes 100 minus the weighted topic scores', () => {
    expect(tensionIndex(allAt(50))).toEqual({
      index: 50,
      level: 'watch',
      drivers: ['voice', 'safety'],
    });
  });

  it('normalises the weights of missing topics', () => {
    const result = tensionIndex({
      voice: topic(40),
      safety: topic(60),
      community: topic(60),
    });

    expect(result.index).toBe(49.2);
    expect(result.level).toBe('watch');
    expect(result.drivers).toEqual(['voice', 'safety']);
  });

  it('requires voice plus at least two other topics', () => {
    expect(
      tensionIndex({
        safety: topic(50),
        community: topic(50),
        wellbeing: topic(50),
      }),
    ).toEqual({ index: null, level: null, drivers: [] });

    expect(tensionIndex({ voice: topic(50), safety: topic(50) })).toEqual({
      index: null,
      level: null,
      drivers: [],
    });
  });

  it('adds the trend bonus and clamps to 100', () => {
    expect(tensionIndex(allAt(50), { voiceDeclining3Waves: true }).index).toBe(60);
    expect(tensionIndex(allAt(50), { safetyDeclining3Waves: true }).level).toBe('talk');
    expect(tensionIndex(allAt(0), { voiceDeclining3Waves: true }).index).toBe(100);
  });
});

describe('resonance', () => {
  it('turns mood5 ratings into 0–100 from K_MIN', () => {
    expect(resonance(Array.from({ length: 10 }, () => 5))).toEqual({
      n: 10,
      score: 100,
    });
  });

  it('returns null below K_MIN', () => {
    expect(resonance([5, 5, 5, 5, 5, 5, 5, 5, 5])).toEqual({ n: 9, score: null });
  });

  it('ignores invalid ratings', () => {
    expect(resonance([5, 5, 5, 5, 5, 5, 5, 5, 5, 0, 6, 3.5])).toEqual({
      n: 9,
      score: null,
    });
  });

  it('averages the scaled ratings', () => {
    expect(resonance([1, 2, 3, 4, 5, 1, 2, 3, 4, 5])).toEqual({ n: 10, score: 50 });
  });
});

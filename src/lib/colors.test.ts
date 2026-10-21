import { MOOD_FILL_EXPRESSION, MOOD_LEVELS, NO_DATA, scoreToColor, scoreToLevel } from './colors';

describe('scoreToLevel', () => {
  it.each([
    [0, 1],
    [19.9, 1],
    [20, 2],
    [45, 3],
    [60, 4],
    [79, 4],
    [80, 5],
    [100, 5],
  ])('score %d → level %d', (score, level) => {
    expect(scoreToLevel(score)?.level).toBe(level);
  });

  it('clamps out-of-range scores', () => {
    expect(scoreToLevel(-5)?.level).toBe(1);
    expect(scoreToLevel(130)?.level).toBe(5);
  });

  it('returns null for missing data', () => {
    expect(scoreToLevel(null)).toBeNull();
    expect(scoreToLevel(undefined)).toBeNull();
    expect(scoreToLevel(Number.NaN)).toBeNull();
  });
});

describe('scoreToColor', () => {
  it('uses the no-data color below K_MIN', () => {
    expect(scoreToColor(null)).toBe(NO_DATA.color);
  });

  it('uses the level color', () => {
    expect(scoreToColor(90)).toBe(MOOD_LEVELS[4]!.color);
  });
});

describe('MOOD_FILL_EXPRESSION', () => {
  it('uses the no-data color for negative scores and steps at level thresholds', () => {
    const [, , noData, step] = MOOD_FILL_EXPRESSION;
    expect(noData).toBe(NO_DATA.color);
    expect(step).toEqual([
      'step',
      ['get', 'score'],
      MOOD_LEVELS[0]!.color,
      20,
      MOOD_LEVELS[1]!.color,
      40,
      MOOD_LEVELS[2]!.color,
      60,
      MOOD_LEVELS[3]!.color,
      80,
      MOOD_LEVELS[4]!.color,
    ]);
  });
});

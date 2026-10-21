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

describe('textColor contrast', () => {
  // relative Luminanz nach WCAG 2.1
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  };

  it.each(MOOD_LEVELS.map((l) => [l.label, l.color, l.textColor] as const))(
    '%s: text on mood color reaches 4.5:1',
    (_label, bg, fg) => {
      expect(contrast(bg, fg)).toBeGreaterThanOrEqual(4.5);
    },
  );
});

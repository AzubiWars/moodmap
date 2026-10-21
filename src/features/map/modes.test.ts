import {
  formatRate,
  formatTrend,
  hasTrend,
  modeUsesTopic,
  parseMapMode,
  studentsBy,
  trendValue,
} from './modes';

describe('map modes (#21)', () => {
  it('parses all modes and falls back to mood', () => {
    expect(['mood', 'trend', 'participation', 'radar'].map(parseMapMode)).toEqual([
      'mood',
      'trend',
      'participation',
      'radar',
    ]);
    expect(parseMapMode('x')).toBe('mood');
  });

  it('uses the topic only where it changes the coloring', () => {
    expect(modeUsesTopic('trend')).toBe(true);
    expect(modeUsesTopic('participation')).toBe(false);
    expect(modeUsesTopic('radar')).toBe(false);
  });

  it('formats trends with arrows and keeps "not computable" apart from zero', () => {
    expect(formatTrend(3.4)).toBe('▲ +3 Pkt. zur Vorwoche');
    expect(formatTrend(-6)).toBe('▼ −6 Pkt. zur Vorwoche');
    expect(formatTrend(0.2)).toBe('● ±0 Pkt. zur Vorwoche');
    expect(hasTrend(trendValue(0))).toBe(true);
    expect(hasTrend(trendValue(null))).toBe(false);
  });

  it('sums student counts per unit for the participation rate', () => {
    const schools = [
      { id: 'a', kreisId: '05111', studentCount: 500 },
      { id: 'b', kreisId: '05111', studentCount: 300 },
      { id: 'c', kreisId: '05315', studentCount: null },
    ];
    expect(studentsBy(schools, 'kreis')).toEqual(new Map([['05111', 800]]));
    expect(studentsBy(schools, 'regbez')).toEqual(new Map([['051', 800]]));
    expect(formatRate(2.345)).toBe('2,3 % Beteiligung');
  });
});

import {
  activeFilterCount,
  filterParams,
  isoWeekId,
  isoWeekMonday,
  parseFilters,
  periodWaveIds,
} from './filters';

describe('map filters (#20)', () => {
  it('parses and validates filters from the URL', () => {
    expect(parseFilters(new URLSearchParams('form=gymnasium,foo,gymnasium&grade=8-10&period=month'))).toEqual(
      {
        schoolForm: ['gymnasium'],
        gradeBand: ['8-10'],
        period: 'month',
      },
    );
    expect(parseFilters(new URLSearchParams('period=decade'))).toEqual({
      schoolForm: [],
      gradeBand: [],
      period: 'week',
    });
  });

  it('writes only non-default filters and keeps other params', () => {
    const next = filterParams(new URLSearchParams('topic=ai&form=realschule'), {
      schoolForm: [],
      gradeBand: ['oberstufe'],
      period: 'week',
    });
    expect(next.toString()).toBe('topic=ai&grade=oberstufe');
    expect(
      activeFilterCount({ schoolForm: ['gymnasium', 'realschule'], gradeBand: [], period: 'year' }),
    ).toBe(3);
  });

  it('converts ISO weeks both ways, also across the year boundary', () => {
    expect(isoWeekMonday('2026-W43')?.toISOString().slice(0, 10)).toBe('2026-10-19');
    expect(isoWeekId(new Date('2026-10-21T12:00:00Z'))).toBe('2026-W43');
    expect(isoWeekId(new Date('2027-01-01T12:00:00Z'))).toBe('2026-W53');
    expect(isoWeekId(new Date('2026-01-01T12:00:00Z'))).toBe('2026-W01');
    expect(isoWeekId(new Date('2025-12-29T12:00:00Z'))).toBe('2026-W01');
  });

  it('derives the waves of a period from the current wave', () => {
    expect(periodWaveIds('week', '2026-W43')).toBeUndefined();
    expect(periodWaveIds('month', '2026-W43')).toEqual(['2026-W40', '2026-W41', '2026-W42', '2026-W43']);
    const year = periodWaveIds('year', '2026-W43')!;
    expect(year[0]).toBe('2026-W35');
    expect(year.at(-1)).toBe('2026-W43');
    expect(periodWaveIds('year', '2027-W02')![0]).toBe('2026-W35');
  });
});

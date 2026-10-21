// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isoWeekOf, waveRange, waveSpec } from './lib/waves.ts';

describe('ISO week waves', () => {
  it('maps a wave id to its Monday and the following Monday', () => {
    expect(waveSpec('2026-W43')).toEqual({ id: '2026-W43', monday: '2026-10-19', nextMonday: '2026-10-26' });
    expect(waveSpec('2026-W01')).toEqual({ id: '2026-W01', monday: '2025-12-29', nextMonday: '2026-01-05' });
  });

  it('knows that 2026 has 53 ISO weeks and 2027 has 52', () => {
    expect(waveSpec('2026-W53').monday).toBe('2026-12-28');
    expect(() => waveSpec('2027-W53')).toThrow(/does not exist/);
  });

  it('builds gapless ranges across the year boundary', () => {
    expect(waveRange('2026-W52', '2027-W02').map((w) => w.id)).toEqual([
      '2026-W52',
      '2026-W53',
      '2027-W01',
      '2027-W02',
    ]);
  });

  it('finds the ISO week of a date', () => {
    expect(isoWeekOf(new Date(Date.UTC(2026, 9, 21)))).toEqual({ year: 2026, week: 43 });
    expect(isoWeekOf(new Date(Date.UTC(2027, 0, 1)))).toEqual({ year: 2026, week: 53 });
  });

  it('rejects malformed ids', () => {
    expect(() => waveSpec('2026-43')).toThrow(/Invalid wave id/);
  });
});

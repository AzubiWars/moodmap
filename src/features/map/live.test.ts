import type { AggregateRow } from '@/types';
import { diffGrowth } from './live';

const row = (id: string, n: number): AggregateRow => ({ id, n, score: null, delta: null });

describe('diffGrowth', () => {
  it('reports nothing for the first snapshot', () => {
    expect(diffGrowth(null, [row('a', 5)])).toEqual({ grown: [], added: 0 });
  });

  it('finds units with more votes and sums the new votes', () => {
    const before = new Map([
      ['a', 10],
      ['b', 3],
    ]);
    expect(diffGrowth(before, [row('a', 12), row('b', 3), row('c', 1)])).toEqual({
      grown: ['a', 'c'],
      added: 3,
    });
  });

  it('ignores shrinking counts (e.g. reset of test data)', () => {
    expect(diffGrowth(new Map([['a', 10]]), [row('a', 0)])).toEqual({ grown: [], added: 0 });
  });
});

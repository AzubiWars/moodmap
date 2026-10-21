import { cn } from './utils';

describe('cn', () => {
  it('merges tailwind classes, last one wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('drops falsy values', () => {
    const hidden = false;
    expect(cn('a', hidden && 'b', undefined, 'c')).toBe('a c');
  });
});

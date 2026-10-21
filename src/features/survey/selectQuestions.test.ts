import { describe, expect, it } from 'vitest';
import { MANDATORY_TOPIC_SLUGS, P0_TOPIC_SLUGS } from '@/data/topics';
import { CORE_QUESTION_COUNT, selectQuestions } from './selectQuestions';

describe('selectQuestions', () => {
  const tokens = Array.from({ length: 40 }, (_, i) => `device-${i}`);

  it('returns 8–12 mood5 questions with the overall question first', () => {
    for (const token of tokens) {
      const qs = selectQuestions(token, '2026-W43');
      expect(qs.length).toBe(CORE_QUESTION_COUNT);
      expect(qs.length).toBeGreaterThanOrEqual(8);
      expect(qs.length).toBeLessThanOrEqual(12);
      expect(qs[0]?.id).toBe('overall.core');
      expect(qs.every((q) => q.type === 'mood5')).toBe(true);
    }
  });

  it('always contains the mandatory topics and only P0 topics', () => {
    for (const token of tokens) {
      const slugs = selectQuestions(token, '2026-W43').map((q) => q.topicSlug);
      for (const m of MANDATORY_TOPIC_SLUGS) expect(slugs).toContain(m);
      for (const s of slugs) expect(P0_TOPIC_SLUGS).toContain(s);
    }
  });

  it('has no duplicates', () => {
    const ids = selectQuestions('device-1', '2026-W43').map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is deterministic per device and wave', () => {
    expect(selectQuestions('abc', '2026-W43')).toEqual(selectQuestions('abc', '2026-W43'));
  });

  it('rotates the optional topics across devices and waves', () => {
    const sets = new Set(
      tokens.map((t) =>
        selectQuestions(t, '2026-W43')
          .map((q) => q.id)
          .join(),
      ),
    );
    expect(sets.size).toBeGreaterThan(1);
    const waves = new Set(
      ['2026-W42', '2026-W43', '2026-W44', '2026-W45', '2026-W46'].map((w) =>
        selectQuestions('abc', w)
          .map((q) => q.id)
          .join(),
      ),
    );
    expect(waves.size).toBeGreaterThan(1);
  });
});

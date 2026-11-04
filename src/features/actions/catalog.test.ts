import { TOPICS } from '@/data/topics';
import { ACTION_MEASURES, byEvidence, filterMeasures, measuresForTopic, SOURCE_KIND_LABELS } from './catalog';

describe('action catalog data', () => {
  it('has unique ids and complete implementation fields', () => {
    const ids = ACTION_MEASURES.map((measure) => measure.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const measure of ACTION_MEASURES) {
      expect(measure.title.length).toBeGreaterThan(10);
      expect(measure.summary.length).toBeGreaterThan(40);
      expect(measure.steps.length).toBeGreaterThanOrEqual(3);
      expect(measure.indicators.length).toBeGreaterThanOrEqual(2);
      expect(measure.sources.length).toBeGreaterThanOrEqual(1);
      expect(['A', 'B', 'C']).toContain(measure.evidence);
    }
  });

  it('gives every source a short reference, a study type and a checkable link where one exists', () => {
    for (const source of ACTION_MEASURES.flatMap((measure) => measure.sources)) {
      expect(source.short.length).toBeGreaterThan(2);
      expect(SOURCE_KIND_LABELS[source.kind]).toBeDefined();
      if (source.doi) expect(source.doi).toMatch(/^10\.\d{4,9}\//);
    }
  });

  it('only rates a measure A when it rests on a meta-analysis, review or evidence synthesis', () => {
    for (const measure of ACTION_MEASURES.filter((m) => m.evidence === 'A')) {
      expect(measure.sources.some((s) => ['meta', 'review', 'synthesis'].includes(s.kind))).toBe(true);
    }
  });

  it('covers every student survey topic at least once', () => {
    const covered = new Set(ACTION_MEASURES.flatMap((measure) => measure.topics));
    for (const topic of TOPICS.filter((t) => t.audience.includes('student'))) {
      expect(covered).toContain(topic.slug);
    }
  });
});

describe('filterMeasures', () => {
  it('filters by topic, audience and evidence', () => {
    const ai = filterMeasures(ACTION_MEASURES, { topic: 'ai' });
    expect(ai.length).toBeGreaterThan(0);
    expect(ai.every((measure) => measure.topics.includes('ai'))).toBe(true);

    const pupils = filterMeasures(ACTION_MEASURES, { audience: 'schueler:innen' });
    expect(pupils.length).toBeGreaterThan(0);
    expect(pupils.every((measure) => measure.audience.includes('schueler:innen'))).toBe(true);

    const strong = filterMeasures(ACTION_MEASURES, { evidence: 'A' });
    expect(strong.length).toBeGreaterThan(0);
    expect(strong.every((measure) => measure.evidence === 'A')).toBe(true);
  });

  it('searches title, summary and steps, ignoring case and umlauts', () => {
    expect(filterMeasures(ACTION_MEASURES, { query: 'toiletten' })[0]?.id).toBe('toilets');
    expect(filterMeasures(ACTION_MEASURES, { query: 'LÜFTUNG' })[0]?.id).toBe('air-noise');
    expect(filterMeasures(ACTION_MEASURES, { query: 'klassenrat' })[0]?.id).toBe('class-council');
  });

  it('returns everything without filters', () => {
    expect(filterMeasures(ACTION_MEASURES, {})).toHaveLength(ACTION_MEASURES.length);
  });
});

describe('measuresForTopic', () => {
  it('returns at most the limit, primary-topic measures first, strongest evidence first', () => {
    const stress = measuresForTopic('stress');
    expect(stress).toHaveLength(2);
    expect(stress.every((measure) => measure.topics.includes('stress'))).toBe(true);
    expect(stress[0]!.topics[0]).toBe('stress');
  });

  it('finds measures for every student topic', () => {
    for (const topic of TOPICS.filter((t) => t.audience.includes('student'))) {
      expect(measuresForTopic(topic.slug, 1)).toHaveLength(1);
    }
  });

  it('sorts the catalogue A before B before C', () => {
    const levels = byEvidence(ACTION_MEASURES).map((measure) => measure.evidence);
    expect(levels).toEqual([...levels].sort());
  });
});

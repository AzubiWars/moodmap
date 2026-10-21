import { filterTopics, type FilterTopic } from './topicSearch';

const TOPICS: FilterTopic[] = [
  { slug: 'all', title: 'Gesamt-Mood', icon: '🗺️' },
  { slug: 'ai', title: 'KI im Schulalltag', icon: '🤖', mandatory: true },
  { slug: 'stress', title: 'Stress & Leistungsdruck', icon: '🧯', mandatory: true },
  { slug: 'digital', title: 'Digitale Ausstattung', icon: '💻' },
];

describe('filterTopics', () => {
  it('returns all topics for an empty query', () => {
    expect(filterTopics(TOPICS, '')).toEqual({ topics: TOPICS, error: null });
    expect(filterTopics(TOPICS, '   ')).toEqual({ topics: TOPICS, error: null });
  });

  it('matches plain text in title and slug, case-insensitive', () => {
    expect(filterTopics(TOPICS, 'ki').topics.map((topic) => topic.slug)).toEqual(['ai']);
    expect(filterTopics(TOPICS, 'STRESS').topics.map((topic) => topic.slug)).toEqual(['stress']);
    expect(filterTopics(TOPICS, 'digital').topics.map((topic) => topic.slug)).toEqual(['digital']);
  });

  it('supports regex with flags', () => {
    const result = filterTopics(TOPICS, '/ki|stress/i');
    expect(result.error).toBeNull();
    expect(result.topics.map((topic) => topic.slug)).toEqual(['ai', 'stress']);
  });

  it('supports case-sensitive regex without the i flag', () => {
    expect(filterTopics(TOPICS, '/ki/').topics).toEqual([]);
    expect(filterTopics(TOPICS, '/ki/i').topics.map((topic) => topic.slug)).toEqual(['ai']);
  });

  it('reports invalid regex instead of throwing', () => {
    expect(filterTopics(TOPICS, '/[/')).toEqual({
      topics: [],
      error: 'Ungültiger Regex-Ausdruck',
    });
  });
});

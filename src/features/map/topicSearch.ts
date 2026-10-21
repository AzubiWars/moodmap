import type { Topic } from '@/types';

export type FilterTopic = Pick<Topic, 'slug' | 'title' | 'icon'> & {
  mandatory?: boolean;
};

export interface TopicSearchResult {
  topics: FilterTopic[];
  error: string | null;
}

/**
 * Filtert Themen per Plain-Text (Titel/Slug, case-insensitive) oder Regex.
 * Regex-Syntax: `/muster/flags`, z. B. `/ki|stress/i`.
 */
export function filterTopics(topics: readonly FilterTopic[], query: string): TopicSearchResult {
  const trimmed = query.trim();
  if (!trimmed) return { topics: [...topics], error: null };

  const regexMatch = trimmed.match(/^\/(.*)\/([a-z]*)$/i);
  if (regexMatch) {
    const pattern = regexMatch[1] ?? '';
    const flags = (regexMatch[2] ?? '').replace(/[gy]/g, '');
    try {
      const regex = new RegExp(pattern, flags);
      return {
        topics: topics.filter((topic) => regex.test(`${topic.title} ${topic.slug}`)),
        error: null,
      };
    } catch {
      return { topics: [], error: 'Ungültiger Regex-Ausdruck' };
    }
  }

  const needle = trimmed.toLocaleLowerCase('de');
  return {
    topics: topics.filter((topic) => `${topic.title} ${topic.slug}`.toLocaleLowerCase('de').includes(needle)),
    error: null,
  };
}

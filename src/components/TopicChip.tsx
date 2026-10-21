import type { Topic } from '@/types';
import { cn } from '@/lib/utils';

interface TopicChipProps {
  topic: Pick<Topic, 'slug' | 'title' | 'icon'>;
  selected?: boolean;
  onClick?: (slug: string) => void;
  className?: string;
}

/** Auswählbares Thema (Filterleiste, Detail-Panel). */
export function TopicChip({ topic, selected = false, onClick, className }: TopicChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onClick?.(topic.slug)}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap shadow-sm ring-1 transition-colors',
        selected ? 'bg-primary text-primary-fg ring-primary' : 'bg-card text-fg ring-border hover:bg-subtle',
        className,
      )}
    >
      <span aria-hidden>{topic.icon}</span>
      {topic.title}
    </button>
  );
}

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
        selected
          ? 'bg-slate-900 text-white ring-slate-900'
          : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50',
        className,
      )}
    >
      <span aria-hidden>{topic.icon}</span>
      {topic.title}
    </button>
  );
}

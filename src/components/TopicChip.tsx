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
        'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
        selected
          ? 'border-primary bg-primary text-primary-fg'
          : 'border-border bg-card text-fg hover:border-muted/40 hover:bg-subtle',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 shrink-0 rounded-full', selected ? 'bg-primary-fg/80' : 'bg-muted/60')}
      />
      {topic.title}
    </button>
  );
}

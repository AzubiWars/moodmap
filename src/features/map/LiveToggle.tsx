import { cn } from '@/lib/utils';

interface LiveToggleProps {
  live: boolean;
  /** Neue Stimmen seit dem Einschalten */
  added: number;
  onChange: (live: boolean) => void;
}

/** Live-Modus (#24): Karte aktualisiert sich laufend, neue Stimmen pulsieren. Für den Beamer per `?live=1` verlinkbar. */
export function LiveToggle({ live, added, onChange }: LiveToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={live}
        onClick={() => onChange(!live)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
          live ? 'bg-mood-1 text-white ring-mood-1' : 'bg-card text-muted ring-border hover:bg-subtle',
        )}
      >
        <span className="relative flex size-2" aria-hidden>
          {live && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
          )}
          <span className={cn('relative inline-flex size-2 rounded-full', live ? 'bg-white' : 'bg-muted')} />
        </span>
        Live
      </button>
      {live && (
        <span className="text-xs tabular-nums text-fg" aria-live="polite">
          {added > 0 ? `+${added} ${added === 1 ? 'neue Stimme' : 'neue Stimmen'}` : 'wartet auf Stimmen …'}
        </span>
      )}
    </div>
  );
}

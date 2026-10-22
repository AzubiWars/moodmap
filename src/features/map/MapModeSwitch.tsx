import { cn } from '@/lib/utils';
import { MAP_MODES, type MapMode } from './modes';

/** Kartenmodus: Stimmung · Trend · Beteiligung (#21) · Frühwarn-Radar (#42). */
export function MapModeSwitch({ mode, onChange }: { mode: MapMode; onChange: (mode: MapMode) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Kartenmodus"
      className="inline-flex w-fit max-w-full flex-wrap rounded-lg border border-border bg-subtle p-0.5 text-xs"
    >
      {MAP_MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={mode === m.value}
          aria-label={m.label}
          onClick={() => onChange(m.value)}
          className={cn(
            'rounded-md px-2.5 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
            mode === m.value ? 'bg-card text-fg shadow-sm ring-1 ring-border/60' : 'text-muted hover:text-fg',
          )}
        >
          {/* Auf schmalen Screens „Radar“ statt „Frühwarn-Radar“, damit alle vier Modi in eine Zeile passen */}
          {m.value === 'radar' ? (
            <>
              <span className="sm:hidden">Radar</span>
              <span className="hidden sm:inline">{m.label}</span>
            </>
          ) : (
            m.label
          )}
        </button>
      ))}
    </div>
  );
}

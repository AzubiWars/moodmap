import { cn } from '@/lib/utils';
import { MAP_MODES, type MapMode } from './modes';

/** Kartenmodus: Stimmung · Trend · Beteiligung (#21) · Frühwarn-Radar (#42). */
export function MapModeSwitch({ mode, onChange }: { mode: MapMode; onChange: (mode: MapMode) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Kartenmodus"
      className="inline-flex w-fit max-w-full flex-wrap rounded-2xl bg-subtle p-0.5 text-xs"
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
            'rounded-full px-2 py-0.5 font-medium sm:px-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
            mode === m.value ? 'bg-primary text-primary-fg shadow-sm' : 'text-muted hover:text-fg',
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

import { cn } from '@/lib/utils';
import type { MapMode } from './radar';

const MODES: { value: MapMode; label: string }[] = [
  { value: 'mood', label: 'Stimmung' },
  { value: 'radar', label: 'Frühwarn-Radar' },
];

/** Kartenmodus (#42): Stimmung · Frühwarn-Radar. Trend & Beteiligung (#21) lassen sich hier ergänzen. */
export function MapModeSwitch({ mode, onChange }: { mode: MapMode; onChange: (mode: MapMode) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Kartenmodus"
      className="inline-flex w-fit rounded-full bg-subtle p-0.5 text-xs"
    >
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={mode === m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            'rounded-full px-2.5 py-0.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
            mode === m.value ? 'bg-primary text-primary-fg shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

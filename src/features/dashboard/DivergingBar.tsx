import { MOOD_LEVELS } from '@/lib/colors';
import { cn } from '@/lib/utils';
import type { DivergingDomain, Sentiment } from './lagebild';

function sentimentLabel(s: Sentiment): string {
  return `${s.negative} % unzufrieden, ${s.neutral} % teils-teils, ${s.positive} % zufrieden`;
}

interface DivergingBarProps {
  sentiment: Sentiment | null;
  domain: DivergingDomain;
  className?: string;
}

/**
 * Divergierender Balken: links 😫+😕, Mitte 😐 (zentriert auf der Achse), rechts 🙂+🤩.
 * Prozentwerte stehen immer zusätzlich als Text daneben; Farbe ist nie der einzige Träger.
 */
export function DivergingBar({ sentiment, domain, className }: DivergingBarProps) {
  const total = domain.left + domain.right;
  const axis = (domain.left / total) * 100;
  if (!sentiment) {
    return (
      <div className={cn('no-data h-4 w-full rounded', className)} role="img" aria-label="zu wenige Daten" />
    );
  }
  const offset = domain.left - (sentiment.negative + sentiment.neutral / 2);
  return (
    <div className={cn('relative h-4 w-full', className)} role="img" aria-label={sentimentLabel(sentiment)}>
      <div className="absolute inset-y-0 flex" style={{ left: `${(offset / total) * 100}%`, right: 0 }}>
        {MOOD_LEVELS.map((level) => {
          const pct = sentiment.levels[level.level];
          if (pct === 0) return null;
          return (
            <div
              key={level.level}
              className="h-full border-r-2 border-card first:rounded-l last:rounded-r last:border-r-0"
              style={{ width: `${(pct / total) * 100}%`, backgroundColor: level.color }}
              title={`${level.face} ${level.label}: ${pct} %`}
            />
          );
        })}
      </div>
      <div
        className="absolute -inset-y-1 w-0.5 rounded bg-fg/60"
        style={{ left: `calc(${axis}% - 1px)` }}
        aria-hidden
      />
    </div>
  );
}

/** Legende der fünf Stufen (Gesicht + Label + Farbe). */
export function MoodLegend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
      {MOOD_LEVELS.map((level) => (
        <li key={level.level} className="flex items-center gap-1">
          <span
            className="inline-block size-3 rounded-sm"
            style={{ backgroundColor: level.color }}
            aria-hidden
          />
          <span aria-hidden>{level.face}</span>
          {level.label}
        </li>
      ))}
    </ul>
  );
}

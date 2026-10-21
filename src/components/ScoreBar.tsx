import { scoreToColor } from '@/lib/colors';
import { cn } from '@/lib/utils';

interface ScoreBarProps {
  score: number | null | undefined;
  /** Vergleichswert, z. B. NRW-Durchschnitt – als Marker dargestellt */
  compare?: number | null;
  compareLabel?: string;
  className?: string;
}

/** Horizontaler Balken 0–100 mit optionalem Vergleichsmarker. */
export function ScoreBar({ score, compare, compareLabel = 'NRW', className }: ScoreBarProps) {
  const hasScore = score != null;
  return (
    <div
      className={cn('relative h-3 w-full rounded-full bg-slate-200', className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={hasScore ? Math.round(score) : undefined}
      aria-label={hasScore ? `Score ${Math.round(score)} von 100` : 'zu wenige Daten'}
    >
      {hasScore && (
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: scoreToColor(score) }}
        />
      )}
      {compare != null && (
        <div
          className="absolute -top-1 h-5 w-0.5 rounded bg-slate-900"
          style={{ left: `calc(${Math.min(100, Math.max(0, compare))}% - 1px)` }}
          title={`${compareLabel}: ${Math.round(compare)}`}
          aria-hidden
        />
      )}
    </div>
  );
}

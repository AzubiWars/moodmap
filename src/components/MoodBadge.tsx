import { NO_DATA, scoreToLevel } from '@/lib/colors';
import { cn } from '@/lib/utils';

interface MoodBadgeProps {
  score: number | null | undefined;
  /** Anzahl Antworten – wird klein angezeigt, wenn gesetzt */
  n?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SIZES = {
  sm: 'gap-1 px-2 py-0.5 text-xs',
  md: 'gap-1.5 px-3 py-1 text-sm',
  lg: 'gap-2 px-4 py-2 text-lg',
} as const;

/** Kompakte Anzeige: Wetter + Score (+ Label, + n). Farbe ist nie alleiniger Informationsträger. */
export function MoodBadge({ score, n, size = 'md', showLabel = true, className }: MoodBadgeProps) {
  const level = scoreToLevel(score);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold whitespace-nowrap',
        SIZES[size],
        !level && 'no-data',
        className,
      )}
      style={level ? { backgroundColor: level.color, color: level.textColor } : { color: '#0F172A' }}
    >
      <span aria-hidden>{level?.weather ?? '🌫️'}</span>
      {level ? <span className="tabular-nums">{Math.round(score!)}</span> : null}
      {showLabel && <span className="font-medium">{level?.label ?? NO_DATA.label}</span>}
      {n !== undefined && <span className="font-normal opacity-75">· n = {n}</span>}
    </span>
  );
}

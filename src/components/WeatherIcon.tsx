import { NO_DATA, scoreToLevel } from '@/lib/colors';
import { cn } from '@/lib/utils';

interface WeatherIconProps {
  score: number | null | undefined;
  className?: string;
}

/** Score → Wetter-Emoji mit zugänglichem Label. */
export function WeatherIcon({ score, className }: WeatherIconProps) {
  const level = scoreToLevel(score);
  return (
    <span role="img" aria-label={level?.label ?? NO_DATA.label} className={cn('leading-none', className)}>
      {level?.weather ?? '🌫️'}
    </span>
  );
}

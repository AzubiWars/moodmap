import { cn } from '@/lib/utils';
import { LOGO_VARS, logoMarkup, type LogoVariant } from './logoMarkup';

interface AppLogoProps {
  variant: LogoVariant;
  className?: string;
  /** Beschriftung für Screenreader; ohne `label` ist das Logo dekorativ. */
  label?: string;
}

/** Moodmap-Logo (#91): NRW-Umriss mit Smiley oder Handschlag. Größe über `className` (z. B. `size-7`). */
export function AppLogo({ variant, className, label }: AppLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('size-8 shrink-0', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: logoMarkup(variant, LOGO_VARS) }}
    />
  );
}

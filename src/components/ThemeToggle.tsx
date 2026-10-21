import { Moon, Sun } from 'lucide-react';
import { setTheme, useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const dark = useTheme() === 'dark';
  const label = dark ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren';
  const Icon = dark ? Sun : Moon;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}

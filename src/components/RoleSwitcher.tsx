import { cn } from '@/lib/utils';
import { VIEWER_ROLES, useRoleStore, type ViewerRole } from '@/store/role';

interface RoleSwitcherProps {
  /** `compact`: Select für den Header auf kleinen Bildschirmen. */
  variant?: 'segmented' | 'compact';
  className?: string;
}

export function RoleSwitcher({ variant = 'segmented', className }: RoleSwitcherProps) {
  const { role, setRole } = useRoleStore();

  if (variant === 'compact') {
    return (
      <select
        aria-label="Ansicht wechseln"
        value={role}
        onChange={(e) => setRole(e.target.value as ViewerRole)}
        className={cn('min-h-10 rounded-lg border border-border bg-card px-3 text-sm font-medium', className)}
      >
        {VIEWER_ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Ansicht wechseln"
      className={cn('inline-flex rounded-lg border border-border bg-subtle p-0.5', className)}
    >
      {VIEWER_ROLES.map((r) => (
        <button
          key={r.value}
          type="button"
          role="radio"
          aria-checked={role === r.value}
          onClick={() => setRole(r.value)}
          className={cn(
            'min-h-8 rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
            role === r.value ? 'bg-card text-fg shadow-sm ring-1 ring-border/60' : 'text-muted hover:text-fg',
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

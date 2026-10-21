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
        className={cn(
          'min-h-11 rounded-full border border-border bg-card px-3 text-sm font-medium',
          className,
        )}
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
      className={cn('inline-flex rounded-full border border-border bg-subtle p-1', className)}
    >
      {VIEWER_ROLES.map((r) => (
        <button
          key={r.value}
          type="button"
          role="radio"
          aria-checked={role === r.value}
          onClick={() => setRole(r.value)}
          className={cn(
            'min-h-11 rounded-full px-4 text-sm font-medium',
            role === r.value ? 'bg-primary text-primary-fg' : 'text-muted hover:text-fg',
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

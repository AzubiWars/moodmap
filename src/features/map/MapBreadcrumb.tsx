import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { Crumb } from './drilldown';

interface MapBreadcrumbProps {
  crumbs: Crumb[];
  onNavigate: (params: NonNullable<Crumb['params']>) => void;
}

/**
 * Wo bin ich? `← NRW › Reg.-Bez. Köln › Stadt Köln` (docs/DESIGN.md §5). Der Pfeil führt eine Ebene
 * zurück – die häufigste Bewegung; jeder Schritt der Brotkrume springt direkt.
 */
export function MapBreadcrumb({ crumbs, onNavigate }: MapBreadcrumbProps) {
  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2]!.params : null;
  return (
    <nav aria-label="Kartenebene" className="flex min-w-0 items-center gap-1.5">
      {parent && (
        <button
          type="button"
          aria-label="Eine Ebene zurück"
          title="Eine Ebene zurück"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-fg transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          onClick={() => onNavigate(parent)}
        >
          <ArrowLeft aria-hidden className="size-4" />
        </button>
      )}
      <ol className="flex min-w-0 flex-wrap items-center gap-0.5 text-sm text-muted">
        {crumbs.map((crumb, i) => (
          <li key={crumb.label} className="flex min-w-0 items-center gap-0.5">
            {i > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0" />}
            {crumb.params ? (
              <button
                type="button"
                className="truncate rounded px-0.5 font-medium text-accent underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                onClick={() => onNavigate(crumb.params!)}
              >
                {crumb.label}
              </button>
            ) : (
              <span aria-current="location" className="truncate px-0.5 font-bold text-fg">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { Crumb } from './drilldown';

interface MapBreadcrumbProps {
  crumbs: Crumb[];
  onNavigate: (params: NonNullable<Crumb['params']>) => void;
}

/** Breadcrumb `NRW › Reg.-Bez. Köln › Stadt Köln` + „Zurück zu NRW“ (docs/DESIGN.md §5). */
export function MapBreadcrumb({ crumbs, onNavigate }: MapBreadcrumbProps) {
  const drilled = crumbs.length > 1;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <nav aria-label="Kartenebene">
        <ol className="flex flex-wrap items-center gap-0.5 text-xs text-muted">
          {crumbs.map((crumb, i) => (
            <li key={crumb.label} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight aria-hidden className="size-3 shrink-0" />}
              {crumb.params ? (
                <button
                  type="button"
                  className="rounded px-0.5 font-medium text-accent underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  onClick={() => onNavigate(crumb.params!)}
                >
                  {crumb.label}
                </button>
              ) : (
                <span aria-current="location" className="px-0.5 font-semibold text-fg">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {drilled && (
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-fg transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          onClick={() => onNavigate({})}
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Zurück zu NRW
        </button>
      )}
    </div>
  );
}

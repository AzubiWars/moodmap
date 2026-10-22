import { ListFilter, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { GRADE_BANDS, SCHOOL_FORMS } from '@/types';
import { activeFilterCount, GRADE_LABELS, type MapFilters, PERIODS } from './filters';
import { SCHOOL_FORM_LABELS } from './schools';

interface FilterMenuProps {
  filters: MapFilters;
  onChange: (filters: MapFilters) => void;
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Weitere Filter (#20): Zeitraum, Schulform, Stufe. Desktop Popover, Mobile Bottom-Sheet – wie der Themen-Dialog. */
export function FilterMenu({ filters, onChange }: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const count = activeFilterCount(filters);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const chip = (selected: boolean) =>
    cn(
      'min-h-9 rounded-lg border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
      selected
        ? 'border-primary bg-primary text-primary-fg'
        : 'border-border bg-card text-fg hover:border-muted/40 hover:bg-subtle',
    );

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={count ? `Filter (${count} aktiv)` : 'Filter'}
        className={cn(
          'inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
          count
            ? 'border-accent/40 bg-accent/10 text-accent'
            : 'border-border bg-card text-fg hover:border-muted/40 hover:bg-subtle',
        )}
      >
        <ListFilter className="size-4" aria-hidden />
        <span className="hidden sm:inline">Filter</span>
        {count > 0 && <span className="tabular-nums">{count}</span>}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-fg/30 md:bg-transparent"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Filter"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[75dvh] flex-col rounded-t-3xl bg-card shadow-2xl ring-1 ring-border md:absolute md:inset-auto md:top-full md:right-0 md:mt-2 md:max-h-[32rem] md:w-[26rem] md:rounded-2xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Filter</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Filter schließen"
                className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-fg"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-4">
              <fieldset>
                <legend className="mb-2 text-xs font-semibold text-muted uppercase">Zeitraum</legend>
                <div role="radiogroup" aria-label="Zeitraum" className="flex flex-wrap gap-2">
                  {PERIODS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      role="radio"
                      aria-checked={filters.period === p.value}
                      onClick={() => onChange({ ...filters, period: p.value })}
                      className={chip(filters.period === p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-xs font-semibold text-muted uppercase">Schulform</legend>
                <div className="flex flex-wrap gap-2">
                  {SCHOOL_FORMS.map((form) => (
                    <button
                      key={form}
                      type="button"
                      aria-pressed={filters.schoolForm.includes(form)}
                      onClick={() => onChange({ ...filters, schoolForm: toggle(filters.schoolForm, form) })}
                      className={chip(filters.schoolForm.includes(form))}
                    >
                      {SCHOOL_FORM_LABELS[form]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-xs font-semibold text-muted uppercase">Stufe</legend>
                <div className="flex flex-wrap gap-2">
                  {GRADE_BANDS.map((band) => (
                    <button
                      key={band}
                      type="button"
                      aria-pressed={filters.gradeBand.includes(band)}
                      onClick={() => onChange({ ...filters, gradeBand: toggle(filters.gradeBand, band) })}
                      className={chip(filters.gradeBand.includes(band))}
                    >
                      {GRADE_LABELS[band]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <p className="text-xs text-muted">
                Werte mit weniger als 10 Stimmen bleiben grau – je enger der Filter, desto mehr graue Flächen.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
              <button
                type="button"
                disabled={count === 0}
                onClick={() => onChange({ schoolForm: [], gradeBand: [], period: 'week' })}
                className="text-sm font-medium text-accent disabled:text-muted"
              >
                Zurücksetzen
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-fg"
              >
                Fertig
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

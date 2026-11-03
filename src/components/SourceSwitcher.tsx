import { Database } from 'lucide-react';
import { periodLabel, SOURCE_KIND_LABEL } from '@/lib/dataSources';
import { cn } from '@/lib/utils';
import type { SelectedSource } from './useSelectedSource';

const KIND_STYLE = {
  demo: 'bg-subtle text-muted ring-border',
  live: 'bg-mood-4/15 text-fg ring-mood-4/40',
  import: 'bg-accent/10 text-fg ring-accent/40',
} as const;

const formatN = (n: number) => n.toLocaleString('de-DE');

/**
 * Datenquellen-Umschalter (#272): erscheint nur, wenn es mehr als eine Quelle gibt oder die URL eine
 * unbekannte Quelle nennt. Zeigt Art, Zeitraum und Größe der gewählten Quelle.
 */
export function SourceSwitcher({ selection, className }: { selection: SelectedSource; className?: string }) {
  const { sources, selected, unknown, setSource } = selection;
  if (unknown) {
    return (
      <p role="alert" className={cn('text-xs text-mood-1', className)}>
        Diese Datenquelle gibt es nicht oder sie ist für dich nicht freigegeben.{' '}
        <button
          type="button"
          className="font-semibold underline"
          onClick={() => setSource(sources.find((s) => s.isDefault)?.id ?? '')}
        >
          Zur Standardquelle
        </button>
      </p>
    );
  }
  if (sources.length < 2 || !selected) return null;
  const period = periodLabel(selected);
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs', className)}>
      <label className="inline-flex min-w-0 items-center gap-1.5">
        <Database className="size-3.5 shrink-0 text-muted" aria-hidden />
        <span className="sr-only">Datenquelle</span>
        <select
          value={selected.id}
          onChange={(event) => setSource(event.target.value)}
          className="min-h-8 max-w-[14rem] truncate rounded-md border border-border bg-card px-2 py-1 font-medium text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.label}
            </option>
          ))}
        </select>
      </label>
      <span className={cn('rounded-full px-2 py-0.5 font-semibold ring-1', KIND_STYLE[selected.kind])}>
        {SOURCE_KIND_LABEL[selected.kind]}
      </span>
      <span className="text-muted">
        {[period, `${formatN(selected.n)} Teilnahmen`].filter(Boolean).join(' · ')}
        {selected.aggregatedByProvider && ' · vom Anbieter aggregiert'}
      </span>
    </div>
  );
}

/** Hinweis, wenn die gewählte Quelle leer ist: klarer Leerzustand statt grauer Karte ohne Erklärung. */
export function EmptySourceNotice({ selection }: { selection: SelectedSource }) {
  const { selected } = selection;
  if (!selected || selected.n > 0) return null;
  return (
    <p className="rounded-lg bg-subtle px-3 py-2 text-xs text-muted" role="status">
      „{selected.label}“ enthält noch keine Teilnahmen. Sobald Antworten eingehen, erscheinen sie hier.
    </p>
  );
}

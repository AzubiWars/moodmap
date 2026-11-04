import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type CatalogSource,
  EVIDENCE_INFO,
  type EvidenceLevel,
  SOURCE_KIND_LABELS,
  sourceHref,
} from './catalog';

const EVIDENCE_STYLES: Record<EvidenceLevel, string> = {
  A: 'bg-mood-5 text-white',
  B: 'bg-mood-3 text-slate-900',
  C: 'bg-subtle text-fg ring-1 ring-border',
};

/** Runder Buchstabe A/B/C; `withLabel` ergänzt „starke Evidenz“ usw. */
export function EvidenceBadge({
  level,
  withLabel = false,
  className,
}: {
  level: EvidenceLevel;
  withLabel?: boolean;
  className?: string;
}) {
  const info = EVIDENCE_INFO[level];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold',
        withLabel ? 'h-6 px-2.5 text-xs' : 'size-6 text-xs',
        EVIDENCE_STYLES[level],
        className,
      )}
      title={info.description}
    >
      {withLabel ? info.label : <span aria-label={info.label}>{level}</span>}
    </span>
  );
}

/** Kurzbelege „Durlak et al. 2011 · Meta-Analyse“ – sichtbar, ohne etwas aufzuklappen. */
export function SourceLine({
  sources,
  className,
}: {
  sources: readonly CatalogSource[];
  className?: string;
}) {
  return (
    <p className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted', className)}>
      <span className="font-medium text-fg">Belegt durch:</span>
      {sources.map((source, index) => {
        const href = sourceHref(source);
        const label = (
          <>
            {source.short} <span className="text-muted">· {SOURCE_KIND_LABELS[source.kind]}</span>
          </>
        );
        return (
          <span key={source.citation} className="inline-flex items-center whitespace-nowrap">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                title={source.citation}
                className="inline-flex items-center gap-0.5 underline decoration-border underline-offset-2 hover:text-fg"
              >
                {label}
                <ExternalLink aria-hidden className="size-3" />
              </a>
            ) : (
              <span title={source.citation}>{label}</span>
            )}
            {index < sources.length - 1 && <span aria-hidden>;</span>}
          </span>
        );
      })}
    </p>
  );
}

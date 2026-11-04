import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ACTION_MEASURES,
  type CatalogSource,
  SOURCE_KIND_LABELS,
  sourceHref,
} from '@/features/actions/catalog';
import { OPEN_DATASETS } from '@/data/openData';

const REPO = 'https://github.com/AzubiWars/moodmap/blob/main';

/** Rohdaten und Rechenwege im öffentlichen Repository, damit jede Zahl nachvollziehbar ist. */
const RAW_FILES = [
  { label: 'Unterrichtsstatistik je Schule (Rohdaten, JSONL)', path: 'scripts/data/untstat-2024-25.jsonl' },
  { label: 'Schulsozialindex (CSV, UTF-8)', path: 'scripts/data/sozialindex-2025-26.csv' },
  { label: 'Aggregation auf Gemeinde, Kreis, Bezirk, NRW', path: 'scripts/lib/facts.ts' },
  { label: 'Ergebnisdatei der App', path: 'public/data/facts.json' },
  { label: 'Maßnahmenkatalog mit allen Quellen', path: 'src/features/actions/catalog.ts' },
];

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-0.5 font-medium text-accent underline"
    >
      {children}
      <ExternalLink aria-hidden className="size-3" />
    </a>
  );
}

/** Alle Studien aus dem Katalog, einmal, mit den Maßnahmen, die sich auf sie stützen. */
function catalogStudies(): { source: CatalogSource; measures: string[] }[] {
  const byCitation = new Map<string, { source: CatalogSource; measures: string[] }>();
  for (const measure of ACTION_MEASURES) {
    for (const source of measure.sources) {
      const entry = byCitation.get(source.citation) ?? { source, measures: [] };
      entry.measures.push(measure.title);
      byCitation.set(source.citation, entry);
    }
  }
  return [...byCitation.values()].sort((a, b) => a.source.citation.localeCompare(b.source.citation, 'de'));
}

/** `/quellen`: jede Datenquelle und jede Studie der App, verlinkt (#297). */
export function SourcesPage() {
  const studies = catalogStudies();
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <Link to="/map" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
          <ArrowLeft className="size-4" aria-hidden /> Zur Karte
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Quellen & Daten</h1>
        <p className="mt-2 text-muted">
          Jede Zahl und jede Empfehlung in Moodmap ist hier belegt: amtliche Datensätze mit Lizenz und Stand,
          die Studien hinter dem Maßnahmenkatalog und die Rohdaten samt Rechenweg. Umfrageergebnisse und ihre
          Berechnung erklärt die{' '}
          <Link to="/methodik" className="text-accent underline">
            Methodik
          </Link>
          .
        </p>
      </header>

      <section className="card space-y-4 p-5" aria-labelledby="datasets">
        <h2 id="datasets" className="text-xl font-bold">
          Amtliche und offene Datensätze
        </h2>
        <ul className="space-y-5">
          {OPEN_DATASETS.map((dataset) => (
            <li key={dataset.id} id={dataset.id} className="scroll-mt-20 space-y-1 text-sm">
              <h3 className="font-semibold">{dataset.title}</h3>
              <p className="text-muted">
                {dataset.publisher} · {dataset.stand} ·{' '}
                {dataset.licenseUrl ? (
                  <ExtLink href={dataset.licenseUrl}>{dataset.license}</ExtLink>
                ) : (
                  dataset.license
                )}
              </p>
              <p>
                <span className="font-medium">Wofür: </span>
                {dataset.usage}
              </p>
              <p>
                <span className="font-medium">Verarbeitung: </span>
                {dataset.processing}
              </p>
              {dataset.caveat && (
                <p className="rounded-lg bg-mood-3/20 p-2 text-xs">
                  <span className="font-semibold">Grenzen: </span>
                  {dataset.caveat}
                </p>
              )}
              <ExtLink href={dataset.url}>Zur Quelle</ExtLink>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="raw">
        <h2 id="raw" className="text-xl font-bold">
          Rohdaten und Rechenweg
        </h2>
        <p className="text-sm text-muted">
          Alles liegt im öffentlichen Repository. Werte auf der Karte lassen sich damit Zeile für Zeile
          nachrechnen.
        </p>
        <ul className="space-y-1 text-sm">
          {RAW_FILES.map((file) => (
            <li key={file.path}>
              <ExtLink href={`${REPO}/${file.path}`}>{file.label}</ExtLink>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="studies">
        <h2 id="studies" className="text-xl font-bold">
          Studien im Maßnahmenkatalog ({studies.length})
        </h2>
        <p className="text-sm text-muted">
          Alle DOIs wurden gegen Crossref geprüft. Die Einstufung A/B/C je Maßnahme steht im{' '}
          <Link to="/massnahmen" className="text-accent underline">
            Maßnahmenkatalog
          </Link>
          .
        </p>
        <ol className="space-y-3 text-sm">
          {studies.map(({ source, measures }) => {
            const href = sourceHref(source);
            return (
              <li key={source.citation}>
                <p>
                  {source.citation}{' '}
                  <span className="text-xs text-muted">({SOURCE_KIND_LABELS[source.kind]})</span>
                </p>
                <p className="text-xs text-muted">
                  Grundlage für: {measures.join(' · ')}
                  {href && (
                    <>
                      {' '}
                      · <ExtLink href={href}>{source.doi ? `doi:${source.doi}` : 'Link'}</ExtLink>
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      </section>
    </article>
  );
}

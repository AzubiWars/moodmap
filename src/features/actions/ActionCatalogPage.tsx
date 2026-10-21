import { ArrowLeft, Clock, ExternalLink, Printer, Search, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TopicChip } from '@/components/TopicChip';
import { TOPICS } from '@/data/topics';
import {
  ACTION_MEASURES,
  AUDIENCE_LABELS,
  type Audience,
  EFFORT_LABELS,
  EVIDENCE_INFO,
  type EvidenceLevel,
  filterMeasures,
} from './catalog';

const SORTED_TOPICS = [...TOPICS].sort((a, b) => a.sort - b.sort);

const EVIDENCE_STYLES: Record<EvidenceLevel, string> = {
  A: 'bg-mood-5 text-white',
  B: 'bg-mood-3 text-slate-900',
  C: 'bg-subtle text-fg ring-1 ring-border',
};

function sourceHref(source: { doi?: string; url?: string }): string | null {
  if (source.doi) return `https://doi.org/${source.doi}`;
  return source.url ?? null;
}

export function ActionCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTopic = searchParams.get('topic');
  const topic = SORTED_TOPICS.some((entry) => entry.slug === requestedTopic) ? requestedTopic : 'all';
  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState<Audience | ''>('');
  const [evidence, setEvidence] = useState<EvidenceLevel | ''>('');

  const measures = useMemo(
    () =>
      filterMeasures(ACTION_MEASURES, {
        topic,
        audience: audience || null,
        evidence: evidence || null,
        query,
      }),
    [topic, audience, evidence, query],
  );

  const activeTopic = SORTED_TOPICS.find((entry) => entry.slug === topic);
  const hasFilters = query.trim() !== '' || audience !== '' || evidence !== '' || topic !== 'all';

  function selectTopic(slug: string) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (slug === 'all') next.delete('topic');
        else next.set('topic', slug);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }

  function reset() {
    setQuery('');
    setAudience('');
    setEvidence('');
    setSearchParams({}, { replace: true, preventScrollReset: true });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 print:max-w-none print:px-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/map"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Zurück zur Karte
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-card px-4 text-sm font-medium ring-1 ring-border hover:bg-subtle"
        >
          <Printer aria-hidden className="size-4" />
          Drucken
        </button>
      </div>

      <header className="max-w-3xl">
        <p className="text-sm font-medium text-accent">Für Schulleitung, Lehrkräfte, SV und Schulträger</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Maßnahmenkatalog</h1>
        <p className="mt-3 text-base text-muted">
          Was Schulen tun können – mit Evidenz, Aufwand und konkreten Umsetzungsschritten. Der Katalog
          übersetzt die Moodmap-Themen in Handlungsoptionen. Er ist kein starres Rezept und ersetzt keine
          pädagogische Einschätzung vor Ort.
        </p>
      </header>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <dt className="text-xs font-medium text-muted uppercase">Maßnahmen</dt>
          <dd className="mt-1 text-2xl font-bold">{ACTION_MEASURES.length}</dd>
        </div>
        <div className="card p-4">
          <dt className="text-xs font-medium text-muted uppercase">Abgedeckte Themen</dt>
          <dd className="mt-1 text-2xl font-bold">
            {new Set(ACTION_MEASURES.flatMap((measure) => measure.topics)).size}
          </dd>
        </div>
        <div className="card p-4">
          <dt className="text-xs font-medium text-muted uppercase">Evidenzstufen</dt>
          <dd className="mt-1 text-2xl font-bold">A · B · C</dd>
        </div>
      </dl>

      <section className="card mt-4 p-5" aria-labelledby="how-to-use">
        <h2 id="how-to-use" className="text-lg font-bold">
          So nutzt ihr den Katalog
        </h2>
        <ol className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <li className="rounded-xl bg-subtle p-3">
            <span className="font-semibold">1. Daten lesen</span>
            <p className="mt-1 text-muted">
              Schaut auf die Top-Baustellen eurer Schule oder Region – nicht auf einzelne Personen.
            </p>
          </li>
          <li className="rounded-xl bg-subtle p-3">
            <span className="font-semibold">2. Ein Thema wählen</span>
            <p className="mt-1 text-muted">
              Nehmt euch ein bis zwei Themen vor. Alles gleichzeitig zu ändern, überfordert jede Schule.
            </p>
          </li>
          <li className="rounded-xl bg-subtle p-3">
            <span className="font-semibold">3. Mit Schüler:innen planen</span>
            <p className="mt-1 text-muted">
              SV, Klassenrat oder eine offene Runde entscheiden mit, welche Maßnahme passt.
            </p>
          </li>
          <li className="rounded-xl bg-subtle p-3">
            <span className="font-semibold">4. Umsetzen und messen</span>
            <p className="mt-1 text-muted">
              Verantwortliche Person, Termin und einen Indikator festlegen. Nach 6–8 Wochen prüfen.
            </p>
          </li>
          <li className="rounded-xl bg-subtle p-3">
            <span className="font-semibold">5. Zurückmelden</span>
            <p className="mt-1 text-muted">
              „Ihr habt gesagt – wir haben getan“: Ergebnisse sichtbar machen, auch bei Absagen.
            </p>
          </li>
          <li className="rounded-xl bg-subtle p-3">
            <span className="font-semibold">6. Dranbleiben</span>
            <p className="mt-1 text-muted">
              Wirkung braucht Zeit. Nach der nächsten Moodmap-Welle erneut schauen und nachjustieren.
            </p>
          </li>
        </ol>
      </section>

      <details className="card mt-4 p-5 print:hidden">
        <summary className="cursor-pointer text-sm font-semibold">Evidenzstufen verstehen</summary>
        <dl className="mt-3 space-y-3 text-sm">
          {(Object.keys(EVIDENCE_INFO) as EvidenceLevel[]).map((level) => (
            <div key={level} className="flex gap-3">
              <dt className="shrink-0">
                <span
                  className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-bold ${EVIDENCE_STYLES[level]}`}
                >
                  {level}
                </span>
              </dt>
              <dd>
                <span className="font-semibold">{EVIDENCE_INFO[level].label}</span>
                <p className="text-muted">{EVIDENCE_INFO[level].description}</p>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 rounded-xl bg-subtle p-3 text-xs text-muted">
          Evidenz ist keine Garantie. Sie beschreibt, wie gut eine Maßnahme untersucht ist – nicht, ob sie an
          eurer Schule unter euren Bedingungen wirkt. Deshalb gehören Beteiligung, klare Ziele und eine
          ehrliche Auswertung dazu.
        </p>
      </details>

      <section className="mt-6 space-y-3 print:hidden" aria-label="Katalog filtern">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Maßnahme oder Stichwort suchen …"
              aria-label="Maßnahmen durchsuchen"
              className="min-h-11 w-full rounded-xl bg-card py-2 pr-9 pl-9 text-sm ring-1 ring-border outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Suche löschen"
                className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-fg"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </label>
          <label className="text-xs font-medium text-muted">
            <span className="sr-only">Zielgruppe</span>
            <select
              value={audience}
              onChange={(event) => setAudience(event.target.value as Audience | '')}
              className="min-h-11 rounded-xl bg-card px-3 text-sm text-fg ring-1 ring-border"
            >
              <option value="">Alle Zielgruppen</option>
              {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((value) => (
                <option key={value} value={value}>
                  {AUDIENCE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-muted">
            <span className="sr-only">Evidenzstufe</span>
            <select
              value={evidence}
              onChange={(event) => setEvidence(event.target.value as EvidenceLevel | '')}
              className="min-h-11 rounded-xl bg-card px-3 text-sm text-fg ring-1 ring-border"
            >
              <option value="">Alle Evidenzstufen</option>
              {(Object.keys(EVIDENCE_INFO) as EvidenceLevel[]).map((level) => (
                <option key={level} value={level}>
                  {EVIDENCE_INFO[level].label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Thema filtern">
          <TopicChip
            topic={{ slug: 'all', title: 'Alle Themen', icon: '🗂️' }}
            selected={topic === 'all'}
            onClick={selectTopic}
          />
          {SORTED_TOPICS.map((entry) => (
            <TopicChip key={entry.slug} topic={entry} selected={topic === entry.slug} onClick={selectTopic} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span aria-live="polite">
            {measures.length} {measures.length === 1 ? 'Maßnahme' : 'Maßnahmen'}
            {activeTopic ? ` zum Thema „${activeTopic.title}“` : ''}
          </span>
          {hasFilters && (
            <button type="button" onClick={reset} className="underline hover:text-fg">
              Filter zurücksetzen
            </button>
          )}
        </div>
      </section>

      <section className="mt-4 space-y-4" aria-label="Maßnahmen">
        {measures.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="font-semibold">Keine Maßnahme passt zu dieser Suche.</p>
            <p className="mt-1 text-sm text-muted">
              Versucht es mit einem anderen Stichwort oder setzt die Filter zurück.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-3 min-h-11 rounded-2xl bg-primary px-4 font-semibold text-primary-fg"
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          measures.map((measure) => (
            <article key={measure.id} id={measure.id} className="card overflow-hidden scroll-mt-20">
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold ${EVIDENCE_STYLES[measure.evidence]}`}
                    title={EVIDENCE_INFO[measure.evidence].description}
                  >
                    {EVIDENCE_INFO[measure.evidence].label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted">
                    <Clock aria-hidden className="size-3.5" />
                    {measure.timeframe}
                  </span>
                  <span className="text-muted">· {EFFORT_LABELS[measure.effort]}</span>
                </div>

                <div>
                  <h2 className="text-xl font-bold">{measure.title}</h2>
                  <p className="mt-1 text-sm text-muted">{measure.summary}</p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {measure.topics.map((slug) => {
                    const entry = SORTED_TOPICS.find((topicEntry) => topicEntry.slug === slug);
                    if (!entry) return null;
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => selectTopic(slug)}
                        className="inline-flex min-h-8 items-center gap-1 rounded-full bg-subtle px-2.5 text-xs font-medium hover:bg-border"
                      >
                        <span aria-hidden>{entry.icon}</span>
                        {entry.title}
                      </button>
                    );
                  })}
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Users aria-hidden className="size-3.5" />
                    {measure.audience.map((value) => AUDIENCE_LABELS[value]).join(' · ')}
                  </span>
                </div>

                <details className="rounded-2xl bg-subtle/60 p-3">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Umsetzung, Indikatoren & Quellen
                  </summary>
                  <div className="mt-3 space-y-4 text-sm">
                    <section>
                      <h3 className="font-semibold">So geht’s</h3>
                      <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">
                        {measure.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </section>

                    <section>
                      <h3 className="font-semibold">Woran ihr Veränderung erkennt</h3>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
                        {measure.indicators.map((indicator) => (
                          <li key={indicator}>{indicator}</li>
                        ))}
                      </ul>
                    </section>

                    <p className="rounded-xl bg-card p-3 text-xs text-muted ring-1 ring-border">
                      <span className="font-semibold text-fg">Evidenz-Einordnung: </span>
                      {measure.evidenceNote}
                    </p>

                    {measure.caveat && (
                      <p className="rounded-xl bg-mood-3/20 p-3 text-xs text-fg">
                        <span className="font-semibold">Wichtig: </span>
                        {measure.caveat}
                      </p>
                    )}

                    <section>
                      <h3 className="font-semibold">Quellen</h3>
                      <ul className="mt-1 space-y-2 text-xs text-muted">
                        {measure.sources.map((source) => {
                          const href = sourceHref(source);
                          return (
                            <li key={source.citation}>
                              {href ? (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-start gap-1 underline hover:text-fg"
                                >
                                  {source.citation}
                                  <ExternalLink aria-hidden className="mt-0.5 size-3 shrink-0" />
                                </a>
                              ) : (
                                source.citation
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  </div>
                </details>
              </div>
            </article>
          ))
        )}
      </section>

      <aside className="card mt-6 space-y-2 p-5 text-sm">
        <h2 className="font-bold">Rote Linien</h2>
        <p className="text-muted">
          Der Katalog ist kein Instrument für öffentliche Rankings oder individuelle Diagnosen. Maßnahmen
          werden mit Schüler:innen geplant, nicht über sie hinweg. Bei Hinweisen auf Gewalt, Missbrauch oder
          akute Selbstgefährdung gilt: sofort Schulleitung, Schulsozialarbeit bzw. Schulpsychologie
          einschalten – nicht die KI.
        </p>
        <p className="text-xs text-muted">
          Akute Hilfe: Notruf 112 · Telefonseelsorge 0800 111 0 111 · Nummer gegen Kummer 116 111.
        </p>
      </aside>
    </div>
  );
}

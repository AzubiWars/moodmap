import { ArrowLeft, Clock, Printer, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TopicChip } from '@/components/TopicChip';
import { TOPICS } from '@/data/topics';
import { cn } from '@/lib/utils';
import {
  ACTION_MEASURES,
  AUDIENCE_LABELS,
  byEvidence,
  EFFORT_LABELS,
  EVIDENCE_INFO,
  type EvidenceLevel,
  filterMeasures,
  sourceHref,
} from './catalog';
import { EvidenceBadge, SourceLine } from './Evidence';

const SORTED_TOPICS = TOPICS.filter((topic) => topic.audience.includes('student')).sort(
  (a, b) => a.sort - b.sort,
);

/** Ein Satz je Stufe für die Legende im Kopf – die ausführliche Fassung steht im Tooltip. */
const EVIDENCE_SHORT: Record<EvidenceLevel, string> = {
  A: 'Meta-Analysen oder Reviews zeigen über viele Studien eine Wirkung',
  B: 'Einzelne kontrollierte Studien oder gemischte, robuste Befunde',
  C: 'Leitlinie oder Praxisstandard, Wirkung kaum untersucht',
};

export function ActionCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTopic = searchParams.get('topic');
  const topic = SORTED_TOPICS.some((entry) => entry.slug === requestedTopic) ? requestedTopic : 'all';
  // Nur zwei Zustände statt Stufen-Dropdown: alles oder nur gut belegte Maßnahmen (A + B).
  const [strongOnly, setStrongOnly] = useState(false);

  const measures = useMemo(
    () =>
      byEvidence(filterMeasures(ACTION_MEASURES, { topic })).filter(
        (measure) => !strongOnly || measure.evidence !== 'C',
      ),
    [topic, strongOnly],
  );

  const activeTopic = SORTED_TOPICS.find((entry) => entry.slug === topic);

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
    setStrongOnly(false);
    setSearchParams({}, { replace: true, preventScrollReset: true });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 print:max-w-none print:px-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/map"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Zur Karte
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

      <header>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Maßnahmenkatalog</h1>
        <p className="mt-2 max-w-2xl text-base text-muted">
          {ACTION_MEASURES.length} Maßnahmen für Schulen. Jede beruht auf einer nachprüfbaren Quelle und ist
          danach eingestuft, wie gut ihre Wirkung belegt ist.{' '}
          <Link to="/quellen#studies" className="text-accent underline">
            Alle Studien auf einen Blick
          </Link>
        </p>
        <dl className="mt-4 grid gap-2 sm:grid-cols-3" aria-label="Evidenzstufen">
          {(Object.keys(EVIDENCE_INFO) as EvidenceLevel[]).map((level) => (
            <div key={level} className="flex items-start gap-2 rounded-xl bg-card p-3 ring-1 ring-border">
              <dt>
                <EvidenceBadge level={level} />
              </dt>
              <dd className="text-xs">
                <span className="font-semibold">{EVIDENCE_INFO[level].label.split(' · ')[1]}</span>
                <span className="block text-muted">{EVIDENCE_SHORT[level]}</span>
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="mt-6 space-y-3 print:hidden" aria-label="Katalog filtern">
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
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span aria-live="polite" className="text-muted">
            {measures.length} {measures.length === 1 ? 'Maßnahme' : 'Maßnahmen'}
            {activeTopic ? ` zu „${activeTopic.title}“` : ''} · am besten belegte zuerst
          </span>
          <div role="radiogroup" aria-label="Evidenz" className="flex rounded-xl bg-subtle p-1 text-xs">
            {[
              { value: false, label: 'Alle' },
              { value: true, label: 'Nur A + B' },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={strongOnly === option.value}
                onClick={() => setStrongOnly(option.value)}
                className={cn(
                  'min-h-9 rounded-lg px-3 font-medium',
                  strongOnly === option.value ? 'bg-card shadow-sm' : 'text-muted hover:text-fg',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 space-y-3" aria-label="Maßnahmen">
        {measures.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="font-semibold">Zu diesem Thema gibt es keine Maßnahme mit Stufe A oder B.</p>
            <button
              type="button"
              onClick={reset}
              className="mt-3 min-h-11 rounded-2xl bg-primary px-4 font-semibold text-primary-fg"
            >
              Alle Maßnahmen zeigen
            </button>
          </div>
        ) : (
          measures.map((measure) => (
            <article key={measure.id} id={measure.id} className="card scroll-mt-20 overflow-hidden">
              <div className="flex gap-3 p-5">
                <EvidenceBadge level={measure.evidence} className="mt-0.5 size-9 text-base" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <h2 className="text-lg font-bold">{measure.title}</h2>
                    <p className="mt-1 text-sm text-muted">{measure.summary}</p>
                  </div>
                  <SourceLine sources={measure.sources} />
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock aria-hidden className="size-3.5" />
                      {measure.timeframe} · {EFFORT_LABELS[measure.effort]}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users aria-hidden className="size-3.5" />
                      {measure.audience.map((value) => AUDIENCE_LABELS[value]).join(' · ')}
                    </span>
                  </p>

                  <details className="rounded-2xl bg-subtle/60 p-3">
                    <summary className="cursor-pointer text-sm font-semibold">So setzt ihr es um</summary>
                    <div className="mt-3 space-y-4 text-sm">
                      <ol className="list-decimal space-y-1 pl-5 text-muted">
                        {measure.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                      <section>
                        <h3 className="font-semibold">Woran ihr Veränderung erkennt</h3>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
                          {measure.indicators.map((indicator) => (
                            <li key={indicator}>{indicator}</li>
                          ))}
                        </ul>
                      </section>
                      <p className="rounded-xl bg-card p-3 text-xs text-muted ring-1 ring-border">
                        <span className="font-semibold text-fg">Warum Stufe {measure.evidence}? </span>
                        {measure.evidenceNote}
                      </p>
                      {measure.caveat && (
                        <p className="rounded-xl bg-mood-3/20 p-3 text-xs text-fg">
                          <span className="font-semibold">Wichtig: </span>
                          {measure.caveat}
                        </p>
                      )}
                      <section>
                        <h3 className="font-semibold">Vollständige Quellen</h3>
                        <ul className="mt-1 space-y-2 text-xs text-muted">
                          {measure.sources.map((source) => {
                            const href = sourceHref(source);
                            return (
                              <li key={source.citation}>
                                {source.citation}
                                {href && (
                                  <>
                                    {' '}
                                    <a href={href} target="_blank" rel="noreferrer" className="underline">
                                      {source.doi ? `doi:${source.doi}` : 'Link'}
                                    </a>
                                  </>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    </div>
                  </details>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <details className="card mt-6 p-5 text-sm">
        <summary className="cursor-pointer font-semibold">So nutzt ihr den Katalog</summary>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted">
          <li>
            Auf der Karte die größte Baustelle eurer Schule oder Region ansehen – nie einzelne Personen.
          </li>
          <li>Ein bis zwei Themen auswählen, nicht alles gleichzeitig.</li>
          <li>Mit SV oder Klassenrat entscheiden, welche Maßnahme passt.</li>
          <li>Verantwortliche Person, Termin und einen Indikator festlegen; nach 6–8 Wochen prüfen.</li>
          <li>Zurückmelden: „Ihr habt gesagt – wir haben getan“, auch bei Absagen.</li>
        </ol>
        <p className="mt-3 text-xs text-muted">
          Evidenz ist keine Garantie: Sie beschreibt, wie gut eine Maßnahme untersucht ist, nicht, ob sie an
          eurer Schule wirkt. Neue Studien ändern die Einstufung, nicht umgekehrt.
        </p>
      </details>

      <aside className="card mt-3 space-y-2 p-5 text-sm">
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

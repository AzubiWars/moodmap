import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { hotspotTopics, type TopicStat } from './lagebild';

interface AiReportProps {
  topics: TopicStat[];
}

/** Mock-Lagebericht ohne externe API – klar als KI-Demo gekennzeichnet. */
export function AiReport({ topics }: AiReportProps) {
  const [open, setOpen] = useState(false);
  const hot = useMemo(() => hotspotTopics(topics, 3), [topics]);

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold">
            <Sparkles aria-hidden className="size-4 text-accent" />
            KI-Lagebericht
          </h2>
          <p className="mt-1 text-sm text-muted">
            Fasst nur aggregierte Kennzahlen zusammen. Demo-Bericht ohne externe API.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-fg"
        >
          {open ? 'Bericht ausblenden' : 'Lagebericht erstellen'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 rounded-2xl bg-subtle p-4 text-sm" aria-live="polite">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">KI-generiert · Demo</p>
          <p>
            Die NRW-weite Stimmung liegt aktuell bei{' '}
            <strong>{topics.length > 0 ? 'den unten genannten Themen' : 'noch zu wenigen Daten'}</strong>.
            Besonders auffällig sind:
          </p>
          {hot.length > 0 ? (
            <ol className="list-decimal space-y-1 pl-5">
              {hot.map((topic, index) => (
                <li key={topic.slug}>
                  <strong>{topic.title}</strong> – {topic.n} Stimmen,{' '}
                  {topic.sentiment ? `${topic.sentiment.negative} % unzufrieden` : 'noch zu wenige Daten'}.
                  {index === 0 &&
                    ' Hier sollte zuerst ein Dialogformat mit SV und Schulsozialarbeit ansetzen.'}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted">Noch keine Themen über der Mindeststimmenzahl.</p>
          )}
          <p className="text-xs text-muted">
            Keine Einzeldaten, keine Personenbezüge. Der Bericht ist eine Demo-Zusammenfassung und ersetzt
            keine pädagogische Einschätzung.
          </p>
        </div>
      )}
    </section>
  );
}

import { QRCodeSVG } from 'qrcode.react';
import { Link, useSearchParams } from 'react-router-dom';
import { SchoolAccess } from './SchoolAccess';

/**
 * Druckbares QR-Plakat (#38): Der Mood-Check der eigenen Schule per `/s/:code`. Bedienelemente und die
 * App-Navigation fallen beim Drucken weg (`print:hidden`); das Plakat füllt eine A4-Seite.
 */
export function SchoolPosterPage() {
  const [params] = useSearchParams();
  const code = params.get('code');
  const back = `/dashboard/school${code ? `?code=${encodeURIComponent(code)}` : ''}`;

  return (
    <SchoolAccess>
      {(school) => {
        const url = `${window.location.origin}/s/${school.joinCode}`;
        return (
          <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 print:max-w-none print:p-0">
            <div className="flex flex-wrap gap-3 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-11 rounded-2xl bg-primary px-5 font-semibold text-primary-fg"
              >
                Plakat drucken
              </button>
              <Link
                to={back}
                className="inline-flex min-h-11 items-center rounded-2xl px-5 font-medium ring-1 ring-border"
              >
                Zurück zum Schul-Dashboard
              </Link>
            </div>

            <article
              aria-label={`QR-Plakat ${school.name}`}
              className="flex flex-col items-center gap-6 rounded-3xl bg-white p-8 text-center text-slate-900 shadow-card print:min-h-screen print:justify-center print:rounded-none print:shadow-none"
            >
              <p className="text-lg font-semibold tracking-wide">
                {school.name} · {school.city}
              </p>
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">Wie geht’s dir?</h1>
              <p className="text-2xl font-bold">Scan mich! 📱</p>
              <div className="rounded-2xl border-4 border-slate-900 p-4">
                <QRCodeSVG
                  value={url}
                  size={288}
                  level="M"
                  title={`QR-Code zu ${url}`}
                  className="size-60 sm:size-72"
                />
              </div>
              <p className="max-w-md text-lg">
                Mach in 60 Sekunden beim Mood-Check mit. Du brauchst keinen Namen und keine E-Mail – deine
                Antworten sind 100 % anonym.
              </p>
              <p className="break-all font-mono text-sm text-slate-600">{url}</p>
              <p className="text-sm font-semibold text-slate-600">Moodmap NRW · Prototyp mit Demo-Daten</p>
            </article>
          </div>
        );
      }}
    </SchoolAccess>
  );
}

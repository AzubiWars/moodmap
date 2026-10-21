import { Link } from 'react-router-dom';
import { WeatherIcon } from '@/components/WeatherIcon';

const WEATHER_SCORES = [10, 30, 50, 70, 90] as const;

const BENEFITS = [
  { icon: '🔒', title: '100 % anonym', text: 'Keine Namen, keine E-Mail, keine IP-Adresse.' },
  { icon: '⏱️', title: 'In 60 Sekunden fertig', text: 'Ein paar kurze Fragen – einfach antippen.' },
  { icon: '📣', title: 'Die Politik antwortet dir', text: 'Deine Stimme zählt und bekommt eine Antwort.' },
] as const;

export function LandingPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-10 pb-8 text-center sm:pt-16">
      <div className="flex items-center gap-2 text-4xl sm:gap-3 sm:text-5xl">
        {WEATHER_SCORES.map((s) => (
          <WeatherIcon key={s} score={s} />
        ))}
      </div>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl">Wie geht's NRWs Schulen?</h1>
      <p className="mt-3 max-w-xl text-lg text-muted">Das Stimmungswetter für NRWs Schulen</p>

      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link
          to="/check"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-mood-5 px-6 py-3 font-semibold text-white shadow-sm"
        >
          Mood-Check starten
        </Link>
        <Link
          to="/map"
          className="card inline-flex min-h-12 items-center justify-center rounded-2xl px-6 py-3 font-semibold"
        >
          Karte ansehen
        </Link>
      </div>

      <ul className="mt-12 grid w-full gap-3 text-left sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <li key={b.title} className="card rounded-2xl p-4">
            <span className="text-2xl" aria-hidden>
              {b.icon}
            </span>
            <h2 className="mt-2 font-bold">{b.title}</h2>
            <p className="mt-1 text-sm text-muted">{b.text}</p>
          </li>
        ))}
      </ul>

      <Link
        to="/massnahmen"
        className="card mt-8 inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
      >
        Maßnahmenkatalog für Schulen
      </Link>

      <footer className="mt-10 text-sm text-muted">
        <Link to="/privacy" className="inline-flex min-h-11 items-center underline">
          Datenschutz
        </Link>
      </footer>
    </div>
  );
}

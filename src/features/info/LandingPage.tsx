import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center">
      <p className="text-5xl" aria-hidden>
        ⛈️ 🌧️ ⛅ 🌤️ ☀️
      </p>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">Wie geht's NRWs Schulen?</h1>
      <p className="mt-4 max-w-xl text-lg text-slate-600">
        Gib in 60 Sekunden anonym deine Stimmung ab – und sieh live auf der Karte, wie es Schüler:innen in
        ganz NRW geht.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link to="/check" className="rounded-2xl bg-mood-5 px-6 py-4 font-semibold text-white shadow-sm">
          Mood-Check starten
        </Link>
        <Link
          to="/map"
          className="rounded-2xl bg-white px-6 py-4 font-semibold shadow-sm ring-1 ring-slate-200"
        >
          Karte ansehen
        </Link>
      </div>
    </section>
  );
}

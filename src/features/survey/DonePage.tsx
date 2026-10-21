import { Link } from 'react-router-dom';

/** Platzhalter bis #29 („Deine Schule vs. NRW" + Teilen). */
export function DonePage() {
  return (
    <section className="mx-auto max-w-md px-4 py-8">
      <div className="card space-y-4 p-6 text-center">
        <p className="text-5xl" aria-hidden>
          ☀️
        </p>
        <h1 className="text-2xl font-bold">Danke! Deine Stimme zählt.</h1>
        <p className="text-muted">Deine Antworten sind anonym angekommen.</p>
        <Link
          to="/map"
          className="inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 font-semibold text-primary-fg"
        >
          Zur Karte
        </Link>
      </div>
    </section>
  );
}

import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center">
      <p className="text-5xl" aria-hidden>
        🌫️
      </p>
      <h1 className="mt-4 text-2xl font-bold">Hier ist leider Nebel</h1>
      <Link to="/" className="mt-6 inline-block underline">
        Zur Startseite
      </Link>
    </section>
  );
}

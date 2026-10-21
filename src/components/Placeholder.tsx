interface PlaceholderProps {
  title: string;
  issue: number;
  children?: React.ReactNode;
}

/** Platzhalter für Screens, die noch gebaut werden. Wird vom jeweiligen Issue ersetzt. */
export function Placeholder({ title, issue, children }: PlaceholderProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">
        Kommt mit{' '}
        <a className="underline" href={`https://github.com/AzubiWars/moodmap/issues/${issue}`}>
          #{issue}
        </a>
        .
      </p>
      {children}
    </section>
  );
}

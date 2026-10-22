/** Pflicht-Hinweis laut docs/PRIVACY.md §8: alle Umfragedaten sind synthetisch. */
export function DemoBanner() {
  return (
    <div
      className="border-b border-border bg-subtle px-4 py-1 text-center text-[11px] font-medium tracking-wide text-muted print:hidden"
      role="note"
    >
      Prototyp – Demo-Daten
    </div>
  );
}

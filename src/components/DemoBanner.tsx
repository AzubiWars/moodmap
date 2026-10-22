import { DATA_MODE } from '@/lib/env';

/**
 * Datenschutz-/Datenstatus. In Produktion wird ausschließlich die Live-Quelle angezeigt;
 * der Demo-Modus bleibt nur für lokale Entwicklung sichtbar.
 */
export function DemoBanner() {
  const live = DATA_MODE === 'supabase';
  return (
    <div
      className="border-b border-border bg-subtle px-4 py-1 text-center text-[11px] font-medium tracking-wide text-muted print:hidden"
      role="note"
    >
      {live ? 'Live-Daten · anonymisiert' : 'Entwicklungsmodus · keine echten Daten'}
    </div>
  );
}

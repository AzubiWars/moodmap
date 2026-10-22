import { useIsFetching } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigation } from 'react-router-dom';

/**
 * Schmaler, globaler Ladebalken für Seitenwechsel und lazy geladene Routen.
 * Er erscheint erst nach 120 ms, damit schnelle Navigation nicht flackert.
 */
export function LoadingBar() {
  const navigation = useNavigation();
  // Nur initiale Datenabrufe zeigen, keine Hintergrund-Polls (z. B. Live-Karte).
  const initialFetches = useIsFetching({
    predicate: (query) => query.state.fetchStatus === 'fetching' && query.state.data === undefined,
  });
  const busy = navigation.state !== 'idle' || initialFetches > 0;
  const key = busy ? `${navigation.state}:${navigation.location?.pathname ?? ''}` : null;
  const [visibleKey, setVisibleKey] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    const timer = setTimeout(() => setVisibleKey(key), 120);
    return () => clearTimeout(timer);
  }, [key]);

  if (!key || visibleKey !== key) return null;

  return (
    <div
      className="loading-bar fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-accent/20"
      role="progressbar"
      aria-label="Seite wird geladen"
    >
      <span className="loading-bar__fill absolute inset-y-0 w-1/3 bg-accent" />
    </div>
  );
}

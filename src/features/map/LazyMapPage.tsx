import { lazy, Suspense } from 'react';

// MapLibre ist groß → Karte erst laden, wenn sie gebraucht wird
const MapPage = lazy(() => import('./MapPage').then((m) => ({ default: m.MapPage })));

export function LazyMapPage() {
  return (
    <Suspense fallback={<p className="p-6 text-slate-500">Karte wird geladen …</p>}>
      <MapPage />
    </Suspense>
  );
}

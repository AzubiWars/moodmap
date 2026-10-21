import { lazy, Suspense } from 'react';
const PitchPage = lazy(() => import('./PitchPage').then((module) => ({ default: module.PitchPage })));

export function LazyPitchPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-muted" role="status">
          Pitch-Ansicht wird geladen …
        </p>
      }
    >
      <PitchPage />
    </Suspense>
  );
}

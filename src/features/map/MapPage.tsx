import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { demoScores } from './demoScores';
import { GEO_URLS, loadRegions, withScores } from './geo';
import { MapLegend } from './MapLegend';
import { MoodMap } from './MoodMap';

export function MapPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const regionsQuery = useQuery({
    queryKey: ['geo', 'kreis'],
    queryFn: () => loadRegions(GEO_URLS.kreis),
    staleTime: Infinity,
    retry: false,
  });

  const scored = useMemo(() => {
    if (!regionsQuery.data) return null;
    // TODO(#9): durch DataSource.getAggregates({ level: 'kreis', topic }) ersetzen
    const scores = demoScores(
      regionsQuery.data.features.map((f) => f.properties.id),
      'all',
    );
    return withScores(regionsQuery.data, scores);
  }, [regionsQuery.data]);

  const selected = scored?.features.find((f) => f.properties.id === selectedId);

  return (
    <div className="relative h-[calc(100dvh-8.5rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-5.1rem)]">
      <MoodMap regions={scored} selectedId={selectedId} onSelect={setSelectedId} />

      <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
        <div className="pointer-events-auto inline-block rounded-2xl bg-white/95 px-4 py-2 shadow-md ring-1 ring-slate-200">
          <h1 className="text-base font-bold">Moodmap NRW</h1>
          <p className="text-xs text-slate-500">
            {selected ? selected.properties.name : 'Gesamtstimmung · Kreise & kreisfreie Städte'}
          </p>
        </div>
      </div>

      <div className="absolute bottom-8 left-2 md:bottom-3 md:left-3">
        <MapLegend />
      </div>

      {regionsQuery.isError && (
        <div className="absolute inset-x-3 top-24 rounded-2xl bg-white p-4 text-sm shadow-md ring-1 ring-slate-200 md:left-auto md:w-80">
          Kreisgrenzen noch nicht verfügbar (<code>public/geo/nrw-kreise.geojson</code>, kommt mit #6).
        </div>
      )}
    </div>
  );
}

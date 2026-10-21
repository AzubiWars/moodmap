import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TopicChip } from '@/components/TopicChip';
import { TOPICS } from '@/data/topics';
import { demoScores } from './demoScores';
import { breadcrumb, clickTarget, drillParams, levelCaption, resolveDrill } from './drilldown';
import { featureBounds, GEO_URLS, loadRegions, NRW_BOUNDS, type RegionCollection, withScores } from './geo';
import { MapBreadcrumb } from './MapBreadcrumb';
import { MapLegend } from './MapLegend';
import { MoodMap } from './MoodMap';

const MAP_TOPICS = [
  { slug: 'all', title: 'Gesamt-Mood', icon: '🗺️' },
  ...[...TOPICS].sort((a, b) => a.sort - b.sort),
];

/** Färbt die angezeigte Ebene; Flächen außerhalb des fokussierten Regierungsbezirks erhalten `dim`. */
function scoreRegions(regions: RegionCollection, topic: string, focusRegbezId: string | null) {
  const withData = withScores(
    regions,
    demoScores(
      regions.features.map((f) => f.properties.id),
      topic,
    ),
  );
  if (!focusRegbezId) return withData;
  return {
    ...withData,
    features: withData.features.map((f) => ({
      ...f,
      properties: { ...f.properties, dim: f.properties.regbez_id !== focusRegbezId },
    })),
  };
}

export function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTopic = searchParams.get('topic');
  const topic = MAP_TOPICS.find((entry) => entry.slug === requestedTopic) ?? MAP_TOPICS[0]!;
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    filterRef.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [topic.slug]);

  function selectTopic(slug: string) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (slug === 'all') next.delete('topic');
        else next.set('topic', slug);
        return next;
      },
      { preventScrollReset: true },
    );
  }
  const regbezQuery = useQuery({
    queryKey: ['geo', 'regbez'],
    queryFn: () => loadRegions(GEO_URLS.regbez),
    staleTime: Infinity,
    retry: false,
  });
  const kreiseQuery = useQuery({
    queryKey: ['geo', 'kreis'],
    queryFn: () => loadRegions(GEO_URLS.kreis),
    staleTime: Infinity,
    retry: false,
  });

  const drill = resolveDrill(searchParams, regbezQuery.data, kreiseQuery.data);
  const focusRegbezId = drill.regbez?.properties.id ?? null;

  // Landesansicht: Regierungsbezirke (Fallback: Kreise, falls die RegBez-Datei fehlt).
  // Ab Regierungsbezirk: alle Kreise, die außerhalb des Bezirks werden abgeblendet.
  const shown = drill.level === 'nrw' ? (regbezQuery.data ?? kreiseQuery.data) : kreiseQuery.data;

  // TODO(#9): demoScores durch DataSource.getAggregates({ level, topic }) ersetzen (#68)
  const scored = shown ? scoreRegions(shown, topic.slug, focusRegbezId) : null;

  const focusFeature = drill.kreis ?? drill.regbez;
  const focusBounds = (focusFeature && featureBounds(focusFeature)) ?? NRW_BOUNDS;

  function navigate(target: { regbez?: string; kreis?: string }) {
    setSearchParams((previous) => drillParams(previous, target), { preventScrollReset: true });
  }

  function selectRegion(id: string | null) {
    const feature = id ? shown?.features.find((f) => f.properties.id === id) : undefined;
    if (!feature || feature.properties.id === drill.kreis?.properties.id) return;
    navigate(clickTarget(drill, feature));
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem-env(safe-area-inset-bottom))] flex-col md:h-[calc(100dvh-5.1rem)]">
      <div
        ref={filterRef}
        role="group"
        aria-label="Karte nach Thema filtern"
        className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 py-3"
      >
        {MAP_TOPICS.map((entry) => (
          <TopicChip
            key={entry.slug}
            topic={entry}
            selected={topic.slug === entry.slug}
            onClick={selectTopic}
          />
        ))}
      </div>

      <div className="relative min-h-0 flex-1">
        <MoodMap
          regions={scored}
          selectedId={drill.kreis?.properties.id ?? null}
          focusBounds={focusBounds}
          onSelect={selectRegion}
        />

        <div className="pointer-events-none absolute top-0 right-12 left-0 p-3">
          <div className="pointer-events-auto inline-flex max-w-full flex-col gap-1 rounded-2xl bg-white/95 px-4 py-2 shadow-md ring-1 ring-slate-200">
            <h1 className="text-base font-bold">Moodmap NRW</h1>
            <MapBreadcrumb crumbs={breadcrumb(drill)} onNavigate={navigate} />
            <p className="text-xs text-slate-700" aria-live="polite">
              {topic.icon} {topic.title} · {levelCaption(drill)}
            </p>
          </div>
        </div>

        <div className="absolute bottom-8 left-2 md:bottom-3 md:left-3">
          <MapLegend />
        </div>

        {kreiseQuery.isError && (
          <div className="absolute inset-x-3 top-24 rounded-2xl bg-white p-4 text-sm shadow-md ring-1 ring-slate-200 md:left-auto md:w-80">
            Die Kreisgrenzen konnten nicht geladen werden. Lade die Seite bitte erneut.
          </div>
        )}
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { TOPICS } from '@/data/topics';
import type { School } from '@/types';
import {
  breadcrumb,
  clickTarget,
  type DrillState,
  type DrillTarget,
  drillParams,
  levelCaption,
  resolveDrill,
  schoolTarget,
} from './drilldown';
import {
  type Bounds,
  featureBounds,
  GEO_URLS,
  loadRegions,
  NRW_BOUNDS,
  type RegionCollection,
  withScores,
} from './geo';
import { DetailPanel } from './DetailPanel';
import { MapBreadcrumb } from './MapBreadcrumb';
import { MapLegend } from './MapLegend';
import { MoodMap } from './MoodMap';
import { loadSchools, schoolsToGeoJSON } from './schools';
import { TopicFilter } from './TopicFilter';
import type { FilterTopic } from './topicSearch';
import { type MapTopic, type ScoreMap, toScoreMap, useAggregates, useLiveAggregates } from './useAggregates';

const MAP_TOPICS: FilterTopic[] = [
  { slug: 'all', title: 'Gesamt-Mood', icon: '🗺️' },
  ...[...TOPICS].sort((a, b) => a.sort - b.sort),
];

/** Färbt die angezeigte Ebene; Flächen außerhalb des fokussierten Regierungsbezirks erhalten `dim`. */
function scoreRegions(regions: RegionCollection, scores: ScoreMap, focusRegbezId: string | null) {
  const withData = withScores(regions, scores);
  if (!focusRegbezId) return withData;
  return {
    ...withData,
    features: withData.features.map((f) => ({
      ...f,
      properties: { ...f.properties, dim: f.properties.regbez_id !== focusRegbezId },
    })),
  };
}

/** Schulen erscheinen ab Regierungsbezirk; im Kreis nur die des Kreises (#18). */
function visibleSchools(drill: DrillState, schools: readonly School[], kreise: RegionCollection | undefined) {
  if (drill.kreis) return schools.filter((s) => s.kreisId === drill.kreis!.properties.id);
  if (!drill.regbez || !kreise) return [];
  const regbezId = drill.regbez.properties.id;
  const kreisIds = new Set(
    kreise.features.filter((f) => f.properties.regbez_id === regbezId).map((f) => f.properties.id),
  );
  return schools.filter((s) => kreisIds.has(s.kreisId));
}

/** Ausschnitt um eine Schule (~ Zoom 14, Nachbarschaft bleibt erkennbar). */
function schoolBounds(school: School): Bounds {
  const d = 0.012;
  return [
    [school.lon - d * 1.6, school.lat - d],
    [school.lon + d * 1.6, school.lat + d],
  ];
}

export function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTopic = searchParams.get('topic');
  const topic = MAP_TOPICS.find((entry) => entry.slug === requestedTopic) ?? MAP_TOPICS[0]!;
  const topicSlug = topic.slug as MapTopic;

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

  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: () => loadSchools(),
    staleTime: Infinity,
    retry: false,
  });

  const drill = resolveDrill(searchParams, regbezQuery.data, kreiseQuery.data, schoolsQuery.data);
  const focusRegbezId = drill.regbez?.properties.id ?? null;

  // Landesansicht: Regierungsbezirke (Fallback: Kreise, falls die RegBez-Datei fehlt).
  // Ab Regierungsbezirk: alle Kreise, die außerhalb des Bezirks werden abgeblendet.
  const regionLevel = drill.level === 'nrw' && regbezQuery.data ? 'regbez' : 'kreis';
  const shown = regionLevel === 'regbez' ? regbezQuery.data : kreiseQuery.data;

  // Aggregate aus der DataSource (#68), bereits k-anonymisiert (score null unter K_MIN)
  useLiveAggregates();
  const regionAggregates = useAggregates(regionLevel, topicSlug);
  const schoolAggregates = useAggregates('school', topicSlug, {
    parentId: drill.kreis?.properties.id,
    enabled: drill.level !== 'nrw',
  });

  const scored = shown ? scoreRegions(shown, toScoreMap(regionAggregates.data), focusRegbezId) : null;

  const schoolsShown = schoolsQuery.data ? visibleSchools(drill, schoolsQuery.data, kreiseQuery.data) : [];
  const schoolPoints = schoolsShown.length
    ? schoolsToGeoJSON(schoolsShown, toScoreMap(schoolAggregates.data))
    : null;

  const focusFeature = drill.kreis ?? drill.regbez;
  const focusBounds = drill.school
    ? schoolBounds(drill.school)
    : ((focusFeature && featureBounds(focusFeature)) ?? NRW_BOUNDS);

  function navigate(target: DrillTarget) {
    setSearchParams((previous) => drillParams(previous, target), { preventScrollReset: true });
  }

  function selectRegion(id: string | null) {
    const feature = id ? shown?.features.find((f) => f.properties.id === id) : undefined;
    if (!feature || feature.properties.id === drill.kreis?.properties.id) return;
    navigate(clickTarget(drill, feature));
  }

  function selectSchool(id: string) {
    const school = schoolsShown.find((s) => s.id === id);
    if (!school || school.id === drill.school?.id) return;
    navigate(schoolTarget(drill, school));
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem-env(safe-area-inset-bottom))] flex-col md:h-[calc(100dvh-5.1rem)]">
      <TopicFilter topics={MAP_TOPICS} selectedSlug={topic.slug} onSelect={selectTopic} />

      <div className="relative min-h-0 flex-1">
        <MoodMap
          regions={scored}
          selectedId={drill.kreis?.properties.id ?? null}
          focusBounds={focusBounds}
          muted={drill.level === 'kreis' || drill.level === 'school'}
          detailOpen={drill.level !== 'nrw'}
          onSelect={selectRegion}
          schools={schoolPoints}
          clusterSchools={drill.level === 'regbez'}
          selectedSchoolId={drill.school?.id ?? null}
          onSelectSchool={selectSchool}
        />

        <div className="pointer-events-none absolute top-0 right-12 left-0 p-3">
          <div className="pointer-events-auto inline-flex max-w-full flex-col gap-1 rounded-2xl bg-card/95 px-4 py-2 shadow-md ring-1 ring-border">
            <h1 className="text-base font-bold">Moodmap NRW</h1>
            <MapBreadcrumb crumbs={breadcrumb(drill)} onNavigate={navigate} />
            <p className="text-xs text-fg" aria-live="polite">
              {topic.icon} {topic.title} · {levelCaption(drill)}
            </p>
          </div>
        </div>

        {/* Mobile: Legende über dem eingeklappten Detail-Sheet */}
        <div
          className={
            drill.level === 'nrw'
              ? 'absolute bottom-8 left-2 md:bottom-3 md:left-3'
              : 'absolute bottom-[8.5rem] left-2 md:bottom-3 md:left-3'
          }
        >
          <MapLegend />
        </div>

        <DetailPanel
          key={drill.school?.id ?? drill.kreis?.properties.id ?? drill.regbez?.properties.id}
          drill={drill}
        />

        {kreiseQuery.isError && (
          <div className="absolute inset-x-3 top-24 rounded-2xl bg-card p-4 text-sm shadow-md ring-1 ring-border md:left-auto md:w-80">
            Die Kreisgrenzen konnten nicht geladen werden. Lade die Seite bitte erneut.
          </div>
        )}
      </div>
    </div>
  );
}

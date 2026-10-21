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
import { LiveToggle } from './LiveToggle';
import { LIVE_POLL_MS, useLivePulses } from './live';
import { MapModeSwitch } from './MapModeSwitch';
import { type MapMode, parseMapMode, type TensionMap, toTensionMap } from './radar';
import { useRoleStore } from '@/store/role';
import { MapBreadcrumb } from './MapBreadcrumb';
import { MapLegend } from './MapLegend';
import { MoodMap } from './MoodMap';
import { loadSchools, type SchoolCollection, schoolsToGeoJSON } from './schools';
import { TopicFilter } from './TopicFilter';
import type { FilterTopic } from './topicSearch';
import {
  type MapTopic,
  type ScoreMap,
  toScoreMap,
  useAggregates,
  useLiveAggregates,
  useTension,
} from './useAggregates';

const MAP_TOPICS: FilterTopic[] = [
  { slug: 'all', title: 'Gesamt-Mood', icon: '🗺️' },
  ...[...TOPICS].sort((a, b) => a.sort - b.sort),
];

/** Färbt die angezeigte Ebene; Flächen außerhalb des fokussierten Regierungsbezirks erhalten `dim`. */
function scoreRegions(
  regions: RegionCollection,
  scores: ScoreMap,
  focusRegbezId: string | null,
  tension: TensionMap | null,
) {
  const withData = withScores(regions, scores);
  return {
    ...withData,
    features: withData.features.map((f) => {
      const t = tension?.get(f.properties.id);
      return {
        ...f,
        properties: {
          ...f.properties,
          ...(focusRegbezId ? { dim: f.properties.regbez_id !== focusRegbezId } : {}),
          // Frühwarn-Radar (#42): Stufe für die Einfärbung, 'none' unter K_MIN
          ...(tension ? { tension: t?.level ?? 'none', tindex: t?.index ?? -1 } : {}),
        },
      };
    }),
  };
}

function withSchoolTension(points: SchoolCollection, tension: TensionMap | null): SchoolCollection {
  if (!tension) return points;
  return {
    ...points,
    features: points.features.map((f) => {
      const t = tension.get(f.properties.id);
      return { ...f, properties: { ...f.properties, tension: t?.level ?? 'none', tindex: t?.index ?? -1 } };
    }),
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
  const mode = parseMapMode(searchParams.get('mode'));
  const radar = mode === 'radar';
  // Spannungs-Index pro Schule nur für das Ministerium (Spec §3.10)
  const ministry = useRoleStore((state) => state.role) === 'ministry';

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
  const live = searchParams.get('live') === '1';
  const poll = live ? LIVE_POLL_MS : false;
  const regionAggregates = useAggregates(regionLevel, topicSlug, { refetchInterval: poll });
  const schoolAggregates = useAggregates('school', topicSlug, {
    parentId: drill.kreis?.properties.id,
    enabled: drill.level !== 'nrw',
    refetchInterval: poll,
  });
  // Live (#24): alle Schulen beobachten, damit neue Stimmen auch in der Landesansicht pulsieren
  const liveSchoolAggregates = useAggregates('school', 'all', { enabled: live, refetchInterval: poll });
  const { pulsing, added } = useLivePulses(liveSchoolAggregates.data, live, 'all');

  const regionTension = useTension(regionLevel, { enabled: radar, refetchInterval: poll });
  const schoolTension = useTension('school', {
    parentId: drill.kreis?.properties.id,
    enabled: radar && ministry && drill.level !== 'nrw',
    refetchInterval: poll,
  });

  const scored = shown
    ? scoreRegions(
        shown,
        toScoreMap(regionAggregates.data),
        focusRegbezId,
        radar ? toTensionMap(regionTension.data) : null,
      )
    : null;

  const schoolsShown =
    schoolsQuery.data && (!radar || ministry)
      ? visibleSchools(drill, schoolsQuery.data, kreiseQuery.data)
      : [];
  const schoolPoints = schoolsShown.length
    ? withSchoolTension(
        schoolsToGeoJSON(schoolsShown, toScoreMap(schoolAggregates.data)),
        radar ? toTensionMap(schoolTension.data) : null,
      )
    : null;

  const focusFeature = drill.kreis ?? drill.regbez;
  const focusBounds = drill.school
    ? schoolBounds(drill.school)
    : ((focusFeature && featureBounds(focusFeature)) ?? NRW_BOUNDS);

  const pulses = pulsing.flatMap((id) => {
    const school = schoolsQuery.data?.find((s) => s.id === id);
    return school ? [{ id, lon: school.lon, lat: school.lat }] : [];
  });

  function setMode(next: MapMode) {
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);
        if (next === 'mood') params.delete('mode');
        else params.set('mode', next);
        return params;
      },
      { preventScrollReset: true },
    );
  }

  function setLive(on: boolean) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (on) next.set('live', '1');
        else next.delete('live');
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }

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
      {/* Der Spannungs-Index nutzt feste Themen (TENSION_WEIGHTS) – Themenfilter nur im Stimmungsmodus */}
      {!radar && <TopicFilter topics={MAP_TOPICS} selectedSlug={topic.slug} onSelect={selectTopic} />}

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
          pulses={pulses}
          mode={mode}
        />

        <div className="pointer-events-none absolute top-0 right-12 left-0 p-3">
          <div className="pointer-events-auto inline-flex max-w-full flex-col gap-1 rounded-2xl bg-card/95 px-4 py-2 shadow-md ring-1 ring-border">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h1 className="text-base font-bold">Moodmap NRW</h1>
              <LiveToggle live={live} added={added} onChange={setLive} />
            </div>
            <MapBreadcrumb crumbs={breadcrumb(drill)} onNavigate={navigate} />
            <MapModeSwitch mode={mode} onChange={setMode} />
            <p className="text-xs text-fg" aria-live="polite">
              {radar ? '📡 Spannungs-Index aus 6 Themen' : `${topic.icon} ${topic.title}`} ·{' '}
              {radar && !ministry && drill.kreis ? 'Kreis-Ansicht' : levelCaption(drill)}
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
          <MapLegend mode={mode} />
        </div>

        <DetailPanel
          key={drill.school?.id ?? drill.kreis?.properties.id ?? drill.regbez?.properties.id}
          drill={drill}
          mode={mode}
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

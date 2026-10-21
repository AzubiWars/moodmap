import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
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
  type RegionFeature,
  withScores,
} from './geo';
import { DetailPanel } from './DetailPanel';
import { FilterMenu } from './FilterMenu';
import { Timeline } from './Timeline';
import {
  activeFilterCount,
  filterParams,
  type MapFilters,
  parseFilters,
  periodWaveIds,
  weekLabel,
} from './filters';
import { LiveToggle } from './LiveToggle';
import { LIVE_POLL_MS, useLivePulses } from './live';
import { MapModeSwitch } from './MapModeSwitch';
import { type MapMode, modeUsesTopic, parseMapMode, studentsBy, trendValue } from './modes';
import { type TensionMap, toTensionMap } from './radar';
import { useRoleStore } from '@/store/role';
import { MapBreadcrumb } from './MapBreadcrumb';
import { MapLegend } from './MapLegend';
import { MapSearch } from './MapSearch';
import { MoodMap } from './MoodMap';
import {
  directoryToGeoJSON,
  loadSchoolDirectory,
  loadSchools,
  type SchoolCollection,
  schoolsToGeoJSON,
} from './schools';
import { TopicFilter } from './TopicFilter';
import type { FilterTopic } from './topicSearch';
import {
  type MapTopic,
  type ScoreMap,
  toScoreMap,
  type AggregateFilters,
  useAggregates,
  useCurrentWave,
  useLiveAggregates,
  useTension,
} from './useAggregates';

const MAP_TOPICS: FilterTopic[] = [
  { slug: 'all', title: 'Gesamt-Mood', icon: '🗺️' },
  // Lehrkräfte-Themen (`t_*`, #37) gehören nicht in den Schüler:innen-Themenfilter.
  ...TOPICS.filter((topic) => topic.audience.includes('student')).sort((a, b) => a.sort - b.sort),
];

/** Färbt die angezeigte Ebene; Flächen außerhalb des fokussierten Regierungsbezirks erhalten `dim`. */
/** Zusatzwerte je Kartenmodus: Spannungs-Stufe (#42), Trend-Δ und Beteiligungsquote (#21). */
interface ModeData {
  tension: TensionMap | null;
  students: ReadonlyMap<string, number> | null;
}

function modeProperties(id: string, scores: ScoreMap, data: ModeData) {
  const s = scores.get(id);
  const t = data.tension?.get(id);
  const students = data.students?.get(id);
  return {
    // Frühwarn-Radar: Stufe für die Einfärbung, 'none' unter K_MIN
    ...(data.tension ? { tension: t?.level ?? 'none', tindex: t?.index ?? -1 } : {}),
    tdelta: trendValue(s?.delta),
    // Beteiligung: Stimmen ÷ Schülerzahl der Schulen in der Einheit (−1 = unbekannt)
    rate: students && s ? (100 * s.n) / students : -1,
  };
}

function scoreRegions(
  regions: RegionCollection,
  scores: ScoreMap,
  focusRegbezId: string | null,
  data: ModeData,
) {
  const withData = withScores(regions, scores);
  return {
    ...withData,
    features: withData.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        ...(focusRegbezId ? { dim: f.properties.regbez_id !== focusRegbezId } : {}),
        ...modeProperties(f.properties.id, scores, data),
      },
    })),
  };
}

function withModeData(points: SchoolCollection, scores: ScoreMap, data: ModeData): SchoolCollection {
  return {
    ...points,
    features: points.features.map((f) => ({
      ...f,
      properties: { ...f.properties, ...modeProperties(f.properties.id, scores, data) },
    })),
  };
}

/** Schulen erscheinen ab Regierungsbezirk; im Kreis nur die des Kreises (#18). */
function visibleSchools(
  drill: DrillState,
  schools: readonly School[],
  kreise: RegionCollection | undefined,
  city: string | null,
  forms: readonly string[],
) {
  const inCity = city ? schools.filter((s) => s.city === city) : schools;
  // Schulform-Filter (#20) blendet auch die Marker anderer Schulformen aus.
  const inForm = (s: School) => forms.length === 0 || forms.includes(s.schoolForm);
  // Eine Stadt kann über Kreisgrenzen hinaus Schulen haben (z. B. Stadtteile) – dann alle zeigen.
  if (city) return inCity.filter(inForm);
  if (drill.kreis) return inCity.filter((s) => s.kreisId === drill.kreis!.properties.id && inForm(s));
  if (!drill.regbez || !kreise) return [];
  const regbezId = drill.regbez.properties.id;
  const kreisIds = new Set(
    kreise.features.filter((f) => f.properties.regbez_id === regbezId).map((f) => f.properties.id),
  );
  return inCity.filter((s) => kreisIds.has(s.kreisId) && inForm(s));
}

/** Ausschnitt um eine Schule (~ Zoom 14, Nachbarschaft bleibt erkennbar). */
function schoolBounds(school: School): Bounds {
  const d = 0.012;
  return [
    [school.lon - d * 1.6, school.lat - d],
    [school.lon + d * 1.6, school.lat + d],
  ];
}

/** Ausschnitt um alle Schulen einer Stadt, mit etwas Rand. */
function cityBounds(schools: readonly School[]): Bounds | null {
  if (schools.length === 0) return null;
  const lons = schools.map((school) => school.lon);
  const lats = schools.map((school) => school.lat);
  const pad = 0.012;
  return [
    [Math.min(...lons) - pad, Math.min(...lats) - pad],
    [Math.max(...lons) + pad, Math.max(...lats) + pad],
  ];
}

/** Untertitel je Modus; `null` = gewähltes Thema anzeigen */
const MODE_CAPTION: Record<MapMode, string | null> = {
  mood: null,
  trend: null,
  participation: '🙋 Beteiligung diese Woche',
  radar: '📡 Spannungs-Index aus 6 Themen',
};

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
  const city = searchParams.get('city');
  const citySchools =
    city && schoolsQuery.data ? schoolsQuery.data.filter((school) => school.city === city) : [];
  // Das 1,1-MB-Verzeichnis erst laden, wenn es gebraucht wird: Drill-down oder Suche.
  const [directoryRequested, setDirectoryRequested] = useState(false);
  const directoryQuery = useQuery({
    queryKey: ['schools', 'directory'],
    queryFn: loadSchoolDirectory,
    enabled: directoryRequested || drill.level !== 'nrw' || Boolean(city),
    staleTime: Infinity,
    retry: false,
  });

  // Landesansicht: Regierungsbezirke (Fallback: Kreise, falls die RegBez-Datei fehlt).
  // Ab Regierungsbezirk: alle Kreise, die außerhalb des Bezirks werden abgeblendet.
  const regionLevel = drill.level === 'nrw' && regbezQuery.data ? 'regbez' : 'kreis';
  const shown = regionLevel === 'regbez' ? regbezQuery.data : kreiseQuery.data;

  // Aggregate aus der DataSource (#68), bereits k-anonymisiert (score null unter K_MIN)
  useLiveAggregates();
  const live = searchParams.get('live') === '1';
  const poll = live ? LIVE_POLL_MS : false;
  // Weitere Filter (#20): Schulform, Stufe, Zeitraum → an alle Abfragen außer dem Live-Zähler
  const filters = parseFilters(searchParams);
  const currentWave = useCurrentWave();
  // Zeitachse (#34): eine gewählte Woche überschreibt den Zeitraum-Filter
  const schoolYearWaves = periodWaveIds('year', currentWave.data?.id) ?? [];
  const requestedWave = searchParams.get('wave');
  const selectedWave = schoolYearWaves.find((w) => w === requestedWave);
  const [playing, setPlaying] = useState(false);
  const [is3d, setIs3d] = useState(false);
  const [directoryFocus, setDirectoryFocus] = useState<School | null>(null);
  const aggFilters: AggregateFilters = {
    schoolForm: filters.schoolForm,
    gradeBand: filters.gradeBand,
    waveIds: selectedWave ? [selectedWave] : periodWaveIds(filters.period, currentWave.data?.id),
  };
  const regionAggregates = useAggregates(regionLevel, topicSlug, {
    refetchInterval: poll,
    filters: aggFilters,
  });
  const schoolAggregates = useAggregates('school', topicSlug, {
    parentId: drill.kreis?.properties.id,
    enabled: drill.level !== 'nrw',
    refetchInterval: poll,
    filters: aggFilters,
  });
  // Live (#24): alle Schulen beobachten, damit neue Stimmen auch in der Landesansicht pulsieren
  const liveSchoolAggregates = useAggregates('school', 'all', { enabled: live, refetchInterval: poll });
  const { pulsing, added } = useLivePulses(liveSchoolAggregates.data, live, 'all');

  const regionTension = useTension(regionLevel, {
    enabled: radar,
    refetchInterval: poll,
    filters: aggFilters,
  });
  const schoolTension = useTension('school', {
    parentId: drill.kreis?.properties.id,
    enabled: radar && ministry && drill.level !== 'nrw',
    refetchInterval: poll,
    filters: aggFilters,
  });

  const allSchools = schoolsQuery.data ?? [];
  const scored = shown
    ? scoreRegions(shown, toScoreMap(regionAggregates.data), focusRegbezId, {
        tension: radar ? toTensionMap(regionTension.data) : null,
        students: mode === 'participation' ? studentsBy(allSchools, regionLevel) : null,
      })
    : null;

  const schoolsShown =
    schoolsQuery.data && (!radar || ministry)
      ? visibleSchools(drill, schoolsQuery.data, kreiseQuery.data, city, filters.schoolForm)
      : [];
  const schoolScores = toScoreMap(schoolAggregates.data);
  const schoolPoints = schoolsShown.length
    ? withModeData(schoolsToGeoJSON(schoolsShown, schoolScores), schoolScores, {
        tension: radar ? toTensionMap(schoolTension.data) : null,
        students: mode === 'participation' ? studentsBy(allSchools, 'school') : null,
      })
    : null;
  const directoryPoints = directoryQuery.data ? directoryToGeoJSON(directoryQuery.data) : null;

  const focusFeature = drill.kreis ?? drill.regbez;
  const focusBounds = directoryFocus
    ? schoolBounds(directoryFocus)
    : drill.school
      ? schoolBounds(drill.school)
      : (cityBounds(citySchools) ?? (focusFeature && featureBounds(focusFeature)) ?? NRW_BOUNDS);

  const pulses = pulsing.flatMap((id) => {
    const school = schoolsQuery.data?.find((s) => s.id === id);
    return school ? [{ id, lon: school.lon, lat: school.lat }] : [];
  });

  function setFilters(next: MapFilters) {
    setSearchParams(
      (previous) => {
        const params = filterParams(previous, next);
        // Neuer Zeitraum ersetzt eine auf der Zeitachse gewählte Woche
        if (next.period !== filters.period) params.delete('wave');
        return params;
      },
      { preventScrollReset: true },
    );
  }

  function setWave(wave: string | undefined) {
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);
        if (wave) params.set('wave', wave);
        else params.delete('wave');
        return params;
      },
      // Abspielen erzeugt keine History-Einträge pro Woche
      { replace: true, preventScrollReset: true },
    );
  }

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
    setDirectoryFocus(null);
    navigate(clickTarget(drill, feature));
  }

  function selectSchool(id: string) {
    const school = schoolsShown.find((s) => s.id === id);
    if (!school || school.id === drill.school?.id) return;
    setDirectoryFocus(null);
    navigate(schoolTarget(drill, school));
  }

  /** Suchtreffer „Kreis“ oder „Regierungsbezirk“ direkt anspringen. */
  function selectSearchRegion(feature: RegionFeature) {
    setDirectoryFocus(null);
    const isKreis = feature.properties.type != null;
    navigate({
      regbez: isKreis ? feature.properties.regbez_id : feature.properties.id,
      kreis: isKreis ? feature.properties.id : undefined,
    });
  }

  /** Suchtreffer „Stadt“: auf den Kreis der ersten Schule springen und alle Schulen der Stadt zeigen. */
  function selectCity(value: string) {
    setDirectoryFocus(null);
    const first = schoolsQuery.data?.find((school) => school.city === value);
    if (!first) return;
    const kreis = kreiseQuery.data?.features.find((feature) => feature.properties.id === first.kreisId);
    navigate({
      regbez: kreis?.properties.regbez_id,
      kreis: first.kreisId,
      city: value,
    });
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem-env(safe-area-inset-bottom))] flex-col md:h-[calc(100dvh-5.1rem)]">
      {/* Der Spannungs-Index nutzt feste Themen (TENSION_WEIGHTS) – Themenfilter nur im Stimmungsmodus */}
      {modeUsesTopic(mode) ? (
        <TopicFilter
          topics={MAP_TOPICS}
          selectedSlug={topic.slug}
          onSelect={selectTopic}
          trailing={<FilterMenu filters={filters} onChange={setFilters} />}
        />
      ) : (
        <div className="flex shrink-0 justify-end border-b border-border bg-surface px-3 py-2">
          <FilterMenu filters={filters} onChange={setFilters} />
        </div>
      )}

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
          // Auf NRW-Ebene keine grauen Verzeichnis-Cluster; erst ab Regierungsbezirk/Kreis.
          directorySchools={drill.level === 'nrw' && !directoryFocus ? null : directoryPoints}
          pulses={pulses}
          mode={mode}
        />

        <button
          type="button"
          onClick={() => setIs3d((value) => !value)}
          aria-pressed={is3d}
          aria-label="3D-Ansicht umschalten"
          className="absolute top-24 right-3 z-10 inline-flex min-h-10 min-w-10 md:right-[25rem] items-center justify-center rounded-xl bg-card/95 px-2.5 text-sm font-semibold shadow-md ring-1 ring-border backdrop-blur hover:bg-subtle"
        >
          {is3d ? '2D' : '3D'}
        </button>

        <div className="pointer-events-none absolute top-0 right-12 left-0 p-3">
          <div className="pointer-events-auto inline-flex max-w-full flex-col gap-1 rounded-2xl bg-card/95 px-4 py-2 shadow-md ring-1 ring-border">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h1 className="text-base font-bold">Moodmap NRW</h1>
              <LiveToggle live={live} added={added} onChange={setLive} />
            </div>
            <MapSearch
              schools={schoolsQuery.data}
              directorySchools={directoryQuery.data}
              onRequestDirectory={() => setDirectoryRequested(true)}
              kreise={kreiseQuery.data}
              regbez={regbezQuery.data}
              onSelectSchool={(school) => {
                const kreis = kreiseQuery.data?.features.find(
                  (feature) => feature.properties.id === school.kreisId,
                );
                navigate({
                  regbez: kreis?.properties.regbez_id,
                  kreis: school.kreisId,
                  school: school.id,
                });
              }}
              onSelectDirectorySchool={(school) => setDirectoryFocus(school)}
              onSelectCity={selectCity}
              onSelectRegion={selectSearchRegion}
            />
            <MapBreadcrumb crumbs={breadcrumb(drill)} onNavigate={navigate} />
            <MapModeSwitch mode={mode} onChange={setMode} />
            {city && citySchools.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="rounded-full bg-subtle px-2 py-0.5">
                  Stadt {city} · {citySchools.length} {citySchools.length === 1 ? 'Schule' : 'Schulen'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      regbez: drill.regbez?.properties.id,
                      kreis: drill.kreis?.properties.id,
                    })
                  }
                  aria-label="Stadtfilter entfernen"
                  className="rounded-full px-1.5 py-0.5 text-muted hover:bg-subtle hover:text-fg"
                >
                  ×
                </button>
              </div>
            )}
            <p className="text-xs text-fg" aria-live="polite">
              {MODE_CAPTION[mode] ?? `${topic.icon} ${topic.title}`} ·{' '}
              {radar && !ministry && drill.kreis ? 'Kreis-Ansicht' : levelCaption(drill)}
              {city && ` · Stadt ${city}`}
              {activeFilterCount(filters) > 0 && ' · gefiltert'}
              {selectedWave && ` · ${weekLabel(selectedWave)}`}
              {directoryQuery.data && ` · ${directoryQuery.data.length} Schulstandorte`}
            </p>
          </div>
        </div>

        {/* Mobile: Legende über dem eingeklappten Detail-Sheet */}
        <div
          className={
            drill.level === 'nrw'
              ? 'absolute bottom-8 left-2 flex flex-col items-start md:bottom-3 md:left-3'
              : 'absolute bottom-[8.5rem] left-2 flex flex-col items-start md:bottom-3 md:left-3'
          }
        >
          <Timeline
            waves={schoolYearWaves}
            selected={selectedWave}
            playing={playing}
            onSelect={setWave}
            onPlayingChange={setPlaying}
          />
          <MapLegend mode={mode} />
          {/* Quellenhinweis Demo vs. Live (#160) */}
          <p className="mt-1 max-w-[16rem] rounded-lg bg-card/90 px-2 py-1 text-[10px] leading-snug text-muted ring-1 ring-border">
            Werte: kalibrierte Demo-Daten, echte Mood-Check-Stimmen als „Live“ markiert · Schulen:
            Demo-Standorte
          </p>
        </div>

        <DetailPanel
          key={drill.school?.id ?? drill.kreis?.properties.id ?? drill.regbez?.properties.id}
          drill={drill}
          mode={mode}
          filters={aggFilters}
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

import { anchorWave } from '@/lib/dataSources';
import { SourceSwitcher } from '@/components/SourceSwitcher';
import { useSelectedSource } from '@/components/useSelectedSource';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { openDataset } from '@/data/openData';
import { TOPICS } from '@/data/topics';
import type { School } from '@/types';
import type { FactsFile } from '@/types/facts';
import {
  breadcrumb,
  clickTarget,
  type DrillState,
  type DrillTarget,
  drillParams,
  levelCaption,
  isCityKreis,
  resolveDrill,
  schoolTarget,
} from './drilldown';
import {
  type Bounds,
  featureBounds,
  loadGemeinden,
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
import { LIVE_POLL_MS, useLiveCounts, useLivePulses } from './live';
import { MapModeSwitch } from './MapModeSwitch';
import { areaFacts, type FactArea, useFacts } from './facts';
import {
  isFactMode,
  type MapMode,
  modeUsesTopic,
  parseMapMode,
  RELEASE_MODES,
  studentsBy,
  trendValue,
} from './modes';
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
  needsSchoolData,
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
  /** Amtliche Daten (#297); nur in den Fakten-Modi gesetzt */
  facts?: FactsFile | null;
}

/** Gebietsebene aus der ID: Regierungsbezirk 3, Kreis 5, Gemeinde 8 Stellen (AGS). */
function factArea(id: string): FactArea | null {
  const level = ({ 3: 'regbez', 5: 'kreis', 8: 'gemeinde' } as const)[id.length as 3 | 5 | 8];
  return level ? { level, id } : null;
}

function factProperties(id: string, facts: FactsFile | null | undefined) {
  if (!facts) return {};
  const area = factArea(id);
  const values = area ? areaFacts(facts, area) : null;
  return { ausfall: values?.ausfall ?? -1, sozial: values?.sozial ?? -1, klassen: values?.klassen ?? -1 };
}

function modeProperties(id: string, scores: ScoreMap, data: ModeData) {
  const s = scores.get(id);
  const t = data.tension?.get(id);
  const students = data.students?.get(id);
  return {
    ...factProperties(id, data.facts),
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

/**
 * Wo Schulen erscheinen: erst auf Ebene Stadt – in einer Gemeinde oder in einer kreisfreien Stadt
 * (die Kreis und Stadt zugleich ist). Darüber zeigt die Karte nur Flächen. `null` = keine Schulen.
 */
type SchoolScope = { gemeindeId: string } | { kreisId: string } | null;

function schoolScope(drill: DrillState): SchoolScope {
  if (drill.gemeinde) return { gemeindeId: drill.gemeinde.properties.id };
  if (drill.kreis && isCityKreis(drill.kreis)) return { kreisId: drill.kreis.properties.id };
  // Schule in einer Gemeinde, deren Grenzen noch laden: Kreis als Rückfall
  if (drill.school)
    return drill.school.gemeindeId
      ? { gemeindeId: drill.school.gemeindeId }
      : { kreisId: drill.school.kreisId };
  return null;
}

const inScope = (scope: SchoolScope) => (s: School) =>
  scope != null && ('gemeindeId' in scope ? s.gemeindeId === scope.gemeindeId : s.kreisId === scope.kreisId);

function visibleSchools(scope: SchoolScope, schools: readonly School[], forms: readonly string[]) {
  // Schulform-Filter (#20) blendet auch die Marker anderer Schulformen aus.
  const inForm = (s: School) => forms.length === 0 || forms.includes(s.schoolForm);
  return scope ? schools.filter((s) => inScope(scope)(s) && inForm(s)) : [];
}

/** Ausschnitt um eine Schule: nahe genug für die 3D-Gebäudeansicht. */
function schoolBounds(school: School): Bounds {
  const d = 0.0025;
  return [
    [school.lon - d * 1.6, school.lat - d],
    [school.lon + d * 1.6, school.lat + d],
  ];
}

/** Untertitel je Modus; `null` = gewähltes Thema anzeigen */
/** Ein Satz, was man auf dieser Ebene tun kann – statt Fachbegriffen. */
function levelHint(drill: DrillState, schoolsVisible: boolean, factMode = false): string {
  if (drill.school) return 'Schule ausgewählt – Details siehst du unten bzw. rechts.';
  if (schoolsVisible && factMode) return 'Die Werte der einzelnen Schulen stehen im Detailbereich.';
  if (schoolsVisible) return 'Tippe auf eine Schule für ihre Werte.';
  if (drill.kreis) return 'Tippe auf eine Stadt oder Gemeinde.';
  if (drill.regbez) return 'Tippe auf einen Kreis oder eine kreisfreie Stadt.';
  return 'Tippe auf einen Regierungsbezirk, um hineinzuzoomen.';
}

const MODE_CAPTION: Record<MapMode, string | null> = {
  mood: null,
  ausfall: '📉 Unterrichtsausfall 2024/25 (amtlich)',
  sozial: '🧭 Schulsozialindex 2025/26 (amtlich)',
  klassen: '👥 Schüler:innen je Klasse 2025/26 (amtlich)',
  trend: null,
  participation: '🙋 Beteiligung diese Woche',
  radar: '📡 Spannungs-Index aus 6 Themen',
};

export function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTopic = searchParams.get('topic');
  const topic = MAP_TOPICS.find((entry) => entry.slug === requestedTopic) ?? MAP_TOPICS[0]!;
  const topicSlug = topic.slug as MapTopic;
  // Datenquelle (#272) früh, damit eine leere Live-Woche direkt mit amtlichen Daten startet (#301)
  const source = useSelectedSource();
  const noVotesYet = source.selected?.kind === 'live' && source.selected.n === 0;
  const defaultMode: MapMode = noVotesYet ? 'ausfall' : 'mood';
  const mode = searchParams.has('mode') ? parseMapMode(searchParams.get('mode')) : defaultMode;
  const radar = mode === 'radar';
  const factMode = isFactMode(mode);
  const factsQuery = useFacts(factMode);
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

  // #250: Stammdaten erst laden, wenn Drill, Stadt, Live, Beteiligung oder Suche sie brauchen.
  const [searchOpen, setSearchOpen] = useState(false);
  const live = searchParams.get('live') === '1';
  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: () => loadSchools(),
    enabled: needsSchoolData(searchParams, mode, searchOpen),
    staleTime: Infinity,
    retry: false,
  });
  // Kreis zuerst ohne Gemeinden auflösen, dann dessen Gemeindegrenzen nachladen (Ebene Stadt).
  const kreisDrill = resolveDrill(searchParams, regbezQuery.data, kreiseQuery.data, schoolsQuery.data);
  const gemeindeKreisId =
    kreisDrill.kreis && !isCityKreis(kreisDrill.kreis) ? kreisDrill.kreis.properties.id : null;
  const gemeindenQuery = useQuery({
    queryKey: ['geo', 'gemeinden', gemeindeKreisId],
    queryFn: () => loadGemeinden(gemeindeKreisId!),
    enabled: gemeindeKreisId != null,
    staleTime: Infinity,
    retry: false,
  });
  const gemeinden = gemeindeKreisId ? gemeindenQuery.data : undefined;
  const drill = resolveDrill(searchParams, regbezQuery.data, kreiseQuery.data, schoolsQuery.data, gemeinden);
  const focusRegbezId = drill.regbez?.properties.id ?? null;
  const scope = schoolScope(drill);
  const filters = parseFilters(searchParams);
  // Release-Ansicht (#295): nur Stimmung, Thema und Suche. Modi, Live, Filter und Kartenextras
  // erscheinen mit `?erweitert=1` – oder automatisch, sobald einer davon per URL aktiv ist.
  const advanced =
    searchParams.get('erweitert') === '1' ||
    !RELEASE_MODES.includes(mode) ||
    live ||
    activeFilterCount(filters) > 0 ||
    searchParams.has('wave');
  // Das 1,1-MB-Verzeichnis erst laden, wenn es gebraucht wird: Suche oder graue Standorte einer Stadt.
  const [directoryRequested, setDirectoryRequested] = useState(false);
  const directoryQuery = useQuery({
    queryKey: ['schools', 'directory'],
    queryFn: loadSchoolDirectory,
    enabled: directoryRequested || (scope != null && filters.directory),
    staleTime: Infinity,
    retry: false,
  });

  // Landesansicht: Regierungsbezirke (Fallback: Kreise, falls die RegBez-Datei fehlt).
  // Ab Regierungsbezirk: alle Kreise, die außerhalb des Bezirks werden abgeblendet. Im Kreis ersetzen
  // dessen Gemeinden die Kreisfläche (Ebene Stadt), die Nachbarkreise bleiben als Kontext.
  const regionLevel = drill.level === 'nrw' && regbezQuery.data ? 'regbez' : 'kreis';
  const showGemeinden = Boolean(gemeinden && drill.kreis);
  const shown =
    regionLevel === 'regbez'
      ? regbezQuery.data
      : kreiseQuery.data && showGemeinden
        ? {
            ...kreiseQuery.data,
            features: [
              ...kreiseQuery.data.features.filter((f) => f.properties.id !== drill.kreis!.properties.id),
              ...gemeinden!.features,
            ],
          }
        : kreiseQuery.data;

  // Aggregate aus der DataSource (#68), bereits k-anonymisiert (score null unter K_MIN)
  useLiveAggregates();
  const poll = live ? LIVE_POLL_MS : false;
  // Weitere Filter (#20): Schulform, Stufe, Zeitraum → an alle Abfragen außer dem Live-Zähler
  const currentWave = useCurrentWave();
  // Datenquelle (#272): Import-Befragungen beziehen Zeitachse und Zeiträume auf ihre letzte Woche
  const anchor = anchorWave(source.selected, currentWave.data?.id);
  // Zeitachse (#34): eine gewählte Woche überschreibt den Zeitraum-Filter
  const schoolYearWaves = periodWaveIds('year', anchor) ?? [];
  const requestedWave = searchParams.get('wave');
  const selectedWave = schoolYearWaves.find((w) => w === requestedWave);
  const [playing, setPlaying] = useState(false);
  const [is3d, setIs3d] = useState(false);
  const [viewResetKey, setViewResetKey] = useState(0);
  const [directoryFocus, setDirectoryFocus] = useState<School | null>(null);
  const aggFilters: AggregateFilters = {
    schoolForm: filters.schoolForm,
    gradeBand: filters.gradeBand,
    waveIds: selectedWave ? [selectedWave] : periodWaveIds(filters.period, anchor),
    sourceId: source.sourceId,
  };
  const regionAggregates = useAggregates(regionLevel, topicSlug, {
    refetchInterval: poll,
    filters: aggFilters,
  });
  const scopeId = scope ? ('gemeindeId' in scope ? scope.gemeindeId : scope.kreisId) : undefined;
  const gemeindeAggregates = useAggregates('gemeinde', topicSlug, {
    parentId: drill.kreis?.properties.id,
    enabled: showGemeinden,
    refetchInterval: poll,
    filters: aggFilters,
  });
  const schoolAggregates = useAggregates('school', topicSlug, {
    parentId: scopeId,
    enabled: scope != null,
    refetchInterval: poll,
    filters: aggFilters,
  });
  // Live (#24): alle Schulen beobachten, damit neue Stimmen auch in der Landesansicht pulsieren
  // #253: schlanker Delta-Poll statt aller Schul-Aggregate NRW-weit alle 2,5 s
  const liveCounts = useLiveCounts(live, source.sourceId);
  const { pulsing, added } = useLivePulses(liveCounts, live, source.sourceId ?? 'default');

  const regionTension = useTension(regionLevel, {
    enabled: radar,
    refetchInterval: poll,
    filters: aggFilters,
  });
  const gemeindeTension = useTension('gemeinde', {
    parentId: drill.kreis?.properties.id,
    enabled: radar && showGemeinden,
    refetchInterval: poll,
    filters: aggFilters,
  });
  const schoolTension = useTension('school', {
    parentId: scopeId,
    enabled: radar && ministry && scope != null,
    refetchInterval: poll,
    filters: aggFilters,
  });

  const allSchools = schoolsQuery.data ?? [];
  // Kreis- und Gemeindewerte in einer Karte: die IDs (5- bzw. 8-stellig) überschneiden sich nie.
  const merge = <V,>(a: ReadonlyMap<string, V>, b: ReadonlyMap<string, V> | null) =>
    b ? new Map([...a, ...b]) : a;
  const scored = shown
    ? scoreRegions(
        shown,
        merge(toScoreMap(regionAggregates.data), showGemeinden ? toScoreMap(gemeindeAggregates.data) : null),
        focusRegbezId,
        {
          facts: factMode ? factsQuery.data : null,
          tension: radar
            ? merge(
                toTensionMap(regionTension.data),
                showGemeinden ? toTensionMap(gemeindeTension.data) : null,
              )
            : null,
          students:
            mode === 'participation'
              ? merge(
                  studentsBy(allSchools, regionLevel),
                  showGemeinden ? studentsBy(allSchools, 'gemeinde') : null,
                )
              : null,
        },
      )
    : null;

  // Amtliche Daten hängen an echten Schulnummern; die Karte zeigt sie als Flächen, Schulen stehen im Panel.
  const schoolsShown =
    schoolsQuery.data && !factMode && (!radar || ministry)
      ? visibleSchools(scope, schoolsQuery.data, filters.schoolForm)
      : [];
  const schoolScores = toScoreMap(schoolAggregates.data);
  // „Schulen ohne Daten“ aus: auch Schulen unter K_MIN ausblenden, nicht nur Verzeichnis-Standorte.
  const schoolsVisible = filters.directory
    ? schoolsShown
    : schoolsShown.filter((s) => schoolScores.get(s.id)?.score != null);
  const schoolPoints = schoolsVisible.length
    ? withModeData(schoolsToGeoJSON(schoolsVisible, schoolScores), schoolScores, {
        tension: radar ? toTensionMap(schoolTension.data) : null,
        students: mode === 'participation' ? studentsBy(allSchools, 'school') : null,
      })
    : null;
  // Graue Standorte ohne Werte: nur in der gewählten Stadt und nur, wenn im Filter eingeschaltet.
  // Ein Suchtreffer aus dem Verzeichnis bleibt immer sichtbar.
  // Schulen, die schon als Stimmungs-Punkt da sind (im Live-Betrieb alle echten), nicht doppelt zeigen.
  const shownIds = new Set(schoolsShown.map((s) => s.id));
  const directoryShown = directoryQuery.data
    ? directoryQuery.data.filter(
        (s) =>
          !factMode &&
          !shownIds.has(s.id) &&
          ((filters.directory && inScope(scope)(s)) || s.id === directoryFocus?.id),
      )
    : [];
  const directoryPoints = directoryShown.length ? directoryToGeoJSON(directoryShown) : null;

  const focusFeature = drill.gemeinde ?? drill.kreis ?? drill.regbez;
  const focusBounds = directoryFocus
    ? schoolBounds(directoryFocus)
    : drill.school
      ? schoolBounds(drill.school)
      : ((focusFeature && featureBounds(focusFeature)) ?? NRW_BOUNDS);

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
        if (next === defaultMode) params.delete('mode');
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
    setDirectoryFocus(null);
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

  /** Suchtreffer „Stadt“: in die Gemeinde der ersten Schule dieser Stadt springen (Ebene Stadt). */
  function selectCity(value: string) {
    setDirectoryFocus(null);
    const first =
      schoolsQuery.data?.find((school) => school.city === value) ??
      directoryQuery.data?.find((school) => school.city === value);
    if (!first) return;
    const kreis = kreiseQuery.data?.features.find((feature) => feature.properties.id === first.kreisId);
    navigate({
      regbez: kreis?.properties.regbez_id,
      kreis: first.kreisId,
      gemeinde: isCityKreis(kreis) ? undefined : first.gemeindeId,
    });
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem-env(safe-area-inset-bottom))] w-full flex-col md:h-[calc(100dvh-5.1rem)]">
      <h1 className="sr-only">Moodmap NRW</h1>
      {/* Eine Werkzeugleiste: Was sehe ich (Thema), wie (Ansicht), Filter. Der Spannungs-Index nutzt feste
          Themen (TENSION_WEIGHTS) – die Themenwahl gibt es nur, wo sie wirkt. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
        {modeUsesTopic(mode) && (
          <TopicFilter topics={MAP_TOPICS} selectedSlug={topic.slug} onSelect={selectTopic} />
        )}
        {/* Mobil: eigene zweite Zeile, damit Thema, Live und Filter oben in eine Zeile passen */}
        <div className="order-last w-full sm:order-none sm:w-auto">
          <MapModeSwitch mode={mode} onChange={setMode} modes={advanced ? undefined : RELEASE_MODES} />
        </div>
        {advanced && (
          <>
            <div className="ml-auto flex items-center gap-2">
              {/* Live nur für Quellen, in die gerade abgestimmt wird */}
              {source.selected?.kind !== 'import' && (
                <LiveToggle live={live} added={added} onChange={setLive} />
              )}
              <FilterMenu
                filters={filters}
                onChange={setFilters}
                extra={
                  source.sources.length > 1 || source.unknown ? <SourceSwitcher selection={source} /> : null
                }
              />
            </div>
          </>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <MoodMap
          regions={scored}
          selectedId={drill.gemeinde?.properties.id ?? drill.kreis?.properties.id ?? null}
          focusBounds={focusBounds}
          // Ab Ebene Stadt stehen die Schulen im Vordergrund, die Flächen treten zurück.
          muted={scope != null}
          detailOpen={drill.level !== 'nrw'}
          onSelect={selectRegion}
          schools={schoolPoints}
          clusterSchools={false}
          selectedSchoolId={drill.school?.id ?? null}
          onSelectSchool={selectSchool}
          is3d={is3d}
          onPitchChange={setIs3d}
          directorySchools={directoryPoints}
          focusSchool={directoryFocus}
          pulses={pulses}
          mode={mode}
          onResetView={() => {
            setDirectoryFocus(null);
            setIs3d(false);
            setViewResetKey((value) => value + 1);
            navigate({});
          }}
          onToggle3d={() => setIs3d((value) => !value)}
          viewResetKey={viewResetKey}
          extraControls={advanced}
        />

        {/* Orientierung: Suche + wo bin ich. Mehr nicht. */}
        <div className="pointer-events-none absolute top-0 right-12 left-0 z-10 p-3">
          <div className="pointer-events-auto flex w-full max-w-sm flex-col gap-2 rounded-2xl bg-card/95 p-2.5 shadow-md ring-1 ring-border">
            <MapSearch
              schools={schoolsQuery.data}
              directorySchools={directoryQuery.data}
              onRequestDirectory={() => setDirectoryRequested(true)}
              onOpenChange={setSearchOpen}
              kreise={kreiseQuery.data}
              regbez={regbezQuery.data}
              onSelectSchool={(school) => {
                setIs3d(true);
                const kreis = kreiseQuery.data?.features.find(
                  (feature) => feature.properties.id === school.kreisId,
                );
                navigate({
                  regbez: kreis?.properties.regbez_id,
                  kreis: school.kreisId,
                  gemeinde: isCityKreis(kreis) ? undefined : school.gemeindeId,
                  school: school.id,
                });
              }}
              onSelectDirectorySchool={(school) => {
                setIs3d(true);
                setDirectoryFocus(school);
              }}
              onSelectCity={selectCity}
              onSelectRegion={selectSearchRegion}
            />
            <MapBreadcrumb crumbs={breadcrumb(drill)} onNavigate={navigate} />
            <p className="px-1 text-xs text-muted">{levelHint(drill, scope != null, factMode)}</p>
            {source.unknown && <SourceSwitcher selection={source} />}
            {/* Leere Woche: einladen statt nur grau zeigen */}
            {mode === 'mood' &&
              source.selected &&
              source.selected.n === 0 &&
              source.selected.kind !== 'import' && (
                <div className="rounded-xl bg-accent/10 p-3 text-sm" role="status">
                  <p className="font-semibold">Noch keine Stimmen diese Woche</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Die Karte färbt sich, sobald pro Region mindestens 10 Schüler:innen mitgemacht haben.
                  </p>
                  <Link
                    to="/check"
                    className="mt-2 inline-flex min-h-9 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-fg"
                  >
                    Mood-Check machen
                  </Link>
                </div>
              )}
            {/* Für Screenreader: was die Karte gerade zeigt */}
            <p className="sr-only" aria-live="polite">
              {MODE_CAPTION[mode] ?? `${topic.icon} ${topic.title}`} ·{' '}
              {radar && !ministry && drill.kreis ? 'Kreis-Ansicht' : levelCaption(drill)}
              {activeFilterCount(filters) > 0 && ' · gefiltert'}
              {selectedWave && ` · ${weekLabel(selectedWave)}`}
              {scope && ` · ${schoolsVisible.length + directoryShown.length} Schulen`}
            </p>
          </div>
        </div>

        {/* Mobile: Legende über dem eingeklappten Detail-Sheet */}
        <div
          className={
            drill.level === 'nrw'
              ? 'absolute bottom-8 left-2 flex flex-col items-start gap-1 md:bottom-3 md:left-3'
              : 'absolute bottom-[8.5rem] left-2 flex flex-col items-start gap-1 md:bottom-3 md:left-3'
          }
        >
          {/* Zeitachse nur, wo Wochen zählen: im Trend oder wenn eine Woche gewählt ist */}
          {(mode === 'trend' || selectedWave) && (
            <Timeline
              waves={schoolYearWaves}
              selected={selectedWave}
              playing={playing}
              onSelect={setWave}
              onPlayingChange={setPlaying}
              latestLabel={source.selected?.kind === 'import' ? 'letzte Befragungswoche' : undefined}
            />
          )}
          <MapLegend mode={mode} />
          <p className="max-w-[17rem] rounded-lg bg-card/90 px-2 py-1 text-[10px] leading-snug text-muted ring-1 ring-border">
            {factMode ? (
              <>
                Amtliche Daten:{' '}
                {
                  openDataset(mode === 'ausfall' ? 'untstat' : mode === 'sozial' ? 'sozialindex' : 'eckdaten')
                    .publisher
                }{' '}
                ·{' '}
                <Link to="/quellen" className="underline hover:text-fg">
                  Quellen & Lizenzen
                </Link>
              </>
            ) : (
              <>
                {source.selected ? source.selected.label : 'Anonyme Live-Befragung'} ·{' '}
                <Link to="/methodik" className="underline hover:text-fg">
                  Wie wird gerechnet?
                </Link>{' '}
                ·{' '}
                <Link to="/quellen" className="underline hover:text-fg">
                  Quellen
                </Link>
              </>
            )}
          </p>
        </div>

        <DetailPanel
          key={
            drill.school?.id ??
            drill.gemeinde?.properties.id ??
            drill.kreis?.properties.id ??
            drill.regbez?.properties.id
          }
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

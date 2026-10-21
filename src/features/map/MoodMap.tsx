import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Geometry } from 'geojson';
import type { GeoJSONSource, StyleSpecification } from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import { MOOD_FILL_EXPRESSION, moodColorExpression, NO_DATA, scoreToLevel } from '@/lib/colors';
import { useTheme } from '@/lib/theme';
import { type Bounds, GERMANY_MAX_BOUNDS, NRW_BOUNDS, type RegionProperties } from './geo';
import { maplibre } from './maplibreSetup';
import {
  formatRate,
  formatTrend,
  hasTrend,
  type MapMode,
  PARTICIPATION_FILL_EXPRESSION,
  TREND_FILL_EXPRESSION,
} from './modes';
import { TENSION_FILL_EXPRESSION, TENSION_INFO } from './radar';
import type { SchoolCollection, SchoolPointProperties } from './schools';

/** `dim` = liegt außerhalb des fokussierten Regierungsbezirks (Drill-down #17) */
type ScoredProperties = RegionProperties & { score: number; n: number; dim?: boolean };

interface MoodMapProps {
  regions: FeatureCollection<Geometry, ScoredProperties> | null;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Kartenausschnitt der aktuellen Drill-down-Ebene; Änderungen lösen eine Kamerafahrt aus. */
  focusBounds?: Bounds;
  /** Detail-Panel (#19) offen: Desktop-Sidebar rechts bzw. Mobile-Sheet unten – Kamera spart den Platz aus */
  detailOpen?: boolean;
  /** Flächen zurücknehmen, damit Schul-Marker in derselben Farbskala lesbar sind (Kreis-/Schulebene) */
  muted?: boolean;
  /** Schul-Marker (#18) */
  schools?: SchoolCollection | null;
  /** Clustern (Regierungsbezirk); im Kreis sind es wenige genug für Einzel-Marker */
  clusterSchools?: boolean;
  /** Kartenmodus (#42): im Frühwarn-Radar färben Flächen/Schulen nach Spannungs-Stufe (Property `tension`) */
  mode?: MapMode;
  /** Live-Modus (#24): Schulen mit neuen Stimmen pulsieren – auf jeder Ebene */
  pulses?: readonly { id: string; lon: number; lat: number }[];
  selectedSchoolId?: string | null;
  onSelectSchool?: (id: string) => void;
}

const BASEMAP_URLS = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

/** Fallback ohne Tile-Server: nur Hintergrund, die Mood-Flächen reichen für die Demo. */
const blankStyle = (dark: boolean): StyleSpecification => ({
  version: 8,
  sources: {},
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': dark ? '#0f172a' : '#eef2f6' } },
  ],
});

const FILL_LAYER_ID = 'regions-fill';
const SCHOOL_LAYER_ID = 'schools-points';
const CLUSTER_LAYER_ID = 'schools-clusters';

/** Ø-Score eines Clusters: nur Schulen mit genug Antworten, gewichtet nach n (-1 = keine) */
const CLUSTER_SCORE = [
  'case',
  ['>', ['get', 'scoredN'], 0],
  ['/', ['get', 'weighted'], ['get', 'scoredN']],
  -1,
] as const;

/** 3D-Gebäude aus dem bereits vorhandenen OpenFreeMap-Vektortileset (#85). */
const BUILDING_LAYER_ID = 'buildings-3d';
const BUILDING_SOURCE = 'openmaptiles';
const BUILDING_SOURCE_LAYER = 'building';
/** Erste Label-Ebene in Positron: Gebäude davor einfügen, damit Labels lesbar bleiben. */
const FIRST_SYMBOL_LAYER_IDS = { light: 'waterway_line_label', dark: 'water_name' };

const BUILDING_COLOR = ['coalesce', ['get', 'colour'], '#d6d3d1'] as unknown as string;
const BUILDING_HEIGHT = ['coalesce', ['get', 'render_height'], 8] as unknown as number;
const BUILDING_BASE = ['coalesce', ['get', 'render_min_height'], 0] as unknown as number;

/** Öffentliche Gebäude/POIs (#102) – Schulen kommen separat über #18. */
const POI_LAYER_ID = 'public-buildings';
const POI_SOURCE_LAYER = 'poi';
const PLACE_DETAIL_LAYER_ID = 'places-detail';
/** Both styles use different IDs for their first place-name layer. */
const LABEL_INSERT_BEFORE = { light: 'label_other', dark: 'place_other' };

const PUBLIC_POI_CLASSES = [
  'townhall',
  'town_hall',
  'courthouse',
  'government',
  'post',
  'hospital',
  'clinic',
  'library',
  'police',
  'fire_station',
  'community_centre',
  'kindergarten',
  'college',
  'university',
  'museum',
  'place_of_worship',
  'station',
] as const;

const PUBLIC_POI_FILTER = ['in', ['get', 'class'], ['literal', PUBLIC_POI_CLASSES]] as never;

const PLACE_DETAIL_FILTER = [
  'in',
  ['get', 'class'],
  ['literal', ['hamlet', 'suburb', 'quarter', 'neighbourhood']],
] as never;

const POI_ICON = [
  'match',
  ['get', 'class'],
  ['townhall', 'town_hall', 'courthouse', 'government'],
  '🏛️',
  ['hospital', 'clinic'],
  '🏥',
  'library',
  '📚',
  'police',
  '🚓',
  'fire_station',
  '🚒',
  'community_centre',
  '🏘️',
  'kindergarten',
  '🧸',
  ['college', 'university'],
  '🎓',
  'museum',
  '🖼️',
  'place_of_worship',
  '⛪',
  'station',
  '🚉',
  'post',
  '📮',
  '🏢',
] as unknown as string;

const POI_LABEL = [
  'case',
  ['has', 'name'],
  ['concat', POI_ICON, ' ', ['coalesce', ['get', 'name'], ['get', 'name_de']]],
  POI_ICON,
] as unknown as string;

const PLACE_LABEL = ['coalesce', ['get', 'name'], ['get', 'name_de']] as unknown as string;

/** Bei hohem Zoom zurückhaltender, damit Gebäude/Schulgelände sichtbar werden. */
/**
 * Deckkraft je Zoom (#85: Flächen treten für 3D-Gebäude zurück), abgeblendet außerhalb des Drill-downs (#17)
 * und insgesamt zurückgenommen, wenn Schul-Marker in derselben Farbskala darauf liegen (#18).
 */
function regionFillOpacity(muted: boolean) {
  const f = muted ? 0.4 : 1;
  const dimmed = (normal: number, dim: number) => ['case', ['==', ['get', 'dim'], true], dim * f, normal * f];
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    5,
    dimmed(0.78, 0.22),
    12,
    dimmed(0.78, 0.22),
    15,
    dimmed(0.32, 0.1),
    17,
    dimmed(0.12, 0.05),
  ] as unknown as number;
}

/** Deutschland-Maske: alles außerhalb Deutschlands ausblenden (#90, #132). */
const GERMANY_MASK_URL = '/geo/non-germany-mask.geojson';
const GERMANY_OUTLINE_URL = '/geo/germany.geojson';
/** Fast blickdicht: Die Basiskarte ist selbst hell bzw. dunkel, 62 % ließen Nachbarländer samt Ortsnamen durchscheinen. */
const MASK_FILL_OPACITY = 0.92;
/** Weicher Übergang an der Grenze statt harter Kante (FB-007) */
const MASK_EDGE_PAINT = { 'line-width': 28, 'line-blur': 24, 'line-opacity': 0.85 } as const;

/** Pflicht-Quellenvermerk für die Grenzen (docs/ARCHITECTURE.md §6) */
const BOUNDARY_ATTRIBUTION =
  '© <a href="https://www.bkg.bund.de" target="_blank" rel="noopener">BKG</a> (2026) ' +
  '<a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener">dl-de/by-2-0</a>, ' +
  'Datenquellen: <a href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf" target="_blank" rel="noopener">VG250</a> – Geometrien vereinfacht · ' +
  'Deutschland: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> (Public Domain)';

type HoverInfo = { lng: number; lat: number } & (
  | { kind: 'region'; props: ScoredProperties }
  | { kind: 'school'; props: SchoolPointProperties }
  | { kind: 'cluster'; props: { point_count: number; weighted: number; scoredN: number } }
);

/** Platz für Info-Box (oben) und Legende (unten), damit die fokussierte Fläche nicht verdeckt wird */
const FOCUS_PADDING = { top: 120, bottom: 72, left: 24, right: 56 };
const MOBILE_FOCUS_PADDING = { top: 168, bottom: 80, left: 16, right: 16 };
/** Platz, den das Detail-Panel (#19) belegt: Sidebar-Breite inkl. Rand bzw. Höhe des eingeklappten Sheets */
const PANEL_WIDTH = 392;
const SHEET_PEEK = 120;

export function MoodMap({
  regions,
  selectedId,
  onSelect,
  focusBounds = NRW_BOUNDS,
  muted = false,
  detailOpen = false,
  schools,
  clusterSchools = true,
  pulses = [],
  mode = 'mood',
  selectedSchoolId,
  onSelectSchool,
}: MoodMapProps) {
  const theme = useTheme();
  const dark = theme === 'dark';
  /** = Seitenhintergrund (--color-surface), damit die Karte außerhalb Deutschlands in die Seite übergeht */
  const maskColor = dark ? '#0f172a' : '#f8fafc';
  const mapRef = useRef<MapRef>(null);
  const [basemapFailed, setBasemapFailed] = useState(false);
  const mapStyle = useMemo(
    () => (basemapFailed ? blankStyle(dark) : BASEMAP_URLS[theme]),
    [basemapFailed, dark, theme],
  );
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Kamera folgt der Ebene – auch bei Browser-Zurück und geteilten Links.
  const boundsKey = focusBounds.flat().join(',');
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    // Mobile: Info-Box mit Breadcrumb ist zweizeilig, unten liegt der Quellenvermerk.
    const width = map.getContainer().clientWidth;
    const base = width < 480 ? MOBILE_FOCUS_PADDING : FOCUS_PADDING;
    const padding = !detailOpen
      ? base
      : width >= 768
        ? { ...base, right: base.right + PANEL_WIDTH }
        : { ...base, bottom: base.bottom + SHEET_PEEK };
    map.fitBounds(focusBounds, { padding, duration: 800 });
    // boundsKey statt focusBounds: das Array ist bei jedem Render neu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, boundsKey, detailOpen]);

  const selectedFilter = useMemo(
    () => ['==', ['get', 'id'], selectedId ?? ''] as ['==', ['get', string], string],
    [selectedId],
  );

  const selectedSchoolFilter = useMemo(
    () => ['==', ['get', 'id'], selectedSchoolId ?? ''] as ['==', ['get', string], string],
    [selectedSchoolId],
  );

  function handleMove(e: MapLayerMouseEvent) {
    // Features kommen von oben nach unten: Schulen/Cluster vor Flächen
    const f = e.features?.[0];
    if (!f) return setHover(null);
    const pos = { lng: e.lngLat.lng, lat: e.lngLat.lat };
    if (f.layer.id === CLUSTER_LAYER_ID) {
      setHover({
        ...pos,
        kind: 'cluster',
        props: f.properties as Extract<HoverInfo, { kind: 'cluster' }>['props'],
      });
    } else if (f.layer.id === SCHOOL_LAYER_ID) {
      setHover({ ...pos, kind: 'school', props: f.properties as SchoolPointProperties });
    } else {
      setHover({ ...pos, kind: 'region', props: f.properties as ScoredProperties });
    }
  }

  function handleClick(e: MapLayerMouseEvent) {
    const f = e.features?.[0];
    if (!f) {
      onSelect?.(null);
      return;
    }
    // Tooltip schließen: nach der Kamerafahrt stünde er sonst an fremder Stelle
    setHover(null);
    if (f.layer.id === CLUSTER_LAYER_ID) {
      zoomIntoCluster(f.properties.cluster_id as number, e.lngLat);
    } else if (f.layer.id === SCHOOL_LAYER_ID) {
      onSelectSchool?.((f.properties as SchoolPointProperties).id);
    } else {
      onSelect?.((f.properties as ScoredProperties).id);
    }
  }

  async function zoomIntoCluster(clusterId: number, center: { lng: number; lat: number }) {
    const map = mapRef.current;
    const source = map?.getSource('schools') as GeoJSONSource | undefined;
    if (!map || !source) return;
    const zoom = await source.getClusterExpansionZoom(clusterId);
    map.easeTo({ center: [center.lng, center.lat], zoom, duration: 600 });
  }

  /** Auf schmalen Screens startet MapLibre die Attribution aufgeklappt – mit BKG-Text verdeckt sie die Legende. */
  function collapseAttribution() {
    const attrib = mapRef.current?.getContainer().querySelector('.maplibregl-ctrl-attrib.maplibregl-compact');
    attrib?.classList.remove('maplibregl-compact-show');
  }

  const hoverScore =
    hover?.kind === 'cluster'
      ? hover.props.scoredN > 0
        ? hover.props.weighted / hover.props.scoredN
        : null
      : hover && hover.props.score >= 0
        ? hover.props.score
        : null;
  const hoverLevel = scoreToLevel(hoverScore);
  const radar = mode === 'radar';
  const modeProps =
    mode !== 'mood' && hover && hover.kind !== 'cluster'
      ? (hover.props as { tension?: string; tindex?: number; tdelta?: number; rate?: number })
      : null;
  const hoverTension = radar ? modeProps : null;
  const fillExpression = {
    mood: MOOD_FILL_EXPRESSION,
    trend: TREND_FILL_EXPRESSION,
    participation: PARTICIPATION_FILL_EXPRESSION,
    radar: TENSION_FILL_EXPRESSION,
  }[mode];

  return (
    <MapGL
      ref={mapRef}
      mapLib={maplibre}
      initialViewState={{ bounds: NRW_BOUNDS, fitBoundsOptions: { padding: 24 } }}
      mapStyle={mapStyle}
      onLoad={() => {
        collapseAttribution();
        setLoaded(true);
      }}
      onError={(e) => {
        // Nur wenn der Basemap-Stil gar nicht lädt. Einzelne Kachel-Fehler (tragen eine sourceId) dürfen die
        // Karte nicht mitten in der Demo auf den leeren Fallback umschalten und die Kamerafahrt abbrechen.
        if ((e as unknown as { sourceId?: string }).sourceId || loaded) return;
        setBasemapFailed(true);
      }}
      onZoomEnd={(event) => {
        // Ab Schulebene leicht kippen, damit die 3D-Gebäude sichtbar sind.
        const targetPitch = event.viewState.zoom >= 15 ? 45 : 0;
        if (Math.abs(event.viewState.pitch - targetPitch) > 1) {
          mapRef.current?.easeTo({ pitch: targetPitch, duration: 400 });
        }
      }}
      interactiveLayerIds={[FILL_LAYER_ID, SCHOOL_LAYER_ID, CLUSTER_LAYER_ID]}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
      onClick={handleClick}
      cursor={hover ? 'pointer' : 'grab'}
      // Ab Zoom 6: keine groben Europa-Kacheln; die NRW-Startansicht liegt auf allen Breiten darüber
      minZoom={6}
      maxZoom={18}
      maxBounds={GERMANY_MAX_BOUNDS}
      maxPitch={60}
      dragRotate={false}
      attributionControl={{ compact: true, customAttribution: BOUNDARY_ATTRIBUTION }}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {!basemapFailed && (
        <Layer
          id={BUILDING_LAYER_ID}
          source={BUILDING_SOURCE}
          source-layer={BUILDING_SOURCE_LAYER}
          type="fill-extrusion"
          minzoom={15}
          beforeId={FIRST_SYMBOL_LAYER_IDS[theme]}
          paint={{
            'fill-extrusion-color': dark ? '#475569' : BUILDING_COLOR,
            'fill-extrusion-height': BUILDING_HEIGHT,
            'fill-extrusion-base': BUILDING_BASE,
            'fill-extrusion-opacity': 0.7,
          }}
        />
      )}
      {!basemapFailed && (
        <>
          <Layer
            id={`${POI_LAYER_ID}-dot`}
            source={BUILDING_SOURCE}
            source-layer={POI_SOURCE_LAYER}
            type="circle"
            minzoom={14}
            beforeId={LABEL_INSERT_BEFORE[theme]}
            filter={PUBLIC_POI_FILTER}
            paint={{
              'circle-radius': 2.5,
              'circle-color': dark ? '#cbd5e1' : '#475569',
              'circle-stroke-color': dark ? '#0f172a' : '#ffffff',
              'circle-stroke-width': 1,
            }}
          />
          <Layer
            id={POI_LAYER_ID}
            source={BUILDING_SOURCE}
            source-layer={POI_SOURCE_LAYER}
            type="symbol"
            minzoom={14}
            beforeId={LABEL_INSERT_BEFORE[theme]}
            filter={PUBLIC_POI_FILTER}
            layout={{
              'text-field': POI_LABEL,
              'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 18, 12] as unknown as number,
              'text-anchor': 'top',
              'text-offset': [0, 0.8],
              'text-max-width': 8,
              'text-allow-overlap': false,
              'text-optional': true,
            }}
            paint={{
              'text-color': dark ? '#e2e8f0' : '#334155',
              'text-halo-color': dark ? '#0f172a' : '#ffffff',
              'text-halo-width': 1.2,
            }}
          />
          <Layer
            id={PLACE_DETAIL_LAYER_ID}
            source={BUILDING_SOURCE}
            source-layer="place"
            type="symbol"
            minzoom={11}
            beforeId={LABEL_INSERT_BEFORE[theme]}
            filter={PLACE_DETAIL_FILTER}
            layout={{
              'text-field': PLACE_LABEL,
              'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 15, 12, 18, 13] as unknown as number,
              'text-max-width': 8,
              'text-allow-overlap': false,
              'text-optional': true,
            }}
            paint={{
              'text-color': dark ? '#cbd5e1' : '#64748b',
              'text-halo-color': dark ? '#0f172a' : '#ffffff',
              'text-halo-width': 1,
            }}
          />
        </>
      )}
      {/* Über allen Basemap-Layern (auch Labels), unter NRW-Flächen und Markern */}
      <Source id="germany-mask" type="geojson" data={GERMANY_MASK_URL}>
        <Layer
          id="germany-mask-fill"
          type="fill"
          paint={{ 'fill-color': maskColor, 'fill-opacity': MASK_FILL_OPACITY }}
        />
      </Source>
      <Source id="germany-outline" type="geojson" data={GERMANY_OUTLINE_URL}>
        <Layer id="germany-mask-edge" type="line" paint={{ 'line-color': maskColor, ...MASK_EDGE_PAINT }} />
        <Layer id="germany-outline-line" type="line" paint={{ 'line-color': '#94a3b8', 'line-width': 1 }} />
      </Source>
      {regions && (
        <Source id="regions" type="geojson" data={regions} promoteId="id">
          <Layer
            id={FILL_LAYER_ID}
            type="fill"
            // Below 3D/POIs and all basemap labels; otherwise the 78%-opaque fill hides city names.
            beforeId={basemapFailed ? undefined : BUILDING_LAYER_ID}
            paint={{
              // Expression-Typen von MapLibre sind sehr streng, die Struktur ist in colors.test.ts abgesichert.
              'fill-color': fillExpression as unknown as string,
              'fill-opacity': regionFillOpacity(muted),
            }}
          />
          <Layer
            id="regions-outline"
            type="line"
            beforeId={basemapFailed ? undefined : BUILDING_LAYER_ID}
            paint={{ 'line-color': '#ffffff', 'line-width': 1 }}
          />
          <Layer
            id="regions-selected"
            type="line"
            beforeId={basemapFailed ? undefined : BUILDING_LAYER_ID}
            filter={selectedFilter}
            paint={{ 'line-color': dark ? '#f1f5f9' : '#0f172a', 'line-width': 3 }}
          />
        </Source>
      )}
      {schools && (
        <Source
          // Cluster-Optionen lassen sich nicht live ändern → Source beim Umschalten neu anlegen
          key={clusterSchools ? 'clustered' : 'points'}
          id="schools"
          type="geojson"
          data={schools}
          promoteId="id"
          cluster={clusterSchools}
          clusterMaxZoom={12}
          clusterRadius={44}
          clusterProperties={{ weighted: ['+', ['get', 'weighted']], scoredN: ['+', ['get', 'scoredN']] }}
        >
          <Layer
            id={CLUSTER_LAYER_ID}
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              // Außerhalb der Stimmung (Stufen, Δ, Quoten) ist ein Cluster-Ø nicht aussagekräftig → neutral
              'circle-color': (mode === 'mood'
                ? moodColorExpression(CLUSTER_SCORE)
                : '#94a3b8') as unknown as string,
              'circle-radius': ['step', ['get', 'point_count'], 13, 10, 17, 30, 22],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
              'circle-opacity': 0.92,
            }}
          />
          {/* Symbol-Layer brauchen Glyphen – die hat nur der Positron-Stil, nicht der Fallback */}
          {!basemapFailed && (
            <Layer
              id="schools-cluster-count"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{
                'text-field': ['get', 'point_count_abbreviated'],
                'text-font': ['Noto Sans Bold'],
                'text-size': 12,
                'text-allow-overlap': true,
              }}
              paint={{ 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 }}
            />
          )}
          <Layer
            id={SCHOOL_LAYER_ID}
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': (mode === 'mood'
                ? moodColorExpression(['get', 'score'])
                : fillExpression) as unknown as string,
              // Fläche ~ n: Radius ~ √n (docs/DESIGN.md §5); Spanne passend zu ~10–100 Antworten je Schule
              'circle-radius': ['interpolate', ['linear'], ['sqrt', ['get', 'n']], 3, 6, 10, 13],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
            }}
          />
          <Layer
            id="schools-selected"
            type="circle"
            filter={['all', ['!', ['has', 'point_count']], selectedSchoolFilter]}
            paint={{
              'circle-color': 'rgba(0,0,0,0)',
              'circle-radius': ['interpolate', ['linear'], ['sqrt', ['get', 'n']], 3, 10, 10, 17],
              'circle-stroke-color': '#0f172a',
              'circle-stroke-width': 3,
            }}
          />
        </Source>
      )}
      {pulses.map((pulse) => (
        <Marker
          key={pulse.id}
          longitude={pulse.lon}
          latitude={pulse.lat}
          anchor="center"
          style={{ pointerEvents: 'none' }}
        >
          <span className="relative flex size-6" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-mood-1 opacity-70" />
            <span className="relative m-auto inline-flex size-3 rounded-full bg-mood-1 ring-2 ring-white" />
          </span>
        </Marker>
      ))}
      {hover && (
        <Popup
          longitude={hover.lng}
          latitude={hover.lat}
          closeButton={false}
          closeOnClick={false}
          offset={12}
          // MapLibre setzt pointer-events:auto auf .maplibregl-popup-content – sonst schluckt der Tooltip Klicks
          className="pointer-events-none [&_*]:pointer-events-none"
        >
          <div className="text-sm">
            <div className="font-semibold">
              {hover.kind === 'cluster' ? `${hover.props.point_count} Schulen` : hover.props.name}
            </div>
            {hover.kind === 'school' && (
              <div className="text-xs text-muted">
                {hover.props.form} · {hover.props.city}
              </div>
            )}
            {hover.kind === 'school' && pulses.some((p) => p.id === hover.props.id) && (
              <div className="text-xs font-semibold text-mood-1">● Live-aktiv: neue Stimme</div>
            )}
            {mode === 'trend' && modeProps ? (
              hasTrend(modeProps.tdelta) ? (
                <div>{formatTrend(modeProps.tdelta!)}</div>
              ) : (
                <div className="text-muted">Trend: {NO_DATA.label}</div>
              )
            ) : mode === 'participation' && modeProps ? (
              (modeProps.rate ?? -1) >= 0 ? (
                <div>
                  {formatRate(modeProps.rate!)} · n = {(hover!.props as { n: number }).n}
                </div>
              ) : (
                <div className="text-muted">Beteiligung unbekannt</div>
              )
            ) : hoverTension ? (
              hoverTension.tension && hoverTension.tension !== 'none' ? (
                <div>
                  Spannungs-Index {Math.round(hoverTension.tindex ?? 0)} ·{' '}
                  {TENSION_INFO[hoverTension.tension as keyof typeof TENSION_INFO].label}
                </div>
              ) : (
                <div className="text-muted">{NO_DATA.label}</div>
              )
            ) : hoverLevel && hoverScore != null ? (
              <div>
                {hoverLevel.weather} {hover.kind === 'cluster' && 'Ø '}
                {Math.round(hoverScore)} · {hoverLevel.label}
                {hover.kind !== 'cluster' && <> · n = {hover.props.n}</>}
              </div>
            ) : (
              <div className="text-muted">{NO_DATA.label}</div>
            )}
            {hover.kind === 'cluster' && <div className="text-xs text-muted">Klicken zum Hineinzoomen</div>}
          </div>
        </Popup>
      )}
    </MapGL>
  );
}

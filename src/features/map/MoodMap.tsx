import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Geometry } from 'geojson';
import type { StyleSpecification } from 'maplibre-gl';
import { useMemo, useRef, useState } from 'react';
import MapGL, { Layer, NavigationControl, Popup, Source } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import { MOOD_FILL_EXPRESSION, NO_DATA, scoreToLevel } from '@/lib/colors';
import { featureBounds, NRW_BOUNDS, type RegionProperties } from './geo';
import { maplibre } from './maplibreSetup';

type ScoredProperties = RegionProperties & { score: number; n: number };

interface MoodMapProps {
  regions: FeatureCollection<Geometry, ScoredProperties> | null;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

const BASEMAP_URL = 'https://tiles.openfreemap.org/styles/positron';

/** Fallback ohne Tile-Server: nur Hintergrund, die Mood-Flächen reichen für die Demo. */
const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#eef2f6' } }],
};

const FILL_LAYER_ID = 'regions-fill';

/** 3D-Gebäude aus dem bereits vorhandenen OpenFreeMap-Vektortileset (#85). */
const BUILDING_LAYER_ID = 'buildings-3d';
const BUILDING_SOURCE = 'openmaptiles';
const BUILDING_SOURCE_LAYER = 'building';
/** Erste Label-Ebene in Positron: Gebäude davor einfügen, damit Labels lesbar bleiben. */
const FIRST_SYMBOL_LAYER_ID = 'waterway_line_label';

const BUILDING_COLOR = ['coalesce', ['get', 'colour'], '#d6d3d1'] as unknown as string;
const BUILDING_HEIGHT = ['coalesce', ['get', 'render_height'], 8] as unknown as number;
const BUILDING_BASE = ['coalesce', ['get', 'render_min_height'], 0] as unknown as number;

/** Bei hohem Zoom zurückhaltender, damit Gebäude/Schulgelände sichtbar werden. */
const REGION_FILL_OPACITY = [
  'interpolate',
  ['linear'],
  ['zoom'],
  5,
  0.78,
  12,
  0.78,
  15,
  0.32,
  17,
  0.12,
] as unknown as number;

/** Deutschland-Maske: alles außerhalb Deutschlands ausblenden (#90). */
const GERMANY_MASK_URL = '/geo/non-germany-mask.geojson';
const GERMANY_OUTLINE_URL = '/geo/germany.geojson';
const MASK_FILL_OPACITY = 0.62;

/** Pflicht-Quellenvermerk für die Grenzen (docs/ARCHITECTURE.md §6) */
const BOUNDARY_ATTRIBUTION =
  '© <a href="https://www.bkg.bund.de" target="_blank" rel="noopener">BKG</a> (2026) ' +
  '<a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener">dl-de/by-2-0</a>, ' +
  'Datenquellen: <a href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf" target="_blank" rel="noopener">VG250</a> – Geometrien vereinfacht · ' +
  'Deutschland: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> (Public Domain)';

interface HoverInfo {
  lng: number;
  lat: number;
  props: ScoredProperties;
}

export function MoodMap({ regions, selectedId, onSelect }: MoodMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapStyle, setMapStyle] = useState<string | StyleSpecification>(BASEMAP_URL);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const selectedFilter = useMemo(
    () => ['==', ['get', 'id'], selectedId ?? ''] as ['==', ['get', string], string],
    [selectedId],
  );

  function handleMove(e: MapLayerMouseEvent) {
    const f = e.features?.[0];
    setHover(f ? { lng: e.lngLat.lng, lat: e.lngLat.lat, props: f.properties as ScoredProperties } : null);
  }

  function handleClick(e: MapLayerMouseEvent) {
    const f = e.features?.[0];
    if (!f) {
      onSelect?.(null);
      return;
    }
    const id = (f.properties as ScoredProperties).id;
    onSelect?.(id);
    const full = regions?.features.find((r) => r.properties.id === id);
    const bounds = full && featureBounds(full);
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 48, duration: 800 });
  }

  /** Auf schmalen Screens startet MapLibre die Attribution aufgeklappt – mit BKG-Text verdeckt sie die Legende. */
  function collapseAttribution() {
    const attrib = mapRef.current?.getContainer().querySelector('.maplibregl-ctrl-attrib.maplibregl-compact');
    attrib?.classList.remove('maplibregl-compact-show');
  }

  const hoverLevel = hover ? scoreToLevel(hover.props.score < 0 ? null : hover.props.score) : null;

  return (
    <MapGL
      ref={mapRef}
      mapLib={maplibre}
      initialViewState={{ bounds: NRW_BOUNDS, fitBoundsOptions: { padding: 24 } }}
      mapStyle={mapStyle}
      onLoad={collapseAttribution}
      onError={() => setMapStyle((s) => (s === BASEMAP_URL ? BLANK_STYLE : s))}
      onZoomEnd={(event) => {
        // Ab Schulebene leicht kippen, damit die 3D-Gebäude sichtbar sind.
        const targetPitch = event.viewState.zoom >= 15 ? 45 : 0;
        if (Math.abs(event.viewState.pitch - targetPitch) > 1) {
          mapRef.current?.easeTo({ pitch: targetPitch, duration: 400 });
        }
      }}
      interactiveLayerIds={[FILL_LAYER_ID]}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
      onClick={handleClick}
      cursor={hover ? 'pointer' : 'grab'}
      minZoom={5}
      maxZoom={18}
      maxPitch={60}
      dragRotate={false}
      attributionControl={{ compact: true, customAttribution: BOUNDARY_ATTRIBUTION }}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {mapStyle === BASEMAP_URL && (
        <Layer
          id={BUILDING_LAYER_ID}
          source={BUILDING_SOURCE}
          source-layer={BUILDING_SOURCE_LAYER}
          type="fill-extrusion"
          minzoom={15}
          beforeId={FIRST_SYMBOL_LAYER_ID}
          paint={{
            'fill-extrusion-color': BUILDING_COLOR,
            'fill-extrusion-height': BUILDING_HEIGHT,
            'fill-extrusion-base': BUILDING_BASE,
            'fill-extrusion-opacity': 0.7,
          }}
        />
      )}
      <Source id="germany-mask" type="geojson" data={GERMANY_MASK_URL}>
        <Layer
          id="germany-mask-fill"
          type="fill"
          paint={{ 'fill-color': '#f8fafc', 'fill-opacity': MASK_FILL_OPACITY }}
        />
      </Source>
      <Source id="germany-outline" type="geojson" data={GERMANY_OUTLINE_URL}>
        <Layer id="germany-outline-line" type="line" paint={{ 'line-color': '#94a3b8', 'line-width': 1 }} />
      </Source>
      {regions && (
        <Source id="regions" type="geojson" data={regions} promoteId="id">
          <Layer
            id={FILL_LAYER_ID}
            type="fill"
            paint={{
              // Expression-Typen von MapLibre sind sehr streng, die Struktur ist in colors.test.ts abgesichert.
              'fill-color': MOOD_FILL_EXPRESSION as unknown as string,
              'fill-opacity': REGION_FILL_OPACITY,
            }}
          />
          <Layer id="regions-outline" type="line" paint={{ 'line-color': '#ffffff', 'line-width': 1 }} />
          <Layer
            id="regions-selected"
            type="line"
            filter={selectedFilter}
            paint={{ 'line-color': '#0f172a', 'line-width': 3 }}
          />
        </Source>
      )}
      {hover && (
        <Popup
          longitude={hover.lng}
          latitude={hover.lat}
          closeButton={false}
          closeOnClick={false}
          offset={12}
          className="pointer-events-none"
        >
          <div className="text-sm">
            <div className="font-semibold">{hover.props.name}</div>
            {hoverLevel ? (
              <div>
                {hoverLevel.weather} {Math.round(hover.props.score)} · {hoverLevel.label} · n ={' '}
                {hover.props.n}
              </div>
            ) : (
              <div className="text-slate-500">{NO_DATA.label}</div>
            )}
          </div>
        </Popup>
      )}
    </MapGL>
  );
}

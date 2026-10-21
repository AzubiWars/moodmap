import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Geometry } from 'geojson';
import type { StyleSpecification } from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Layer, NavigationControl, Popup, Source } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import { MOOD_FILL_EXPRESSION, NO_DATA, scoreToLevel } from '@/lib/colors';
import { type Bounds, NRW_BOUNDS, type RegionProperties } from './geo';
import { maplibre } from './maplibreSetup';

/** `dim` = liegt außerhalb des fokussierten Regierungsbezirks (Drill-down #17) */
type ScoredProperties = RegionProperties & { score: number; n: number; dim?: boolean };

interface MoodMapProps {
  regions: FeatureCollection<Geometry, ScoredProperties> | null;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Kartenausschnitt der aktuellen Drill-down-Ebene; Änderungen lösen eine Kamerafahrt aus. */
  focusBounds?: Bounds;
}

const BASEMAP_URL = 'https://tiles.openfreemap.org/styles/positron';

/** Fallback ohne Tile-Server: nur Hintergrund, die Mood-Flächen reichen für die Demo. */
const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#eef2f6' } }],
};

const FILL_LAYER_ID = 'regions-fill';

/** Pflicht-Quellenvermerk für die Grenzen (docs/ARCHITECTURE.md §6) */
const BOUNDARY_ATTRIBUTION =
  '© <a href="https://www.bkg.bund.de" target="_blank" rel="noopener">BKG</a> (2026) ' +
  '<a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener">dl-de/by-2-0</a>, ' +
  'Datenquellen: <a href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf" target="_blank" rel="noopener">VG250</a> – Geometrien vereinfacht';

interface HoverInfo {
  lng: number;
  lat: number;
  props: ScoredProperties;
}

/** Platz für Info-Box (oben) und Legende (unten), damit die fokussierte Fläche nicht verdeckt wird */
const FOCUS_PADDING = { top: 120, bottom: 72, left: 24, right: 56 };
const MOBILE_FOCUS_PADDING = { top: 128, bottom: 80, left: 16, right: 16 };

export function MoodMap({ regions, selectedId, onSelect, focusBounds = NRW_BOUNDS }: MoodMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapStyle, setMapStyle] = useState<string | StyleSpecification>(BASEMAP_URL);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Kamera folgt der Ebene – auch bei Browser-Zurück und geteilten Links.
  const boundsKey = focusBounds.flat().join(',');
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    // Mobile: Info-Box mit Breadcrumb ist zweizeilig, unten liegt der Quellenvermerk.
    const padding = map.getContainer().clientWidth < 480 ? MOBILE_FOCUS_PADDING : FOCUS_PADDING;
    map.fitBounds(focusBounds, { padding, duration: 800 });
    // boundsKey statt focusBounds: das Array ist bei jedem Render neu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, boundsKey]);

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
    // Tooltip schließen: nach der Kamerafahrt stünde er sonst an fremder Stelle
    setHover(null);
    onSelect?.((f.properties as ScoredProperties).id);
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
      onLoad={() => {
        collapseAttribution();
        setLoaded(true);
      }}
      onError={() => setMapStyle((s) => (s === BASEMAP_URL ? BLANK_STYLE : s))}
      interactiveLayerIds={[FILL_LAYER_ID]}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
      onClick={handleClick}
      cursor={hover ? 'pointer' : 'grab'}
      minZoom={5}
      maxZoom={14}
      dragRotate={false}
      attributionControl={{ compact: true, customAttribution: BOUNDARY_ATTRIBUTION }}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {regions && (
        <Source id="regions" type="geojson" data={regions} promoteId="id">
          <Layer
            id={FILL_LAYER_ID}
            type="fill"
            paint={{
              // Expression-Typen von MapLibre sind sehr streng, die Struktur ist in colors.test.ts abgesichert.
              'fill-color': MOOD_FILL_EXPRESSION as unknown as string,
              'fill-opacity': ['case', ['==', ['get', 'dim'], true], 0.22, 0.78],
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
          // MapLibre setzt pointer-events:auto auf .maplibregl-popup-content – sonst schluckt der Tooltip Klicks
          className="pointer-events-none [&_*]:pointer-events-none"
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

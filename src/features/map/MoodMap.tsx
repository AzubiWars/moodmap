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

  const hoverLevel = hover ? scoreToLevel(hover.props.score < 0 ? null : hover.props.score) : null;

  return (
    <MapGL
      ref={mapRef}
      mapLib={maplibre}
      initialViewState={{ bounds: NRW_BOUNDS, fitBoundsOptions: { padding: 24 } }}
      mapStyle={mapStyle}
      onError={() => setMapStyle((s) => (s === BASEMAP_URL ? BLANK_STYLE : s))}
      interactiveLayerIds={[FILL_LAYER_ID]}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
      onClick={handleClick}
      cursor={hover ? 'pointer' : 'grab'}
      minZoom={5}
      maxZoom={14}
      dragRotate={false}
      attributionControl={{ compact: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {regions && (
        <Source id="regions" type="geojson" data={regions}>
          <Layer
            id={FILL_LAYER_ID}
            type="fill"
            paint={{
              // Expression-Typen von MapLibre sind sehr streng, die Struktur ist in colors.test.ts abgesichert.
              'fill-color': MOOD_FILL_EXPRESSION as unknown as string,
              'fill-opacity': 0.78,
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

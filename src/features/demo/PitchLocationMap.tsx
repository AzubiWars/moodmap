import { useState } from 'react';
import Map, { AttributionControl, Marker, NavigationControl } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import { scoreToColor } from '@/lib/colors';
import { maplibre } from '@/lib/maplibreSetup';
import { useTheme } from '@/lib/theme';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Props {
  location: { id: string; name: string; city: string; lat: number; lon: number };
  score: number | null;
}
const EMPTY_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] };

/** Deliberately separate from the NRW choropleth: this location never receives NRW data. */
export function PitchLocationMap({ location, score }: Props) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="relative h-64 overflow-hidden rounded-2xl border border-border bg-subtle xl:h-72 2xl:h-80"
      role="region"
      aria-label={`Karte: ${location.name}, ${location.city}`}
    >
      <Map
        key={`${location.id}:${location.lat}:${location.lon}`}
        mapLib={maplibre}
        initialViewState={{ longitude: location.lon, latitude: location.lat, zoom: 12 }}
        mapStyle={
          failed
            ? EMPTY_STYLE
            : `https://tiles.openfreemap.org/styles/${theme === 'dark' ? 'dark' : 'positron'}`
        }
        attributionControl={false}
        scrollZoom={false}
        onError={(event) => {
          if (!(event.error as Error & { sourceId?: string }).sourceId) setFailed(true);
        }}
      >
        <AttributionControl compact />
        <NavigationControl showCompass={false} position="top-right" />
        <Marker longitude={location.lon} latitude={location.lat} anchor="bottom">
          <div className="flex max-w-64 flex-col items-center gap-2 text-center">
            <span className="rounded-xl bg-card px-3 py-2 text-sm font-semibold text-fg shadow-lg ring-1 ring-border">
              {location.name}
            </span>
            <span
              className="size-9 rounded-full border-4 border-white shadow-lg"
              style={{ backgroundColor: scoreToColor(score) }}
            />
          </div>
        </Marker>
      </Map>
      {failed && (
        <p className="absolute bottom-8 left-3 max-w-[80%] rounded-lg bg-card/95 px-3 py-2 text-sm text-muted">
          Basiskarte nicht verfügbar · Teststandort {location.city}
        </p>
      )}
    </div>
  );
}

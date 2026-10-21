import * as maplibre from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

// maplibre-gl 6 sucht seinen Worker relativ zum eigenen Modul – nach Vite-Bundling liegt er woanders.
maplibre.setWorkerUrl(workerUrl);

/** Diese Instanz an react-map-gl übergeben (`mapLib`), sonst lädt es eine zweite ohne Worker-URL. */
export { maplibre };

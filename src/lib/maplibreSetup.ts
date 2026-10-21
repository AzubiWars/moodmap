import * as maplibre from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

// Share one configured instance across the NRW and Pitch maps after Vite bundling.
maplibre.setWorkerUrl(workerUrl);
export { maplibre };

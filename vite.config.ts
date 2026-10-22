import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Kein automatisches Reload bei jedem neuen Deployment; Updates warten auf den nächsten Start.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Moodmap NRW',
        short_name: 'Moodmap',
        description: 'Das Stimmungswetter für NRWs Schulen – anonym, live auf der Karte.',
        lang: 'de',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#2B78B8',
        background_color: '#f8fafc',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // MapLibre (1,6 MB) nicht beim PWA-Install vorladen; erst bei /map per Runtime-Cache.
        globIgnores: ['**/maplibre-gl-*.js', '**/maplibre-gl-*.css', '**/maplibre-gl-worker-*.mjs'],
        // der maplibre-gl-Chunk ist größer als das Workbox-Default-Limit (2 MiB)
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/geo/') || url.pathname.startsWith('/data/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'moodmap-static-data' },
          },
          {
            urlPattern: /\/assets\/maplibre-gl-/,
            handler: 'CacheFirst',
            options: { cacheName: 'moodmap-maplibre', expiration: { maxEntries: 8 } },
          },
        ],
        skipWaiting: false,
        clientsClaim: false,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // maplibre-gl ist allein ~1,1 MB und wird nur auf /map lazy geladen
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    // PGlite-Seed-Tests und lange Survey-Flows brauchen unter voller Parallelität mehr Zeit.
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});

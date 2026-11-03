import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import { registerSW } from 'virtual:pwa-register';
import { App } from '@/app/App';
import { initializeTheme } from '@/lib/theme';
import '@/index.css';

initializeTheme();

/** Lange offene Tabs (Beamer, Ministerium) sollen neue Versionen trotzdem bemerken. */
const UPDATE_CHECK_MS = 30 * 60_000;

const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => void registration.update().catch(() => undefined);
    setInterval(check, UPDATE_CHECK_MS);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
  },
  onNeedRefresh() {
    if (document.getElementById('pwa-update-banner')) return;
    const button = document.createElement('button');
    button.id = 'pwa-update-banner';
    button.type = 'button';
    button.textContent = 'Neue Version verfügbar – jetzt aktualisieren';
    button.className =
      // Mobil über der unteren Navigation, sonst wäre der Hinweis verdeckt.
      'fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-fg shadow-lg md:bottom-4';
    button.addEventListener('click', () => {
      button.disabled = true;
      void updateSW(true);
    });
    document.body.appendChild(button);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

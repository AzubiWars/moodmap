import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import { registerSW } from 'virtual:pwa-register';
import { App } from '@/app/App';
import { initializeTheme } from '@/lib/theme';
import '@/index.css';

initializeTheme();

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (document.getElementById('pwa-update-banner')) return;
    const button = document.createElement('button');
    button.id = 'pwa-update-banner';
    button.type = 'button';
    button.textContent = 'Neue Version verfügbar – jetzt aktualisieren';
    button.className =
      'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-fg shadow-lg';
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

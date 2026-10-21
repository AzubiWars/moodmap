import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import { registerSW } from 'virtual:pwa-register';
import { App } from '@/app/App';
import { initializeTheme } from '@/lib/theme';
import '@/index.css';

initializeTheme();
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

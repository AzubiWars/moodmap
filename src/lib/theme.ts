import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'moodmap:theme:v1';
const CHANGE_EVENT = 'moodmap:theme-change';
const SYSTEM_QUERY = '(prefers-color-scheme: dark)';
let preference: Theme | null = null;

function readPreference(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function currentTheme(): Theme {
  return preference ?? (window.matchMedia?.(SYSTEM_QUERY).matches ? 'dark' : 'light');
}

function applyTheme() {
  const theme = currentTheme();
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#0f172a' : '#2B78B8');
}

/** Vor dem ersten React-Render aufrufen; ohne Auswahl gilt die Systemeinstellung. */
export function initializeTheme() {
  preference = readPreference();
  applyTheme();
}

export function setTheme(theme: Theme) {
  preference = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // In privaten Browsern bleibt die Auswahl für diese Sitzung erhalten.
  }
  applyTheme();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia?.(SYSTEM_QUERY);
  const update = () => {
    applyTheme();
    onChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    preference = readPreference();
    update();
  };
  media?.addEventListener('change', update);
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    media?.removeEventListener('change', update);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => 'light');
}

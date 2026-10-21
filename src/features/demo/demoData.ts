export const DEMO_SCHOOL_CODE = 'DEMO42';
const KEEP_KEYS = ['moodmap.role'];

export function demoSchoolUrl(origin: string) {
  return `${origin}/s/${DEMO_SCHOOL_CODE}`;
}

/** Löscht lokale Demo-Daten (Teilnahme-Flags, Schule, Geräte-Token) außer der gewählten Rolle. */
export function resetDemoData(storage: Storage = localStorage) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k?.startsWith('moodmap.') && !KEEP_KEYS.includes(k)) keys.push(k);
  }
  keys.forEach((k) => storage.removeItem(k));
}

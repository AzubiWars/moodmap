// Produktion startet nie versehentlich im Demo-Modus: fehlt die Variable, wird live erwartet.
export const DATA_MODE = import.meta.env.VITE_DATA_MODE ?? (import.meta.env.PROD ? 'supabase' : 'mock');
export const K_MIN = Number(import.meta.env.VITE_K_MIN ?? 10);

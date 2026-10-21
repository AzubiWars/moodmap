import { create } from 'zustand';

interface DemoState {
  /** Live-Modus: neue Antworten erscheinen laufend auf Karte/Dashboard (#24). */
  live: boolean;
  setLive: (live: boolean) => void;
}

export const useDemoStore = create<DemoState>()((set) => ({
  live: false,
  setLive: (live) => set({ live }),
}));

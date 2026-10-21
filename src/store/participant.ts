import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GradeBand } from '@/types';

interface ParticipantState {
  schoolId: string | null;
  schoolCode: string | null;
  schoolName: string | null;
  gradeBand?: GradeBand;
  setSchool: (school: { id: string; code: string; name: string }) => void;
  setGradeBand: (gradeBand: GradeBand | undefined) => void;
  reset: () => void;
}

/** Gewählte Schule und optionale Stufe der Teilnehmenden (nur auf diesem Gerät, nie personenbezogen). */
export const useParticipantStore = create<ParticipantState>()(
  persist(
    (set) => ({
      schoolId: null,
      schoolCode: null,
      schoolName: null,
      gradeBand: undefined,
      setSchool: ({ id, code, name }) => set({ schoolId: id, schoolCode: code, schoolName: name }),
      setGradeBand: (gradeBand) => set({ gradeBand }),
      reset: () => set({ schoolId: null, schoolCode: null, schoolName: null, gradeBand: undefined }),
    }),
    { name: 'moodmap:participant:v1' },
  ),
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GradeBand } from '@/types';

interface ParticipantState {
  schoolId: string | null;
  schoolCode: string | null;
  schoolName: string | null;
  isTest: boolean;
  gradeBand?: GradeBand;
  setSchool: (school: { id: string; code: string; name: string; isTest?: boolean }) => void;
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
      isTest: false,
      gradeBand: undefined,
      setSchool: ({ id, code, name, isTest = false }) =>
        set({ schoolId: id, schoolCode: code, schoolName: name, isTest }),
      setGradeBand: (gradeBand) => set({ gradeBand }),
      reset: () =>
        set({ schoolId: null, schoolCode: null, schoolName: null, isTest: false, gradeBand: undefined }),
    }),
    { name: 'moodmap:participant:v1' },
  ),
);

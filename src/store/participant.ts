import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GradeBand, Role } from '@/types';

interface ParticipantState {
  schoolId: string | null;
  schoolCode: string | null;
  schoolName: string | null;
  isTest: boolean;
  /** Rolle der Antwortenden (nicht der Demo-Ansicht aus `useRoleStore`); Lehrkräfte bekommen eigene Fragen (#37). */
  role: Role;
  gradeBand?: GradeBand;
  setSchool: (school: { id: string; code: string; name: string; isTest?: boolean }) => void;
  setRole: (role: Role) => void;
  setGradeBand: (gradeBand: GradeBand | undefined) => void;
  reset: () => void;
}

/** Gewählte Schule, Rolle und optionale Stufe der Teilnehmenden (nur auf diesem Gerät, nie personenbezogen). */
export const useParticipantStore = create<ParticipantState>()(
  persist(
    (set) => ({
      schoolId: null,
      schoolCode: null,
      schoolName: null,
      isTest: false,
      role: 'student',
      gradeBand: undefined,
      setSchool: ({ id, code, name, isTest = false }) =>
        set({ schoolId: id, schoolCode: code, schoolName: name, isTest }),
      setRole: (role) => set({ role }),
      setGradeBand: (gradeBand) => set({ gradeBand }),
      reset: () =>
        set({
          schoolId: null,
          schoolCode: null,
          schoolName: null,
          isTest: false,
          role: 'student',
          gradeBand: undefined,
        }),
    }),
    { name: 'moodmap:participant:v1' },
  ),
);

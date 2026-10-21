import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Demo-Ansicht (nicht zu verwechseln mit `Role` = Rolle der Antwortenden). */
export type ViewerRole = 'student' | 'school' | 'ministry';

export const VIEWER_ROLES: { value: ViewerRole; label: string }[] = [
  { value: 'student', label: 'Schüler:in' },
  { value: 'school', label: 'Schule' },
  { value: 'ministry', label: 'Ministerium' },
];

interface RoleState {
  role: ViewerRole;
  setRole: (role: ViewerRole) => void;
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: 'student',
      setRole: (role) => set({ role }),
    }),
    { name: 'moodmap.role' },
  ),
);

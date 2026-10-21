import { create } from 'zustand';
import type { AnswerInput } from '@/types';

interface LastAnswersState {
  answers: AnswerInput[];
  set: (answers: AnswerInput[]) => void;
}

/** Eigene Antworten des letzten Durchlaufs für den Danke-Screen (#29). Bewusst nicht persistiert. */
export const useLastAnswersStore = create<LastAnswersState>()((set) => ({
  answers: [],
  set: (answers) => set({ answers }),
}));

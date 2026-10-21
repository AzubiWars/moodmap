import { QUESTIONS_BY_ID } from '@/data/topics';
import type { AnswerInput, Question } from '@/types';

/** Antwort auf eine Karte: Skalenwert (mood5/swipe) oder gewählte Optionen (choice). */
export type CardAnswer = number | string[];

/** `queued`: offline abgegeben, liegt im Puffer (#36) und wird später gesendet. */
export type CheckStatus = 'asking' | 'freetext' | 'submitting' | 'done' | 'queued' | 'already' | 'error';

export interface CheckState {
  status: CheckStatus;
  /** Kernfragen in fester Reihenfolge. */
  core: Question[];
  /** Optionale Vertiefung, wird nach den Kernfragen bestimmt. */
  deep: Question | null;
  index: number;
  answers: Record<string, CardAnswer>;
  /** Rohtext der optionalen Freitext-Frage; Moderation/Speicherung erst nach der Abgabe. */
  freeText: string | null;
}

export type CheckAction =
  | { type: 'ANSWER'; answer: CardAnswer }
  | { type: 'SKIP' }
  | { type: 'BACK' }
  | { type: 'RETRY' }
  | { type: 'FREETEXT'; freeText: string | null }
  | { type: 'RESULT'; result: 'ok' | 'queued' | 'already' | 'error' };

/** Vertiefung gibt es nur, wenn ein Thema mit Vertiefungsfrage schlecht bewertet wurde. */
const DEEP_MAX_VALUE = 3;

export function initialState(core: Question[], alreadySubmitted = false): CheckState {
  return {
    status: alreadySubmitted ? 'already' : 'asking',
    core,
    deep: null,
    index: 0,
    answers: {},
    freeText: null,
  };
}

/** Alle Karten in Anzeige-Reihenfolge. Spätere Kartentypen (Swipe, #31) hängen hier ein. */
export function cardsOf(state: Pick<CheckState, 'core' | 'deep'>): Question[] {
  return state.deep ? [...state.core, state.deep] : state.core;
}

/** Die Vertiefung zum am schlechtesten bewerteten Thema; bei Gleichstand das früher gefragte. */
export function pickDeepQuestion(core: Question[], answers: Record<string, CardAnswer>): Question | null {
  let best: { question: Question; value: number } | null = null;
  for (const q of core) {
    const value = answers[q.id];
    const deep = QUESTIONS_BY_ID[`${q.topicSlug}.deep`];
    if (typeof value !== 'number' || !deep || value > DEEP_MAX_VALUE) continue;
    if (!best || value < best.value) best = { question: deep, value };
  }
  return best?.question ?? null;
}

function advance(state: CheckState, answers: Record<string, CardAnswer>): CheckState {
  const cards = cardsOf(state);
  if (state.index < state.core.length - 1) return { ...state, answers, index: state.index + 1 };
  if (state.index === state.core.length - 1) {
    const deep = pickDeepQuestion(state.core, answers);
    if (deep) return { ...state, answers, deep, index: state.index + 1 };
  }
  return { ...state, answers, status: 'freetext', index: Math.min(state.index, cards.length - 1) };
}

export function checkReducer(state: CheckState, action: CheckAction): CheckState {
  switch (action.type) {
    case 'ANSWER': {
      if (state.status !== 'asking') return state;
      const card = cardsOf(state)[state.index];
      if (!card) return state;
      return advance(state, { ...state.answers, [card.id]: action.answer });
    }
    case 'SKIP': {
      if (state.status !== 'asking') return state;
      const card = cardsOf(state)[state.index];
      if (!card) return state;
      const rest = { ...state.answers };
      delete rest[card.id];
      return advance(state, rest);
    }
    case 'BACK':
      if (state.status !== 'asking' && state.status !== 'error' && state.status !== 'freetext') {
        return state;
      }
      return {
        ...state,
        status: 'asking',
        index:
          state.status === 'freetext'
            ? Math.max(0, cardsOf(state).length - 1)
            : Math.max(0, state.index - (state.status === 'error' ? 0 : 1)),
      };
    case 'FREETEXT':
      if (state.status !== 'freetext') return state;
      return { ...state, status: 'submitting', freeText: action.freeText };
    case 'RETRY':
      return state.status === 'error' ? { ...state, status: 'submitting' } : state;
    case 'RESULT':
      if (state.status !== 'submitting') return state;
      return { ...state, status: action.result === 'ok' ? 'done' : action.result };
  }
}

/** Nur beantwortete, tatsächlich gezeigte Karten; „Weiß nicht" fehlt bewusst. */
export function buildAnswers(state: CheckState): AnswerInput[] {
  return cardsOf(state).flatMap((q): AnswerInput[] => {
    const answer = state.answers[q.id];
    if (answer === undefined) return [];
    return typeof answer === 'number'
      ? [{ questionId: q.id, value: answer }]
      : [{ questionId: q.id, choice: answer }];
  });
}

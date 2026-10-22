import { QUESTIONS_BY_ID } from '@/data/topics';
import type { AnswerInput, Question } from '@/types';

/** Antwort auf eine Karte: Skalenwert (mood5/swipe) oder gewählte Optionen (choice). */
export type CardAnswer = number | string[];

/** `queued`: offline abgegeben, liegt im Puffer (#36) und wird später gesendet. */
export type CheckStatus =
  'asking' | 'freetext' | 'review' | 'submitting' | 'done' | 'queued' | 'already' | 'error';

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
  /** Übersprungene Karten („keine Angabe"), damit die Auswahl beim Zurückgehen sichtbar bleibt. */
  skipped: Record<string, true>;
  /** Aus der Übersicht heraus bearbeitet: nach der Antwort geht es direkt zurück zur Übersicht (#146). */
  returnToReview: boolean;
}

export type CheckAction =
  | { type: 'ANSWER'; answer: CardAnswer }
  | { type: 'SKIP' }
  | { type: 'BACK' }
  | { type: 'EDIT'; index: number }
  | { type: 'SUBMIT' }
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
    skipped: {},
    returnToReview: false,
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
    if (q.type === 'swipe' || typeof value !== 'number' || !deep || value > DEEP_MAX_VALUE) continue;
    if (!best || value < best.value) best = { question: deep, value };
  }
  return best?.question ?? null;
}

function advance(
  state: CheckState,
  answers: Record<string, CardAnswer>,
  skipped: Record<string, true>,
): CheckState {
  const next = { ...state, answers, skipped };
  if (state.returnToReview) {
    // Eine geänderte Antwort kann eine andere Vertiefung auslösen; die alte Antwort darauf entfällt.
    const deep = pickDeepQuestion(state.core, answers);
    if (state.deep && deep?.id !== state.deep.id) {
      delete answers[state.deep.id];
      delete skipped[state.deep.id];
    }
    return { ...next, deep, status: 'review', returnToReview: false };
  }
  const cards = cardsOf(state);
  if (state.index < state.core.length - 1) return { ...next, index: state.index + 1 };
  if (state.index === state.core.length - 1) {
    const deep = pickDeepQuestion(state.core, answers);
    if (deep) return { ...next, deep, index: state.index + 1 };
  }
  return { ...next, status: 'freetext', index: Math.min(state.index, cards.length - 1) };
}

export function checkReducer(state: CheckState, action: CheckAction): CheckState {
  switch (action.type) {
    case 'ANSWER': {
      if (state.status !== 'asking') return state;
      const card = cardsOf(state)[state.index];
      if (!card) return state;
      const skipped = { ...state.skipped };
      delete skipped[card.id];
      return advance(state, { ...state.answers, [card.id]: action.answer }, skipped);
    }
    case 'SKIP': {
      if (state.status !== 'asking') return state;
      const card = cardsOf(state)[state.index];
      if (!card) return state;
      const rest = { ...state.answers };
      delete rest[card.id];
      return advance(state, rest, { ...state.skipped, [card.id]: true });
    }
    case 'BACK':
      // Aus der Bearbeitung zurück zur Übersicht, von der Übersicht zurück zum Freitext (#146).
      if (state.status === 'asking' && state.returnToReview) {
        return { ...state, status: 'review', returnToReview: false };
      }
      if (state.status === 'review') return { ...state, status: 'freetext' };
      if (state.status === 'error') return { ...state, status: 'review' };
      if (state.status !== 'asking' && state.status !== 'freetext') return state;
      return {
        ...state,
        status: 'asking',
        index:
          state.status === 'freetext' ? Math.max(0, cardsOf(state).length - 1) : Math.max(0, state.index - 1),
      };
    case 'EDIT':
      if (state.status !== 'review' || !cardsOf(state)[action.index]) return state;
      return { ...state, status: 'asking', index: action.index, returnToReview: true };
    case 'SUBMIT':
      return state.status === 'review' ? { ...state, status: 'submitting' } : state;
    case 'FREETEXT':
      if (state.status !== 'freetext') return state;
      return { ...state, status: 'review', freeText: action.freeText };
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

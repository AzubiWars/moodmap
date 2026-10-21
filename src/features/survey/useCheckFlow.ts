import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useReducer, useRef } from 'react';
import { getDataSource } from '@/data';
import { getDeviceToken } from '@/lib/device';
import { saveFreeText, submitFreeText } from '@/lib/freeText';
import { enqueueResponse, isOffline } from '@/lib/outbox';
import type { GradeBand, Question, ResponseInput, Role } from '@/types';
import { buildAnswers, cardsOf, checkReducer, initialState, type CardAnswer } from './checkFlow';

const submittedKey = (waveId: string) => `moodmap:submitted:${waveId}`;

export function hasSubmitted(waveId: string): boolean {
  try {
    return localStorage.getItem(submittedKey(waveId)) === '1';
  } catch {
    return false;
  }
}

function markSubmitted(waveId: string) {
  try {
    localStorage.setItem(submittedKey(waveId), '1');
  } catch {
    /* Privatmodus: der Server verhindert die Doppelteilnahme trotzdem */
  }
}

/** Nach dem Zurückziehen der eigenen Antwort (#161): Mood-Check wieder freigeben. */
export function clearSubmitted(waveId: string) {
  try {
    localStorage.removeItem(submittedKey(waveId));
  } catch {
    /* Privatmodus: es gab keine Markierung */
  }
}

interface CheckFlowOptions {
  questions: Question[];
  waveId: string;
  schoolId: string;
  isTest?: boolean;
  role?: Role;
  gradeBand?: GradeBand;
  onDone: () => void;
}

export function useCheckFlow({
  questions,
  waveId,
  schoolId,
  isTest = false,
  role = 'student',
  gradeBand,
  onDone,
}: CheckFlowOptions) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(checkReducer, undefined, () =>
    // Pitch resets happen on the server, so a week-long local flag cannot decide test eligibility.
    initialState(questions, !isTest && hasSubmitted(waveId)),
  );
  // Jeder Sendeversuch läuft genau einmal (StrictMode ruft Effekte doppelt auf).
  const attempt = useRef(0);
  const sentAttempt = useRef(-1);
  const onDoneRef = useRef(onDone);
  const mounted = useRef(true);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (state.status !== 'submitting' || sentAttempt.current === attempt.current) return;
    sentAttempt.current = attempt.current;
    const input: ResponseInput = {
      schoolId,
      waveId,
      role,
      // Die Stufe gilt nur für Schüler:innen.
      gradeBand: role === 'student' ? gradeBand : undefined,
      deviceToken: getDeviceToken(),
      answers: buildAnswers(state),
    };
    // Offline (#36): Antwort puffern, die Outbox sendet beim Wiederverbinden. Freitext bleibt draußen.
    const queue = () => {
      enqueueResponse(input);
      if (!isTest) markSubmitted(waveId);
      if (mounted.current) dispatch({ type: 'RESULT', result: 'queued' });
    };
    if (isOffline()) return queue();
    getDataSource()
      .submitResponse(input)
      .then(async (result) => {
        if (!mounted.current) return;
        if (!isTest && (result.ok || result.reason === 'already_submitted')) markSubmitted(waveId);
        if (result.ok) {
          if (state.freeText) {
            const moderation = await submitFreeText({
              schoolId,
              waveId,
              deviceToken: getDeviceToken(),
              text: state.freeText,
            });
            saveFreeText(moderation);
          }
          if (!mounted.current) return;
          void queryClient.invalidateQueries();
        }
        dispatch({
          type: 'RESULT',
          result: result.ok ? 'ok' : result.reason === 'already_submitted' ? 'already' : 'error',
        });
        if (result.ok) onDoneRef.current();
      }, queue)
      .catch(() => mounted.current && dispatch({ type: 'RESULT', result: 'error' }));
  }, [state, schoolId, isTest, waveId, role, gradeBand, queryClient]);

  const cards = cardsOf(state);
  return {
    state,
    cards,
    card: cards[state.index],
    answer: (answer: CardAnswer) => dispatch({ type: 'ANSWER', answer }),
    skip: () => dispatch({ type: 'SKIP' }),
    back: () => dispatch({ type: 'BACK' }),
    retry: () => {
      attempt.current += 1;
      dispatch({ type: 'RETRY' });
    },
    finish: (freeText: string | null) => dispatch({ type: 'FREETEXT', freeText }),
  };
}

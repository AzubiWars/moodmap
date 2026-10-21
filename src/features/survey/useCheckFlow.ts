import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useReducer, useRef } from 'react';
import { getDataSource } from '@/data';
import { getDeviceToken } from '@/lib/device';
import { saveFreeText, submitFreeText } from '@/lib/freeText';
import type { GradeBand, Question } from '@/types';
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

interface CheckFlowOptions {
  questions: Question[];
  waveId: string;
  schoolId: string;
  gradeBand?: GradeBand;
  onDone: () => void;
}

export function useCheckFlow({ questions, waveId, schoolId, gradeBand, onDone }: CheckFlowOptions) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(checkReducer, undefined, () =>
    initialState(questions, hasSubmitted(waveId)),
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
    getDataSource()
      .submitResponse({
        schoolId,
        waveId,
        role: 'student',
        gradeBand,
        deviceToken: getDeviceToken(),
        answers: buildAnswers(state),
      })
      .then(async (result) => {
        if (!mounted.current) return;
        if (result.ok || result.reason === 'already_submitted') markSubmitted(waveId);
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
      })
      .catch(() => mounted.current && dispatch({ type: 'RESULT', result: 'error' }));
  }, [state, schoolId, waveId, gradeBand, queryClient]);

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

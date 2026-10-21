import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDataSource } from '@/data';
import { getDeviceToken } from '@/lib/device';
import { clearFreeText } from '@/lib/freeText';
import { useParticipantStore } from '@/store/participant';
import { clearSubmitted } from './useCheckFlow';

export interface WithdrawnState {
  /** `deleted`: die Antwort wurde entfernt · `nothing`: es war (nicht mehr) etwas gespeichert. */
  withdrawn: 'deleted' | 'nothing';
}

type Phase = 'idle' | 'confirm' | 'deleting' | 'error';

const secondary = 'min-h-11 rounded-2xl px-5 font-medium ring-1 ring-border';

/**
 * „Meine Antworten löschen" (#161): zieht die eigene Abgabe der aktuellen Welle zurück.
 * Nur dieses Gerät findet seine Antwort (anonymes Token); danach geht's zurück zum Mood-Check.
 * Nicht für den Pitch-Test-Standort (#171): dessen Teilnahmen setzt der PIN-Reset zurück (#178).
 */
export function WithdrawResponse({ waveId }: { waveId: string }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isTest = useParticipantStore((s) => s.isTest);

  const withdraw = async () => {
    setPhase('deleting');
    try {
      const result = await getDataSource().deleteOwnResponse({ waveId, deviceToken: getDeviceToken() });
      if (!result.ok && result.reason === 'error') {
        setPhase('error');
        return;
      }
      // Auch bei `not_found`: die lokale Markierung ist dann veraltet.
      clearSubmitted(waveId);
      clearFreeText();
      void queryClient.invalidateQueries();
      const state: WithdrawnState = { withdrawn: result.ok ? 'deleted' : 'nothing' };
      navigate('/check', { replace: true, state });
    } catch {
      setPhase('error');
    }
  };

  if (isTest) return null;

  if (phase === 'idle') {
    return (
      <button type="button" onClick={() => setPhase('confirm')} className={secondary}>
        Meine Antworten löschen
      </button>
    );
  }

  return (
    <div className="space-y-3 text-left" role="group" aria-labelledby="withdraw-title">
      <p id="withdraw-title" className="font-semibold">
        {phase === 'error' ? 'Das Löschen hat nicht geklappt.' : 'Deine Antworten dieser Woche löschen?'}
      </p>
      <p className="text-sm text-muted">
        {phase === 'error'
          ? 'Versuch es bitte noch einmal.'
          : 'Sie zählen dann nicht mehr auf der Karte. Danach kannst du den Mood-Check neu machen.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void withdraw()}
          disabled={phase === 'deleting'}
          className="min-h-11 rounded-2xl bg-primary px-5 font-semibold text-primary-fg disabled:opacity-60"
        >
          {phase === 'deleting' ? 'Wird gelöscht …' : phase === 'error' ? 'Nochmal versuchen' : 'Ja, löschen'}
        </button>
        <button
          type="button"
          onClick={() => setPhase('idle')}
          disabled={phase === 'deleting'}
          className={secondary}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

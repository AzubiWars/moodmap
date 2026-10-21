import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MoodScaleInput, type MoodValue } from '@/components/MoodScaleInput';
import { getDataSource } from '@/data';
import { getTopic } from '@/data/topics';
import { getDeviceToken } from '@/lib/device';
import { pendingCount, subscribeOutbox } from '@/lib/outbox';
import { cn } from '@/lib/utils';
import { useParticipantStore } from '@/store/participant';
import type { Question } from '@/types';
import { FreeTextCard } from './FreeTextCard';
import { selectQuestions } from './selectQuestions';
import { useCheckFlow } from './useCheckFlow';
import { WithdrawResponse, type WithdrawnState } from './WithdrawResponse';

const ADVANCE_DELAY_MS = 250;

const linkButton =
  'inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 font-semibold text-primary-fg';

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-md px-4 py-8">
      <div className="card space-y-4 p-6">
        <h1 className="text-xl font-bold">{title}</h1>
        {children}
      </div>
    </section>
  );
}

export function CheckPage() {
  const location = useLocation();
  const schoolId = useParticipantStore((s) => s.schoolId);
  const wave = useQuery({ queryKey: ['wave', 'current'], queryFn: () => getDataSource().getCurrentWave() });

  if (!schoolId) {
    return (
      <Message title="Zuerst deine Schule">
        <p className="text-muted">Scanne den QR-Code deiner Schule, dann geht's los.</p>
        <Link to="/s/DEMO42" className={linkButton}>
          Demo-Schule ausprobieren
        </Link>
      </Message>
    );
  }
  if (wave.isError) {
    return (
      <Message title="Das hat gerade nicht geklappt">
        <button type="button" onClick={() => void wave.refetch()} className={linkButton}>
          Nochmal versuchen
        </button>
      </Message>
    );
  }
  if (!wave.data) {
    return <div className="mx-auto h-64 max-w-md animate-pulse px-4 py-8" aria-busy="true" />;
  }
  // Neuer Schlüssel nach dem Zurückziehen (#161): der Flow startet frisch statt „schon mitgemacht“.
  const withdrawn = (location.state as WithdrawnState | null)?.withdrawn;
  return <CheckFlow key={location.key} schoolId={schoolId} waveId={wave.data.id} withdrawn={withdrawn} />;
}

function CheckFlow({
  schoolId,
  waveId,
  withdrawn,
}: {
  schoolId: string;
  waveId: string;
  withdrawn?: WithdrawnState['withdrawn'];
}) {
  const navigate = useNavigate();
  const gradeBand = useParticipantStore((s) => s.gradeBand);
  const isTest = useParticipantStore((s) => s.isTest);
  const questions = useMemo(() => selectQuestions(getDeviceToken(), waveId), [waveId]);
  const flow = useCheckFlow({
    questions,
    waveId,
    schoolId,
    isTest,
    gradeBand,
    onDone: () => navigate('/check/done'),
  });
  const { state } = flow;

  if (state.status === 'already') {
    return (
      <Message title="Danke! 🌤️">
        <p className="text-muted">Du hast in dieser Woche schon mitgemacht. Nächster Mood-Check ab Montag.</p>
        <Link to="/map" className={linkButton}>
          Karte ansehen
        </Link>
        <WithdrawResponse waveId={waveId} />
      </Message>
    );
  }
  if (state.status === 'error') {
    return (
      <Message title="Das hat gerade nicht geklappt">
        <p className="text-muted">Deine Antworten sind noch da. Versuch es bitte noch einmal.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={flow.retry} className={linkButton}>
            Nochmal versuchen
          </button>
          <button
            type="button"
            onClick={flow.back}
            className="min-h-11 rounded-2xl px-5 font-medium ring-1 ring-border"
          >
            Zurück
          </button>
        </div>
      </Message>
    );
  }
  if (state.status === 'queued') {
    return <QueuedMessage droppedFreeText={!!state.freeText} />;
  }
  if (state.status === 'freetext') {
    return <FreeTextCard onDone={flow.finish} />;
  }
  if (state.status === 'submitting' || state.status === 'done') {
    return (
      <Message title="Wird gesendet …">
        <p className="text-muted" aria-live="polite">
          Einen Moment, deine Stimme wird gezählt.
        </p>
      </Message>
    );
  }

  const card = flow.card;
  if (!card) return null;

  const question = (
    <QuestionCard
      key={card.id}
      question={card}
      position={state.index}
      total={state.core.length}
      isDeep={state.index >= state.core.length}
      initial={state.answers[card.id]}
      onAnswer={flow.answer}
      onSkip={flow.skip}
      onBack={state.index > 0 ? flow.back : undefined}
    />
  );
  if (!withdrawn || state.index > 0) return question;
  return (
    <>
      <p role="status" className="mx-auto max-w-md px-4 pt-6 text-center text-sm text-muted">
        {withdrawn === 'deleted'
          ? 'Deine Antworten wurden gelöscht. Du kannst jetzt neu mitmachen.'
          : 'Es waren keine Antworten mehr gespeichert. Du kannst neu mitmachen.'}
      </p>
      {question}
    </>
  );
}

/** Offline abgegeben (#36): Hinweis, bis die Outbox leer ist. */
function QueuedMessage({ droppedFreeText }: { droppedFreeText: boolean }) {
  const pending = useSyncExternalStore(subscribeOutbox, pendingCount);
  const sent = pending === 0;
  return (
    <Message title={sent ? 'Angekommen! 🌤️' : 'Gespeichert ✓'}>
      <p className="text-muted" role="status">
        {sent
          ? 'Du bist wieder online – deine Stimme ist jetzt gezählt.'
          : 'Du bist gerade offline. Deine Antworten werden gesendet, sobald du wieder online bist.'}
      </p>
      {droppedFreeText && (
        <p className="text-sm text-muted">
          Deinen Freitext haben wir offline nicht gespeichert – zu deinem Schutz.
        </p>
      )}
      <Link to="/map" className={linkButton}>
        Karte ansehen
      </Link>
    </Message>
  );
}

interface QuestionCardProps {
  question: Question;
  position: number;
  total: number;
  isDeep: boolean;
  initial?: number | string[];
  onAnswer: (answer: number | string[]) => void;
  onSkip: () => void;
  onBack?: () => void;
}

function QuestionCard({
  question,
  position,
  total,
  isDeep,
  initial,
  onAnswer,
  onSkip,
  onBack,
}: QuestionCardProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const topic = getTopic(question.topicSlug);
  const [scale, setScale] = useState<MoodValue | undefined>(
    typeof initial === 'number' ? (initial as MoodValue) : undefined,
  );
  const [picked, setPicked] = useState<string[]>(Array.isArray(initial) ? initial : []);
  const [help, setHelp] = useState<number | null>(null);

  useEffect(() => {
    heading.current?.focus();
    return () => clearTimeout(timer.current);
  }, []);

  const onScale = (value: MoodValue) => {
    setScale(value);
    if (value === null) return onSkip();
    // Sensibles Thema: erst ein sanfter Hinweis, dann erst weiter.
    if (question.id === 'wellbeing.core' && value <= 2) return setHelp(value);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onAnswer(value), reduced ? 0 : ADVANCE_DELAY_MS);
  };

  const toggle = (value: string) =>
    setPicked((prev) =>
      question.multiple
        ? prev.includes(value)
          ? prev.filter((v) => v !== value)
          : [...prev, value]
        : [value],
    );

  const shown = Math.min(position + 1, total);
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-8.5rem)] max-w-md flex-col gap-4 px-4 py-4">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Zurück zur vorigen Frage"
            className="flex size-11 shrink-0 items-center justify-center rounded-full ring-1 ring-border"
          >
            <span aria-hidden>←</span>
          </button>
        ) : (
          <span className="size-11 shrink-0" />
        )}
        <div className="flex-1">
          <div
            role="progressbar"
            aria-label="Fortschritt"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={shown}
            aria-valuetext={isDeep ? 'Noch eine kurze Frage' : `${shown} von ${total}`}
            className="h-2 overflow-hidden rounded-full bg-border"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
              style={{ width: `${(shown / total) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            {isDeep ? 'Noch eine kurze Frage' : `${shown} von ${total}`}
          </p>
        </div>
      </div>

      <div className="card p-6 text-center">
        <p className="text-5xl" aria-hidden>
          {topic?.icon}
        </p>
        <p className="mt-2 text-sm font-medium text-muted">{topic?.title}</p>
        <h1 ref={heading} tabIndex={-1} className="mt-3 text-xl font-bold outline-none">
          {question.text}
        </h1>
      </div>

      <div className="mt-auto pb-2">
        {help !== null ? (
          <div className="card space-y-3 p-5" role="note">
            <p className="font-semibold">Danke, dass du das teilst. 💚</p>
            <p className="text-sm text-muted">
              Wenn es dir nicht gut geht, du musst da nicht allein durch: Die „Nummer gegen Kummer" ist
              kostenlos und anonym unter{' '}
              <a className="font-semibold underline" href="tel:116111">
                116 111
              </a>
              . Auch eine Vertrauenslehrkraft an deiner Schule hört dir zu.
            </p>
            <button
              type="button"
              onClick={() => onAnswer(help)}
              className="min-h-12 w-full rounded-2xl bg-primary font-semibold text-primary-fg"
            >
              Weiter
            </button>
          </div>
        ) : question.type === 'choice' ? (
          <div className="space-y-2">
            <div role="group" aria-label={question.text} className="flex flex-col gap-2">
              {question.options?.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={picked.includes(o.value)}
                  onClick={() => toggle(o.value)}
                  className={cn(
                    'min-h-12 rounded-2xl px-4 text-left font-medium ring-1 transition-colors',
                    picked.includes(o.value)
                      ? 'bg-primary text-primary-fg ring-primary'
                      : 'bg-card text-fg ring-border hover:bg-subtle',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {question.multiple && <p className="text-xs text-muted">Mehrfachauswahl möglich</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onSkip}
                className="min-h-12 flex-1 rounded-2xl font-medium ring-1 ring-border"
              >
                Überspringen
              </button>
              <button
                type="button"
                disabled={picked.length === 0}
                onClick={() => onAnswer(picked)}
                className="min-h-12 flex-1 rounded-2xl bg-primary font-semibold text-primary-fg disabled:opacity-40"
              >
                Weiter
              </button>
            </div>
          </div>
        ) : (
          <MoodScaleInput value={scale} onChange={onScale} label={question.text} />
        )}
      </div>
    </section>
  );
}

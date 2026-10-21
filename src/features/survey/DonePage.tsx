import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLastAnswersStore } from '@/store/lastAnswers';
import { pickComparisonTopics } from './pickTopics';
import { SchoolVsNrw } from './SchoolVsNrw';
import { ShareButton } from './ShareButton';
import { getDataSource } from '@/data';
import { loadFreeText } from '@/lib/freeText';
import { useParticipantStore } from '@/store/participant';
import { WithdrawResponse } from './WithdrawResponse';

/** Danke-Screen: Feier, „Deine Schule vs. NRW" (ab K_MIN) und Teilen. */
export function DonePage() {
  const isTeacher = useParticipantStore((s) => s.role) === 'teacher';
  const schoolId = useParticipantStore((s) => s.schoolId);
  const schoolCode = useParticipantStore((s) => s.schoolCode);
  const answers = useLastAnswersStore((s) => s.answers);
  const topics = useMemo(() => pickComparisonTopics(answers), [answers]);
  const freeText = loadFreeText();
  const isTest = useParticipantStore((s) => s.isTest);
  const wave = useQuery({ queryKey: ['wave', 'current'], queryFn: () => getDataSource().getCurrentWave() });

  return (
    <section className="mx-auto max-w-md space-y-4 px-4 py-8">
      <div className="card space-y-4 p-6 text-center">
        <p className="text-5xl motion-safe:animate-bounce" aria-hidden>
          ☀️
        </p>
        <h1 className="text-2xl font-bold">
          {isTeacher ? 'Danke! Ihre Stimme zählt.' : 'Danke! Deine Stimme zählt.'}
        </h1>
        <p className="font-semibold">Deine Stimme ist auf der Karte 🗺️</p>
        <p className="text-muted">
          {isTeacher ? 'Ihre Antworten sind anonym angekommen.' : 'Deine Antworten sind anonym angekommen.'}
        </p>
        <Link
          to="/map"
          className="inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 font-semibold text-primary-fg"
        >
          Zur Karte
        </Link>
      </div>

      {schoolId && schoolCode && !isTest && (
        <SchoolVsNrw schoolId={schoolId} schoolCode={schoolCode} topics={topics} />
      )}

      {/* Slot für „Die Politik antwortet dir" (#43) */}
      <div id="policy-answers-slot" />

      {schoolCode && !isTest && (
        <ShareButton
          schoolCode={schoolCode}
          text="Wie geht's unserer Schule? Mach beim anonymen Mood-Check mit!"
        />
      )}

      {/* Pitch-Teilnahmen setzt der PIN-Reset zurück, nicht der Einzelnutzer (#171, #178). */}
      {wave.data && !isTest && (
        <div className="card p-5">
          <WithdrawResponse waveId={wave.data.id} />
        </div>
      )}

      {freeText &&
        (freeText.allowed ? (
          <div className="card space-y-2 p-5">
            <h2 className="font-semibold">
              {freeText.cluster
                ? `Danke, dein Hinweis wurde dem Thema „${freeText.cluster}“ zugeordnet.`
                : 'Danke, dein Hinweis wurde anonym gespeichert.'}
            </h2>
            {freeText.cleaned ? (
              <p className="text-sm text-muted">{freeText.cleaned}</p>
            ) : (
              <p className="text-sm text-muted">Der Text wurde geprüft und anonym gespeichert.</p>
            )}
            <p className="text-xs text-muted">Geprüft und bereinigt – ohne Namen und Beleidigungen.</p>
          </div>
        ) : (
          <div className="card space-y-2 p-5">
            <h2 className="font-semibold">Dein Freitext konnte nicht übernommen werden.</h2>
            <p className="text-sm text-muted">{freeText.reason || 'Bitte formuliere den Text sachlich.'}</p>
            <p className="text-xs text-muted">Deine Umfrage-Antworten sind trotzdem anonym gespeichert.</p>
          </div>
        ))}

      {freeText?.concern && (
        <div className="card space-y-2 p-5" role="note">
          <p className="font-semibold">Wenn es dir nicht gut geht 💚</p>
          <p className="text-sm text-muted">
            Die „Nummer gegen Kummer“ ist kostenlos und anonym unter{' '}
            <a className="font-semibold underline" href="tel:116111">
              116 111
            </a>
            . Du kannst auch bei{' '}
            <a
              className="font-semibold underline"
              href="https://krisenchat.de"
              target="_blank"
              rel="noreferrer"
            >
              krisenchat.de
            </a>{' '}
            schreiben oder dich an die Schulpsychologie/Schulsozialarbeit wenden.
          </p>
        </div>
      )}
    </section>
  );
}

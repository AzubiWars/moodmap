import { QRCodeSVG } from 'qrcode.react';
import { MoodBadge } from '@/components/MoodBadge';
import { TOPICS } from '@/data/topics';
import { K_MIN } from '@/lib/env';
import type { FreetextCluster, PitchAggregate } from '@/types';
import { PitchLocationMap } from './PitchLocationMap';

interface Props {
  aggregate: PitchAggregate;
  clusters: FreetextCluster[];
  joinUrl: string | null;
  local: boolean;
}
const minimum = Number.isInteger(K_MIN) ? Math.max(10, K_MIN) : 10;

export function PitchBoard({ aggregate, clusters, joinUrl, local }: Props) {
  const ready = aggregate.scoredN >= minimum;
  const topics = TOPICS.flatMap((topic) => {
    const score = aggregate.topicScores[topic.slug];
    return ready && typeof score === 'number' && Number.isFinite(score) ? [{ ...topic, score }] : [];
  })
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  const visibleClusters = clusters.filter((cluster) => cluster.count >= minimum).sort((a, b) => b.count - a.count).slice(0, 3);
  const score = ready && aggregate.score !== null && Number.isFinite(aggregate.score) ? aggregate.score : null;

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:gap-5">
            <section className="card min-w-0 px-4 py-5 lg:px-7" aria-label="Teilnahmen">
              <h2 className="text-sm font-medium text-muted lg:text-xl">Schon dabei</h2>
              <p
                aria-live="polite"
                aria-atomic="true"
                className="text-6xl font-bold tracking-tight tabular-nums lg:text-8xl 2xl:text-9xl"
              >
                {aggregate.n.toLocaleString('de-DE')}
                <span className="sr-only"> Teilnahmen</span>
              </p>
              <p className="mt-1 text-sm text-muted lg:text-lg">
                {aggregate.n === 1 ? 'Stimme' : 'Stimmen'} in dieser Runde
              </p>
            </section>
            <section className="card min-w-0 px-4 py-5 lg:px-7" aria-label="Gesamtstimmung">
              <h2 className="mb-4 text-sm font-medium text-muted lg:text-xl">So geht es uns</h2>
              {score === null ? (
                <p className="text-sm font-medium lg:text-2xl">
                  {ready ? 'Für die Stimmung fehlen noch genügend vergleichbare Antworten.' : <>Noch {minimum - aggregate.scoredN} {minimum - aggregate.scoredN === 1 ? 'Stimme' : 'Stimmen'} bis zur ersten Auswertung</>}
                </p>
              ) : (
                <MoodBadge score={score} size="lg" className="text-sm lg:px-5 lg:py-3 lg:text-3xl" />
              )}
              <p className="mt-3 text-xs text-muted lg:text-base">
                {ready
                  ? 'Stimmungswert von 0 bis 100'
                  : `Mindestens ${minimum} gewertete Stimmen schützen deine Anonymität.`}
              </p>
              {aggregate.n !== aggregate.scoredN && (
                <p className="mt-1 text-xs text-muted lg:text-base">{aggregate.scoredN} davon auswertbar</p>
              )}
            </section>
          </div>
          <PitchLocationMap location={aggregate.school} score={score} />
        </div>
        <section
          className="card flex min-w-0 flex-col items-center justify-center gap-4 p-5 text-center lg:gap-5 lg:p-7"
          aria-label="Mitmachen per QR-Code"
        >
          <div>
            <h2 className="text-2xl font-bold lg:text-3xl">Jetzt bist du dran.</h2>
            <p className="mt-2 text-base text-muted lg:text-xl">
              Scannen. Mood-Check machen.
              <br />
              Gemeinsam sichtbar werden.
            </p>
          </div>
          {joinUrl ? (
            <>
              <div className="w-full max-w-80 rounded-2xl bg-white p-4">
                <QRCodeSVG
                  value={joinUrl}
                  size={320}
                  level="M"
                  title="QR-Code zum Pitch-Mood-Check"
                  className="h-auto w-full"
                />
              </div>
              <a
                href={joinUrl}
                className="max-w-full break-all text-base font-medium text-accent underline underline-offset-4 lg:text-lg"
              >
                {joinUrl.replace(/^https?:\/\//, '')}
              </a>
            </>
          ) : (
            <p role="status" className="py-10 text-muted">
              Teilnahme-Link wird geprüft …
            </p>
          )}
          <p className="text-sm text-muted lg:text-lg">Anonym · etwa 60 Sekunden</p>
          {local && (
            <p className="rounded-xl bg-subtle p-3 text-sm text-muted">
              Lokale Demo: Nur Tabs desselben Browsers teilen diese Runde. Für verschiedene Handys wird der
              Live-Modus benötigt.
            </p>
          )}
        </section>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5 lg:px-7" aria-label="Themenübersicht">
          <h2 className="text-xl font-bold lg:text-2xl">Wo wir genauer hinhören</h2>
          <p className="mt-1 text-sm text-muted lg:text-base">
            Die drei niedrigsten Themenwerte · niedriger heißt mehr Handlungsbedarf
          </p>
          {topics.length ? (
            <ol className="mt-3 space-y-2">
              {topics.map((topic) => (
                <li key={topic.slug} className="flex items-center justify-between gap-3 text-base lg:text-xl">
                  <span>
                    <span aria-hidden>{topic.icon} </span>
                    {topic.title}
                  </span>
                  <MoodBadge
                    score={topic.score}
                    size="sm"
                    showLabel={false}
                    className="text-base lg:text-lg"
                  />
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-5 text-muted lg:text-xl">
              Die Themen werden sichtbar, sobald genügend Stimmen vorliegen.
            </p>
          )}
        </section>
        <section className="card p-5 lg:px-7" aria-label="Freitext-Cluster">
          <h2 className="text-xl font-bold lg:text-2xl">Was sich ändern soll</h2>
          {visibleClusters.length ? (
            <ul className="mt-3 space-y-3">
              {visibleClusters.map((cluster) => (
                <li key={cluster.cluster}>
                  <p className="flex justify-between gap-3 text-base font-semibold lg:text-xl">
                    <span>{cluster.cluster}</span>
                    <span className="shrink-0 tabular-nums">{cluster.count} Nennungen</span>
                  </p>
                  {cluster.examples.slice(0, 2).map((example, index) => <p key={index} className="mt-1 line-clamp-1 text-sm text-muted lg:text-base">„{example}“</p>)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-muted lg:text-xl">
              {local
                ? 'Freitext-Cluster sind in der lokalen Demo nicht verfügbar.'
                : `Gemeinsame Anliegen erscheinen ab ${minimum} moderierten Nennungen je Cluster.`}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

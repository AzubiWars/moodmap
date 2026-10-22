import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MoodBadge } from '@/components/MoodBadge';
import { ScoreBar } from '@/components/ScoreBar';
import { getDataSource } from '@/data';
import { scoreToColor } from '@/lib/colors';
import { K_MIN } from '@/lib/env';
import { SCHOOL_FORM_LABELS } from './lagebild';
import { SchoolAccess } from './SchoolAccess';
import {
  loadSchoolDashboard,
  sortByGap,
  type SchoolDashboardData,
  type SchoolTrendPoint,
} from './schoolDashboard';
import { Trend } from './LagebildSections';

const kw = (waveId: string) => waveId.replace(/^\d{4}-W/, 'KW ');

/** Punkte-Differenz als Text mit Pfeil, nie nur Farbe. */
function Gap({ diff, formLabel }: { diff: number | null; formLabel: string }) {
  if (diff == null) return <span className="text-sm text-muted">kein Vergleich</span>;
  const abs = Math.abs(diff).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  if (Math.abs(diff) < 0.5)
    return <span className="text-sm font-semibold">▬ im Schnitt der {formLabel}</span>;
  return (
    <span className="text-sm font-semibold tabular-nums">
      {diff > 0 ? '▲' : '▼'} {abs} Punkte {diff > 0 ? 'über' : 'unter'} dem Ø
    </span>
  );
}

/** Verlauf der letzten Wochen; Wochen unter K_MIN bleiben als Lücke leer. */
function Sparkline({ points }: { points: SchoolTrendPoint[] }) {
  const known = points.filter((p) => p.score != null);
  if (known.length < 2) {
    return <p className="text-sm text-muted">Für einen Verlauf gibt es noch zu wenige Wochen mit Daten.</p>;
  }
  const width = 280;
  const height = 80;
  const x = (i: number) => (points.length === 1 ? width / 2 : (i / (points.length - 1)) * width);
  const y = (score: number) => height - (Math.min(100, Math.max(0, score)) / 100) * height;
  // Eine Linie je zusammenhängendem Abschnitt, damit Lücken nicht überbrückt werden.
  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((p, i) => {
    if (p.score == null) {
      if (current.length) segments.push(current.join(' '));
      current = [];
    } else current.push(`${x(i).toFixed(1)},${y(p.score).toFixed(1)}`);
  });
  if (current.length) segments.push(current.join(' '));
  const summary = points.map(
    (p) => `${kw(p.waveId)}: ${p.score == null ? 'zu wenige Daten' : Math.round(p.score)}`,
  );

  return (
    <div>
      <svg
        viewBox={`-8 -8 ${width + 16} ${height + 16}`}
        className="h-24 w-full"
        role="img"
        aria-label={`Gesamt-Mood der letzten Wochen. ${summary.join('; ')}`}
      >
        <line x1="0" x2={width} y1={y(50)} y2={y(50)} className="stroke-border" strokeDasharray="4 4" />
        {segments.map((points) => (
          <polyline
            key={points}
            points={points}
            fill="none"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="stroke-fg"
          />
        ))}
        {points.map((p, i) =>
          p.score == null ? null : (
            <circle
              key={p.waveId}
              cx={x(i)}
              cy={y(p.score)}
              r="4.5"
              fill={scoreToColor(p.score)}
              className="stroke-fg"
            />
          ),
        )}
      </svg>
      <div className="flex justify-between text-xs text-muted" aria-hidden>
        <span>{kw(points[0]!.waveId)}</span>
        <span>{kw(points[points.length - 1]!.waveId)}</span>
      </div>
    </div>
  );
}

function Content({ data }: { data: SchoolDashboardData }) {
  const formLabel = SCHOOL_FORM_LABELS[data.school.schoolForm];
  const diff =
    data.score != null && data.form.score != null
      ? Math.round((data.score - data.form.score) * 10) / 10
      : null;
  const topics = sortByGap(data.topics);
  const enough = data.score != null;

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card flex min-h-24 flex-col justify-between gap-2 p-4">
          <dt className="text-sm text-muted">Gesamt-Mood Ihrer Schule</dt>
          <dd>
            <MoodBadge score={data.score} />
            {!enough && <span className="mt-1 block text-xs text-muted">Werte erst ab {K_MIN} Stimmen</span>}
          </dd>
        </div>
        <div className="card flex min-h-24 flex-col justify-between gap-2 p-4">
          <dt className="text-sm text-muted">Ø Schulform {formLabel}</dt>
          <dd>
            <MoodBadge score={data.form.score} />
          </dd>
        </div>
        <div className="card flex min-h-24 flex-col justify-between gap-2 p-4">
          <dt className="text-sm text-muted">Unterschied zum Ø</dt>
          <dd>
            <Gap diff={diff} formLabel={formLabel} />
          </dd>
        </div>
        <div className="card flex min-h-24 flex-col justify-between gap-2 p-4">
          <dt className="text-sm text-muted">Teilnahmen diese Woche</dt>
          <dd className="text-2xl font-bold tabular-nums">
            {enough ? (
              data.n.toLocaleString('de-DE')
            ) : (
              <span className="text-base font-semibold">zu wenige Daten</span>
            )}
            <span className="mt-1 block text-xs font-normal text-muted">
              Δ zur Vorwoche: {data.delta == null ? 'zu wenige Daten' : <Trend delta={data.delta} />}
            </span>
          </dd>
        </div>
      </dl>

      <section aria-labelledby="school-trend" className="card p-4 sm:p-5">
        <h2 id="school-trend" className="text-lg font-bold">
          Verlauf
        </h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          Gesamt-Mood Ihrer Schule in den letzten Wochen (0–100).
        </p>
        <Sparkline points={data.trend} />
      </section>

      <section aria-labelledby="school-topics" className="card p-4 sm:p-5">
        <h2 id="school-topics" className="text-lg font-bold">
          Themen im Vergleich
        </h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          Der Strich im Balken ist der Ø der Schulform {formLabel}. Größte Abweichung nach unten zuerst.
        </p>
        <ul className="divide-y divide-border">
          {topics.map((topic) => (
            <li
              key={topic.slug}
              className="grid gap-2 py-3 sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:items-center sm:gap-4"
            >
              <p className="font-medium">{topic.title}</p>
              <div className="space-y-1">
                <ScoreBar score={topic.score} compare={topic.formScore} compareLabel={`Ø ${formLabel}`} />
                <p className="text-xs text-muted">
                  {topic.score == null ? 'zu wenige Daten' : `Ihre Schule: ${Math.round(topic.score)}`}
                  {topic.formScore != null && ` · Ø ${formLabel}: ${Math.round(topic.formScore)}`}
                </p>
              </div>
              <Gap diff={topic.diff} formLabel={formLabel} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** Schul-Dashboard (#38): eigene Schule vs. Ø der Schulform. Sie-Form, Werte erst ab K_MIN. */
export function SchoolDashboardPage() {
  return <SchoolAccess>{(school) => <SchoolDashboard school={school} />}</SchoolAccess>;
}

function SchoolDashboard({ school }: { school: SchoolDashboardData['school'] }) {
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const code = params.get('code');
  const query = useQuery({
    queryKey: ['aggregates', 'school-dashboard', school.id],
    queryFn: () => loadSchoolDashboard(getDataSource(), school, K_MIN),
  });

  useEffect(
    () =>
      getDataSource().subscribeToNewResponses(() => {
        void queryClient.invalidateQueries({ queryKey: ['aggregates', 'school-dashboard'] });
      }),
    [queryClient],
  );

  const posterTo = `/dashboard/school/poster${code ? `?code=${encodeURIComponent(code)}` : ''}`;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{school.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {school.city} · {SCHOOL_FORM_LABELS[school.schoolForm]}
            {query.data ? ` · ${kw(query.data.wave.id)}` : ''} · Werte erst ab {K_MIN} Stimmen, darunter „zu
            wenige Daten“.
          </p>
        </div>
        <Link
          to={posterTo}
          className="inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 font-semibold text-primary-fg"
        >
          QR-Plakat drucken
        </Link>
      </header>

      {query.isError ? (
        <div className="card p-6 text-center">
          <p className="font-semibold">Das Schul-Dashboard konnte nicht geladen werden.</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 font-semibold text-primary-fg"
          >
            Erneut versuchen
          </button>
        </div>
      ) : !query.data ? (
        <div className="space-y-4" aria-busy="true" aria-label="Schul-Dashboard lädt">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-subtle motion-reduce:animate-none" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-subtle motion-reduce:animate-none" />
        </div>
      ) : (
        <Content data={query.data} />
      )}
    </div>
  );
}

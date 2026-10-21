import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MoodBadge } from '@/components/MoodBadge';
import { MOOD_LEVELS } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { DivergingBar, MoodLegend } from './DivergingBar';
import {
  divergingDomain,
  formatTrend,
  hotspotTopics,
  rankTopics,
  sortTopics,
  type Combined,
  type TopicSort,
  type TopicStat,
} from './lagebild';

const number = (value: number) => value.toLocaleString('de-DE');

export function Trend({ delta, className }: { delta: number | null; className?: string }) {
  const trend = formatTrend(delta);
  if (!trend)
    return (
      <span className={cn('text-xs text-muted', className)} title="kein Vergleich zur Vorwoche">
        –
      </span>
    );
  return (
    <span
      className={cn('text-xs font-semibold whitespace-nowrap tabular-nums', className)}
      title={trend.label}
    >
      <span aria-hidden>
        {trend.symbol} {trend.text}
      </span>
      <span className="sr-only">{trend.label}</span>
    </span>
  );
}

function Kpi({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="card flex min-h-24 flex-col justify-between gap-2 p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">
        {children}
        {hint && <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>}
      </dd>
    </div>
  );
}

export function KpiRow({ overall, schools }: { overall: Combined; schools: number }) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Gesamt-Mood NRW">
        <MoodBadge score={overall.score} size="md" />
      </Kpi>
      <Kpi label="Teilnahmen">{number(overall.n)}</Kpi>
      <Kpi label="Teilnehmende Schulen">{number(schools)}</Kpi>
      <Kpi label="Δ zur Vorwoche" hint="Gesamt-Mood, Punkte (0–100)">
        {overall.delta == null ? (
          <span className="text-base text-muted">zu wenige Daten</span>
        ) : (
          <Trend delta={overall.delta} className="text-2xl" />
        )}
      </Kpi>
    </dl>
  );
}

export function Hotspots({ topics }: { topics: TopicStat[] }) {
  const hot = hotspotTopics(topics, 5);
  return (
    <section aria-labelledby="hotspots" className="card p-4 sm:p-5">
      <h2 id="hotspots" className="text-lg font-bold">
        <span aria-hidden>🔥</span> Brennpunkt-Themen NRW
      </h2>
      <p className="mt-1 text-sm text-muted">
        Die meisten unzufriedenen Stimmen (😫 + 😕). Tippen Sie auf ein Thema, um zu sehen, wo es brennt.
      </p>
      {hot.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Noch zu wenige Daten.</p>
      ) : (
        <ol className="mt-3 divide-y divide-border">
          {hot.map((topic, i) => (
            <li key={topic.slug}>
              <Link
                to={`/map?topic=${topic.slug}`}
                className="flex min-h-14 items-center gap-3 rounded-xl px-1 py-2 hover:bg-subtle"
              >
                <span className="w-5 text-sm font-bold text-muted tabular-nums">{i + 1}.</span>
                <span className="text-2xl" aria-hidden>
                  {topic.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug font-semibold">{topic.title}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-semibold tabular-nums">
                      {topic.sentiment!.negative} % unzufrieden
                    </span>
                    <span className="text-muted tabular-nums">
                      · {number(topic.sentiment!.votes)} Stimmen
                    </span>
                  </span>
                  <span className="mt-1 block h-1.5 w-full rounded-full bg-border" aria-hidden>
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${topic.sentiment!.negative}%`,
                        backgroundColor: MOOD_LEVELS[0]!.color,
                      }}
                    />
                  </span>
                </span>
                <Trend delta={topic.delta} />
                <span className="text-muted" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const SORTS: { id: TopicSort; label: string }[] = [
  { id: 'negative', label: '% unzufrieden' },
  { id: 'score', label: 'Score' },
];

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-2xl bg-subtle p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            'min-h-11 rounded-xl px-3 text-sm font-semibold',
            value === option.id ? 'bg-primary text-primary-fg' : 'text-muted hover:text-fg',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function TopicPercentList({ topics }: { topics: TopicStat[] }) {
  const [sort, setSort] = useState<TopicSort>('negative');
  const sorted = useMemo(() => sortTopics(topics, sort), [topics, sort]);
  const domain = divergingDomain(topics.map((t) => t.sentiment));
  return (
    <section aria-labelledby="topics-percent" className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="topics-percent" className="text-lg font-bold">
          Themen in Prozent
        </h2>
        <SegmentedControl label="Sortieren nach" options={SORTS} value={sort} onChange={setSort} />
      </div>
      <p className="mt-1 text-sm text-muted">
        Anteil der Antworten je Stufe. „Weiß nicht“ wird nicht gezählt. Strich = Mitte der Skala.
      </p>
      <div className="mt-2">
        <MoodLegend />
      </div>
      <ul className="mt-4 space-y-4">
        {sorted.map((topic) => (
          <li key={topic.slug}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-semibold">
                <span aria-hidden>{topic.icon}</span> {topic.title}
              </span>
              <span className="text-sm tabular-nums">
                {topic.sentiment ? (
                  <>
                    <strong>{topic.sentiment.negative} % unzufrieden</strong>
                    <span className="text-muted"> · {topic.sentiment.positive} % zufrieden</span>
                  </>
                ) : (
                  <span className="text-muted">zu wenige Daten</span>
                )}
              </span>
            </div>
            <DivergingBar sentiment={topic.sentiment} domain={domain} className="mt-1.5" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TopicRanking({ topics }: { topics: TopicStat[] }) {
  const ranked = rankTopics(topics);
  return (
    <section aria-labelledby="ranking" className="card p-4 sm:p-5">
      <h2 id="ranking" className="text-lg font-bold">
        Themen-Ranking
      </h2>
      <p className="mt-1 text-sm text-muted">
        Score 0–100, Platz 1 = beste Stimmung. Pfeil = Veränderung zur Vorwoche.
      </p>
      <ol className="mt-3 divide-y divide-border">
        {ranked.map((topic, i) => (
          <li key={topic.slug} className="flex min-h-12 items-center gap-3 py-1.5">
            <span className="w-6 text-sm font-bold text-muted tabular-nums">
              {topic.score == null ? '–' : `${i + 1}.`}
            </span>
            <span className="min-w-0 flex-1 truncate">
              <span aria-hidden>{topic.icon}</span> {topic.title}
            </span>
            <Trend delta={topic.delta} />
            <MoodBadge score={topic.score} size="sm" showLabel={topic.score == null} />
          </li>
        ))}
      </ol>
    </section>
  );
}

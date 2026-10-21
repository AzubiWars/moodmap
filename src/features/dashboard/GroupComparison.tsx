import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { MoodBadge } from '@/components/MoodBadge';
import { getDataSource } from '@/data';
import { K_MIN } from '@/lib/env';
import type { TopicSlug } from '@/types';
import { DivergingBar } from './DivergingBar';
import { SegmentedControl } from './LagebildSections';
import { divergingDomain, type TopicStat } from './lagebild';
import { loadComparison } from './loadLagebild';

type Dimension = 'schoolForms' | 'regbez';

const DIMENSIONS: { id: Dimension; label: string }[] = [
  { id: 'schoolForms', label: 'Schulformen' },
  { id: 'regbez', label: 'Regierungsbezirke' },
];

/** Story-Thema der Demo: Stress an Gymnasien. */
const DEFAULT_TOPIC: TopicSlug = 'stress';

export function GroupComparison({ topics }: { topics: TopicStat[] }) {
  const selectable = topics.filter((t) => t.sentiment && t.slug !== 'overall');
  const [topic, setTopic] = useState<TopicSlug>(
    selectable.some((t) => t.slug === DEFAULT_TOPIC) ? DEFAULT_TOPIC : (selectable[0]?.slug ?? DEFAULT_TOPIC),
  );
  const [dimension, setDimension] = useState<Dimension>('schoolForms');
  const selectId = useId();
  const query = useQuery({
    queryKey: ['aggregates', 'lagebild', 'comparison', topic],
    queryFn: () => loadComparison(getDataSource(), topic, K_MIN),
    placeholderData: keepPreviousData,
  });
  const groups = query.data?.[dimension] ?? [];
  const domain = divergingDomain(groups.map((g) => g.sentiment));

  return (
    <section aria-labelledby="comparison" className="card p-4 sm:p-5">
      <h2 id="comparison" className="text-lg font-bold">
        Vergleich
      </h2>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label htmlFor={selectId} className="flex w-full flex-col gap-1 text-sm text-muted sm:w-72">
          Thema
          <select
            id={selectId}
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-base text-fg"
          >
            {selectable.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.icon} {t.title}
              </option>
            ))}
          </select>
        </label>
        <SegmentedControl
          label="Vergleichen nach"
          options={DIMENSIONS}
          value={dimension}
          onChange={setDimension}
        />
      </div>
      {query.isError ? (
        <p className="mt-4 text-sm text-muted">Der Vergleich konnte nicht geladen werden.</p>
      ) : !query.data ? (
        <div
          className="mt-4 h-40 animate-pulse rounded-xl bg-subtle motion-reduce:animate-none"
          aria-label="Lädt"
        />
      ) : (
        <ul className="mt-4 space-y-4" aria-busy={query.isFetching}>
          {groups.map((group) => (
            <li key={group.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold">{group.label}</span>
                <span className="flex items-center gap-2 text-sm tabular-nums">
                  {group.sentiment ? (
                    <strong>{group.sentiment.negative} % unzufrieden</strong>
                  ) : (
                    <span className="text-muted">zu wenige Daten</span>
                  )}
                  <MoodBadge score={group.score} size="sm" showLabel={false} />
                </span>
              </div>
              <DivergingBar sentiment={group.sentiment} domain={domain} className="mt-1.5" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

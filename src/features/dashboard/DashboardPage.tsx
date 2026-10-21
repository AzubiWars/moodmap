import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getDataSource } from '@/data';
import { K_MIN } from '@/lib/env';
import { GroupComparison } from './GroupComparison';
import { Hotspots, KpiRow, TopicPercentList, TopicRanking } from './LagebildSections';
import { loadLagebild } from './loadLagebild';

/** Lagebild NRW (#25): KPIs, Brennpunkte, Themen in Prozent, Ranking und Vergleich. Sie-Form. */
export function DashboardPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['aggregates', 'lagebild'],
    queryFn: async () => {
      const source = getDataSource();
      const [wave, lagebild] = await Promise.all([source.getCurrentWave(), loadLagebild(source, K_MIN)]);
      return { wave, ...lagebild };
    },
  });

  // Neue Antwort (Mood-Check, anderer Tab) → Kennzahlen neu laden.
  useEffect(
    () =>
      getDataSource().subscribeToNewResponses(() => {
        void queryClient.invalidateQueries({ queryKey: ['aggregates', 'lagebild'] });
      }),
    [queryClient],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Lagebild NRW</h1>
        <p className="mt-1 text-sm text-muted">
          {query.data ? `Woche ${query.data.wave.id.replace(/^\d{4}-W/, 'KW ')} · ` : ''}
          Alle Schulformen · Werte erst ab {K_MIN} Stimmen, darunter „zu wenige Daten“.
        </p>
      </header>

      {query.isError ? (
        <div className="card p-6 text-center">
          <p className="font-semibold">Das Lagebild konnte nicht geladen werden.</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 font-semibold text-primary-fg"
          >
            Erneut versuchen
          </button>
        </div>
      ) : !query.data ? (
        <div className="space-y-4" aria-busy="true" aria-label="Lagebild lädt">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-subtle motion-reduce:animate-none" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-subtle motion-reduce:animate-none" />
        </div>
      ) : (
        <>
          <KpiRow overall={query.data.overall} schools={query.data.schools} />
          <Hotspots topics={query.data.topics} />
          <TopicPercentList topics={query.data.topics} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopicRanking topics={query.data.topics} />
            <GroupComparison topics={query.data.topics} />
          </div>
        </>
      )}
    </div>
  );
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getDataSource } from '@/data';
import { K_MIN } from '@/lib/env';
import { useRoleStore } from '@/store/role';
import { GroupComparison } from './GroupComparison';
import { Hotspots, KpiRow, TopicPercentList, TopicRanking } from './LagebildSections';
import { loadLagebild } from './loadLagebild';

/** Lagebild NRW (#25): KPIs, Brennpunkte, Themen in Prozent, Ranking und Vergleich. Sie-Form. */
export function DashboardPage() {
  const queryClient = useQueryClient();
  const role = useRoleStore((s) => s.role);
  const [searchParams] = useSearchParams();
  // Live ist nach der Backend-Optimierung (#227) schnell genug; Demo-Daten unter ?demo=1.
  const demo = searchParams.get('demo') === '1';
  const source = useMemo(() => getDataSource(demo ? 'mock' : undefined), [demo]);
  const query = useQuery({
    queryKey: ['aggregates', 'lagebild', demo],
    queryFn: async () => {
      const [wave, lagebild] = await Promise.all([source.getCurrentWave(), loadLagebild(source, K_MIN)]);
      return { wave, ...lagebild };
    },
  });

  // Neue Antwort (Mood-Check, anderer Tab) → Kennzahlen neu laden.
  useEffect(
    () =>
      source.subscribeToNewResponses(() => {
        void queryClient.invalidateQueries({ queryKey: ['aggregates', 'lagebild', demo] });
      }),
    [queryClient, source, demo],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Lagebild NRW</h1>
        {role === 'school' && (
          <Link
            to="/dashboard/school"
            className="mt-2 inline-flex min-h-11 items-center font-medium text-accent underline"
          >
            Zum Dashboard Ihrer Schule
          </Link>
        )}
        <Link
          to={demo ? '/dashboard' : '/dashboard?demo=1'}
          className="mt-2 ml-3 inline-flex min-h-11 items-center font-medium text-accent underline"
        >
          {demo ? 'Live-Daten anzeigen' : 'Demo-Daten anzeigen'}
        </Link>
        <p className="mt-1 text-sm text-muted">
          {query.data ? `Woche ${query.data.wave.id.replace(/^\d{4}-W/, 'KW ')} · ` : ''}
          Alle Schulformen · Werte erst ab {K_MIN} Stimmen, darunter „zu wenige Daten“.
          {demo && ' · Demo-Daten'}
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

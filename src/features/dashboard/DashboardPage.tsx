import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDataSource } from '@/data';
import { K_MIN } from '@/lib/env';
import { useRoleStore } from '@/store/role';
import { EmptySourceNotice, SourceSwitcher } from '@/components/SourceSwitcher';
import { useSelectedSource } from '@/components/useSelectedSource';
import { GroupComparison } from './GroupComparison';
import { PolicyPublishForm } from '@/features/dialog/PolicyPublishForm';
import { AiReport } from './AiReport';
import { Hotspots, KpiRow, TopicPercentList, TopicRanking } from './LagebildSections';
import { loadLagebild } from './loadLagebild';

/** Lagebild NRW (#25): KPIs, Brennpunkte, Themen in Prozent, Ranking und Vergleich. Sie-Form. */
export function DashboardPage() {
  const queryClient = useQueryClient();
  const role = useRoleStore((s) => s.role);
  const source = getDataSource();
  // Datenquelle (#272): Wechsel lädt alle Kennzahlen neu, ohne Reload
  const selection = useSelectedSource();
  const { sourceId } = selection;
  const query = useQuery({
    queryKey: ['aggregates', 'lagebild', sourceId ?? null],
    queryFn: async () => {
      const [wave, lagebild] = await Promise.all([
        source.getCurrentWave(),
        loadLagebild(source, K_MIN, sourceId),
      ]);
      return { wave, ...lagebild };
    },
  });

  // Neue Antwort (Mood-Check, anderer Tab) → Kennzahlen neu laden.
  useEffect(
    () =>
      source.subscribeToNewResponses(() => {
        void queryClient.invalidateQueries({ queryKey: ['aggregates', 'lagebild'] });
      }),
    [queryClient, source],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Lagebild NRW</h1>
        <div className="mt-2 flex flex-wrap gap-x-4">
          {role === 'school' && (
            <Link
              to="/dashboard/school"
              className="inline-flex min-h-11 items-center font-medium text-accent underline"
            >
              Zum Dashboard Ihrer Schule
            </Link>
          )}
          <Link
            to="/methodik"
            className="inline-flex min-h-11 items-center font-medium text-accent underline"
          >
            Methodik & Quellen
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted">
          {query.data && selection.selected?.kind !== 'import'
            ? `Woche ${query.data.wave.id.replace(/^\d{4}-W/, 'KW ')} · `
            : ''}
          {selection.selected?.kind === 'import' ? 'Letzte Woche der Befragung' : 'Live-Befragung'} · Alle
          Schulformen · Werte erst ab {K_MIN} Stimmen, darunter „zu wenige Daten“.
        </p>
        <SourceSwitcher selection={selection} className="mt-2" />
        <div className="mt-2">
          <EmptySourceNotice selection={selection} />
        </div>
      </header>

      {role === 'ministry' && <PolicyPublishForm />}

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
          <AiReport topics={query.data.topics} />
          <TopicPercentList topics={query.data.topics} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopicRanking topics={query.data.topics} />
            <GroupComparison topics={query.data.topics} sourceId={sourceId} />
          </div>
        </>
      )}
    </div>
  );
}

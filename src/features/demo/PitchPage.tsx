import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getDataSource } from '@/data';
import { PitchBoard } from './PitchBoard';
import { PitchReset } from './PitchReset';

export const PITCH_POLL_MS = 2_500;
const PITCH_KEY = ['pitch'] as const;

/** Beamer is the only screen polling the isolated Pitch aggregates. */
export function PitchPage() {
  const source = getDataSource();
  const local = source === getDataSource('mock');
  const client = useQueryClient();
  const aggregate = useQuery({
    queryKey: [...PITCH_KEY, 'aggregate'],
    queryFn: async () => {
      const result = await source.getPitchAggregate();
      if (result.school.id !== 'pitch-test' || !result.school.isTest) throw new Error('Kein Pitch-Teststandort.');
      return result;
    },
    refetchInterval: PITCH_POLL_MS, refetchIntervalInBackground: true, staleTime: 0, retry: 1,
  });
  const clusters = useQuery({
    queryKey: [...PITCH_KEY, 'clusters'],
    queryFn: () => source.getFreetextClusters({ level: 'school', id: 'pitch-test' }),
    enabled: !!aggregate.data, refetchInterval: PITCH_POLL_MS, refetchIntervalInBackground: true, staleTime: 0, retry: 1,
  });
  useEffect(() => source.subscribeToNewResponses(({ schoolId }) => {
    if (schoolId === 'pitch-test') void client.invalidateQueries({ queryKey: PITCH_KEY });
  }), [source, client]);
  const reset = async (pin: string) => {
    const result = await source.resetPitchTest(pin);
    if (!result.ok) throw new Error('Pitch-Reset fehlgeschlagen.');
    await client.cancelQueries({ queryKey: PITCH_KEY });
    await client.resetQueries({ queryKey: PITCH_KEY });
  };
  const code = aggregate.data?.school.joinCode;
  const joinUrl = code ? `${window.location.origin}/s/${encodeURIComponent(code)}` : null;

  return <div className="min-h-dvh bg-surface text-fg">
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 px-4 py-4 lg:px-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-accent uppercase lg:text-sm">Moodmap · Pitch-Test</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-4xl">Deine Stimme. Unser Stimmungsbild.</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Link to="/demo" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-subtle">Zur Demo</Link>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-[1800px] space-y-5 px-4 py-5 lg:px-6 lg:py-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted lg:text-lg">
        <p><span className="font-semibold text-fg">{aggregate.data?.school.name ?? 'Teststandort'}</span>{aggregate.data && ` · ${aggregate.data.school.city}`}</p>
        <p>{local ? 'Lokale Demo' : 'Live-Test'} · Aktualisierung alle 2,5 Sekunden</p>
      </div>
      {(aggregate.isError || clusters.isError) && <div role="alert" className="rounded-2xl border border-mood-2 bg-card p-4">
        <p className="font-semibold">Die Aktualisierung ist unterbrochen.</p>
        <p className="mt-1 text-sm text-muted">{aggregate.data ? 'Die angezeigten Werte stammen vom letzten erfolgreichen Abruf.' : 'Bitte Verbindung und Pitch-Konfiguration prüfen.'}</p>
        <button type="button" onClick={() => void client.invalidateQueries({ queryKey: PITCH_KEY })} className="mt-2 min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-fg">Erneut versuchen</button>
      </div>}
      {!aggregate.data && aggregate.isPending && <p role="status" className="py-20 text-center text-xl text-muted">Pitch-Runde wird geladen …</p>}
      {aggregate.data && <>
        {!code && <p role="alert" className="rounded-xl border border-border p-4 text-muted">Der Teilnahme-Code fehlt. Bitte die Pitch-Konfiguration aktualisieren.</p>}
        <PitchBoard aggregate={aggregate.data} clusters={clusters.data ?? []} joinUrl={joinUrl} local={local} />
        <div className="flex flex-wrap items-start justify-between gap-4 border-t border-border pt-4">
          <p className="text-sm text-muted">Prototyp · Freiwilliger Test außerhalb der NRW-Auswertung.<br />{aggregate.data.waveId} · Stand {new Date(aggregate.dataUpdatedAt).toLocaleTimeString('de-DE')}</p>
          <PitchReset onReset={reset} local={local} />
        </div>
      </>}
    </main>
  </div>;
}

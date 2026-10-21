import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { getDataSource } from '@/data';
import { PitchReset } from './PitchReset';

/** One initial read on /demo; only the Beamer page polls. */
export function PitchEntry() {
  const source = getDataSource();
  const client = useQueryClient();
  const aggregate = useQuery({ queryKey: ['pitch', 'entry'], queryFn: () => source.getPitchAggregate(), retry: false });
  const school = aggregate.data?.school;
  const url = school?.id === 'pitch-test' && school.isTest && school.joinCode ? `${window.location.origin}/s/${encodeURIComponent(school.joinCode)}` : null;
  return <section className="card space-y-4 p-5" aria-label="Pitch-Live-Test">
    <div><h2 className="text-lg font-semibold">Pitch-Live-Test</h2><p className="mt-1 text-sm text-muted">Eigene Test-Runde außerhalb der NRW-Auswertung. Der Beamer zeigt alle Stimmen dieser Runde.</p></div>
    <Link to="/demo/live" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">Beamer-Ansicht öffnen</Link>
    {url && <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="rounded-xl bg-white p-3"><QRCodeSVG value={url} size={176} title="QR-Code zum Pitch-Mood-Check" /></div>
      <a href={url} className="break-all text-sm font-medium text-accent underline">{url}</a>
    </div>}
    {aggregate.isError && <p role="status" className="text-sm text-muted">Pitch-Runde derzeit nicht verfügbar. Bitte die Beamer-Ansicht öffnen und die Konfiguration prüfen.</p>}
    {school && <PitchReset local={source === getDataSource('mock')} onReset={async (pin) => {
      if (!(await source.resetPitchTest(pin)).ok) throw new Error('Pitch-Reset fehlgeschlagen.');
      await client.cancelQueries({ queryKey: ['pitch'] });
      await client.resetQueries({ queryKey: ['pitch'] });
    }} />}
  </section>;
}

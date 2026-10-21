import { useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { useDemoStore } from '@/store/demo';
import { demoSchoolUrl, resetDemoData } from './demoData';
import { PitchEntry } from './PitchEntry';

export function DemoPage() {
  const queryClient = useQueryClient();
  const { live, setLive } = useDemoStore();
  const [copied, setCopied] = useState(false);
  const url = demoSchoolUrl(window.location.origin);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Zwischenablage nicht verfügbar – Link ist sichtbar und markierbar */
    }
  };

  const regenerate = () => {
    resetDemoData();
    void queryClient.invalidateQueries();
    window.location.reload();
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Demo-Steuerung</h1>
      <PitchEntry />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-lg font-semibold">Ansicht</h2>
        <p className="mb-3 text-sm text-muted">Wer schaut gerade auf die Daten?</p>
        <RoleSwitcher />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-lg font-semibold">Mitmachen per QR-Code</h2>
        <p className="mb-4 text-sm text-muted">Scannen öffnet den Mood-Check der Demo-Schule.</p>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={url} size={176} title={`QR-Code zu ${url}`} />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="break-all font-mono text-sm">{url}</p>
            <button
              type="button"
              onClick={copy}
              className="min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-fg"
            >
              {copied ? 'Link kopiert' : 'Link kopieren'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
        <label className="flex min-h-11 items-center justify-between gap-4">
          <span>
            <span className="block font-semibold">Live-Modus</span>
            <span className="block text-sm text-muted">Neue Antworten erscheinen laufend.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={live}
            onChange={(e) => setLive(e.target.checked)}
            className="size-6"
          />
        </label>
        <button
          type="button"
          onClick={regenerate}
          className="min-h-11 rounded-full border border-border px-5 text-sm font-medium hover:bg-subtle"
        >
          Demo-Daten neu generieren
        </button>
      </div>
    </section>
  );
}

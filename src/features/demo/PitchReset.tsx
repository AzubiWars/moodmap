import { useId, useRef, useState } from 'react';

interface Props { onReset: (pin: string) => Promise<void>; local: boolean }

/** Keep the PIN only while this form is open. No URL, storage, logs or query/mutation cache. */
export function PitchReset({ onReset, local }: Props) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const inputId = useId();
  const pending = useRef(false);
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => { setOpen(!open); setPin(''); setStatus(''); }} disabled={busy}
        aria-expanded={open} className="min-h-11 rounded-full border border-border bg-card px-5 text-sm font-medium hover:bg-subtle disabled:opacity-50">
        {open ? 'Abbrechen' : 'Pitch-Test zurücksetzen'}
      </button>
      {open && <form className="space-y-3 rounded-2xl border border-border bg-card p-4" onSubmit={async (event) => {
        event.preventDefault();
        if (pending.current || (!local && pin.length < 8)) return;
        pending.current = true; setBusy(true); setStatus('');
        const candidate = pin; setPin('');
        try { await onReset(candidate); setOpen(false); setStatus('Pitch-Test zurückgesetzt. Du kannst erneut teilnehmen.'); }
        catch { setStatus('Zurücksetzen fehlgeschlagen. Bitte PIN und Verbindung prüfen.'); }
        finally { pending.current = false; setBusy(false); }
      }}>
        <p className="text-sm text-muted">Nur die Pitch-Runde mit Antworten und Freitexten wird gelöscht. NRW-Daten bleiben erhalten.</p>
        {!local && <div className="space-y-1">
          <label htmlFor={inputId} className="block text-sm font-semibold">Admin-PIN</label>
          <input id={inputId} autoFocus type="password" autoComplete="off" value={pin} minLength={8} maxLength={200} required
            onChange={(event) => setPin(event.target.value)} disabled={busy}
            className="min-h-11 w-full rounded-xl bg-subtle px-3 text-base ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none" />
        </div>}
        {local && <p className="text-sm text-muted">Lokale Demo: Zurücksetzen gilt nur für diesen Browser.</p>}
        <button type="submit" disabled={busy || (!local && pin.length < 8)}
          className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-50">
          {busy ? 'Wird zurückgesetzt …' : 'Pitch-Runde endgültig löschen'}
        </button>
      </form>}
      {status && <p role="status" className="text-sm">{status}</p>}
    </div>
  );
}

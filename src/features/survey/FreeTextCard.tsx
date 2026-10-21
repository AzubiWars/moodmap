import { useEffect, useRef, useState } from 'react';
import { MAX_FREE_TEXT_LENGTH, moderateFreeText, type FreeTextModeration } from '@/lib/freeText';

interface FreeTextCardProps {
  onDone: (result: FreeTextModeration | null) => void;
}

/** Optionale Freitext-Karte am Ende des Mood-Checks (ADR-016). */
export function FreeTextCard({ onDone }: FreeTextCardProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [concern, setConcern] = useState<FreeTextModeration | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return onDone(null);

    setPending(true);
    setError(null);
    const result = await moderateFreeText(trimmed);
    setPending(false);

    if (!result.allowed) {
      setError(result.reason || 'Bitte formuliere den Text sachlich.');
      return;
    }
    if (result.concern) {
      setConcern(result);
      return;
    }
    onDone(result);
  }

  if (concern) {
    return (
      <section className="mx-auto flex min-h-[calc(100dvh-8.5rem)] max-w-md flex-col justify-center px-4 py-4">
        <div className="card space-y-4 p-6" role="note">
          <p className="text-4xl" aria-hidden>
            💚
          </p>
          <h1 className="text-xl font-bold">Danke, dass du das teilst.</h1>
          <p className="text-sm text-muted">
            Wenn es dir nicht gut geht, musst du da nicht allein durch. Die „Nummer gegen Kummer“ ist
            kostenlos und anonym unter{' '}
            <a className="font-semibold underline" href="tel:116111">
              116 111
            </a>
            . Du kannst auch bei{' '}
            <a
              className="font-semibold underline"
              href="https://krisenchat.de"
              target="_blank"
              rel="noreferrer"
            >
              krisenchat.de
            </a>{' '}
            schreiben oder dich an die Schulpsychologie/Schulsozialarbeit wenden.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onDone(concern)}
              className="min-h-12 rounded-2xl bg-primary font-semibold text-primary-fg"
            >
              Trotzdem absenden
            </button>
            <button
              type="button"
              onClick={() => onDone(null)}
              className="min-h-12 rounded-2xl font-medium ring-1 ring-border"
            >
              Überspringen
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-8.5rem)] max-w-md flex-col justify-center px-4 py-4">
      <div className="card space-y-4 p-6">
        <div>
          <p className="text-sm font-medium text-muted">Noch eine optionale Frage</p>
          <h1 className="mt-1 text-xl font-bold">Was sollte sich an deiner Schule ändern?</h1>
          <p id="freetext-hint" className="mt-2 text-sm text-muted">
            Maximal {MAX_FREE_TEXT_LENGTH} Zeichen. Bitte keine Namen, keine Beleidigungen. Der Text wird vor
            dem Absenden geprüft.
          </p>
        </div>

        <label className="block">
          <span className="sr-only">Dein Freitext</span>
          <textarea
            ref={inputRef}
            value={text}
            maxLength={MAX_FREE_TEXT_LENGTH}
            onChange={(event) => {
              setText(event.target.value);
              if (error) setError(null);
            }}
            aria-describedby="freetext-hint freetext-count"
            rows={4}
            placeholder="z. B. Die Toiletten sind oft kaputt und im Winter ist es zu kalt."
            className="w-full resize-none rounded-2xl bg-subtle p-4 text-sm text-fg ring-1 ring-border outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
          />
        </label>

        <div className="flex items-center justify-between text-xs text-muted">
          <span>Anonym · keine Namen</span>
          <span id="freetext-count">
            {text.length}/{MAX_FREE_TEXT_LENGTH}
          </span>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-mood-1/10 px-3 py-2 text-sm text-mood-1">
            Dein Hinweis konnte nicht übernommen werden. {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={pending || !text.trim()}
            className="min-h-12 rounded-2xl bg-primary font-semibold text-primary-fg disabled:opacity-50"
          >
            {pending ? 'Wird geprüft …' : 'Absenden'}
          </button>
          <button
            type="button"
            onClick={() => onDone(null)}
            disabled={pending}
            className="min-h-11 rounded-2xl font-medium ring-1 ring-border disabled:opacity-50"
          >
            Überspringen
          </button>
        </div>
      </div>
    </section>
  );
}

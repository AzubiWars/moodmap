import { useEffect, useRef, useState } from 'react';
import { MAX_FREE_TEXT_LENGTH } from '@/lib/freeText';

interface FreeTextCardProps {
  /** Rohtext wird erst nach der Umfrage-Abgabe serverseitig moderiert; `null` = übersprungen. */
  onDone: (text: string | null) => void;
  /** Bereits eingegebener Text, wenn man aus der Übersicht zurückkommt. */
  initial?: string | null;
}

/** Optionale Freitext-Karte am Ende des Mood-Checks (ADR-016). */
export function FreeTextCard({ onDone, initial }: FreeTextCardProps) {
  const [text, setText] = useState(initial ?? '');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit() {
    onDone(text.trim() || null);
  }

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-8.5rem)] max-w-md flex-col justify-center px-4 py-4">
      <div className="card space-y-4 p-6">
        <div>
          <p className="text-sm font-medium text-muted">Noch eine optionale Frage</p>
          <h1 className="mt-1 text-xl font-bold">Was sollte sich an deiner Schule ändern?</h1>
          <p id="freetext-hint" className="mt-2 text-sm text-muted">
            Maximal {MAX_FREE_TEXT_LENGTH} Zeichen. Bitte keine Namen, keine Beleidigungen. Der Text wird nach
            dem Absenden geprüft.
          </p>
        </div>

        <label className="block">
          <span className="sr-only">Dein Freitext</span>
          <textarea
            ref={inputRef}
            value={text}
            maxLength={MAX_FREE_TEXT_LENGTH}
            onChange={(event) => setText(event.target.value)}
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

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="min-h-12 rounded-2xl bg-primary font-semibold text-primary-fg disabled:opacity-50"
          >
            Weiter
          </button>
          <button
            type="button"
            onClick={() => onDone(null)}
            className="min-h-11 rounded-2xl font-medium ring-1 ring-border"
          >
            Überspringen
          </button>
        </div>
      </div>
    </section>
  );
}

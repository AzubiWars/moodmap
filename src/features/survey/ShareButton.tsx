import { useState } from 'react';

interface ShareButtonProps {
  schoolCode: string;
  text: string;
}

/** Teilen per Web Share API, sonst Link in die Zwischenablage. */
export function ShareButton({ schoolCode, text }: ShareButtonProps) {
  const [message, setMessage] = useState('');
  const url = `${window.location.origin}/s/${schoolCode}`;

  async function share() {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Moodmap NRW', text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage('Link kopiert');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage(`Teilen hat nicht geklappt. Kopiere den Link: ${url}`);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void share()}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-border bg-card px-5 font-semibold"
      >
        Link teilen
      </button>
      <p className="text-center text-sm text-muted" role="status">
        {message}
      </p>
    </div>
  );
}

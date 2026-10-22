import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getDataSource } from '@/data';
import { TOPICS } from '@/data/topics';
import type { PolicyAnswerStatus } from '@/types';

const STATUS: { value: PolicyAnswerStatus; label: string }[] = [
  { value: 'listening', label: 'Wir hören zu' },
  { value: 'reviewing', label: 'Wir prüfen' },
  { value: 'planned', label: 'Maßnahme geplant' },
  { value: 'done', label: 'Umgesetzt' },
];

export function PolicyPublishForm() {
  const client = useQueryClient();
  const source = getDataSource();
  const [topic, setTopic] = useState('voice');
  const [status, setStatus] = useState<PolicyAnswerStatus>('reviewing');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    try {
      await source.publishPolicyAnswer({
        topic,
        scope: 'nrw',
        regionId: null,
        title: title.trim(),
        body: body.trim(),
        status,
        authorRole: 'ministerium',
      });
      setTitle('');
      setBody('');
      setMessage('Antwort veröffentlicht.');
      await client.invalidateQueries({ queryKey: ['policy'] });
    } catch {
      setMessage('Veröffentlichen fehlgeschlagen – im Live-Modus ist eine Ministeriums-Anmeldung nötig.');
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="card space-y-3 p-5">
      <h2 className="font-bold">Antwort veröffentlichen</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-medium text-muted">
          Thema
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl bg-card px-3 text-sm text-fg ring-1 ring-border"
          >
            {TOPICS.filter((entry) => entry.audience.includes('student')).map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as PolicyAnswerStatus)}
            className="mt-1 min-h-11 w-full rounded-xl bg-card px-3 text-sm text-fg ring-1 ring-border"
          >
            {STATUS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-xs font-medium text-muted">
        Titel
        <input
          required
          maxLength={160}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl bg-subtle px-3 text-sm text-fg ring-1 ring-border"
        />
      </label>
      <label className="block text-xs font-medium text-muted">
        Text
        <textarea
          required
          maxLength={400}
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="mt-1 w-full resize-none rounded-xl bg-subtle p-3 text-sm text-fg ring-1 ring-border"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="min-h-11 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-fg"
        >
          Veröffentlichen
        </button>
        {message && <p className="text-xs text-muted">{message}</p>}
      </div>
    </form>
  );
}

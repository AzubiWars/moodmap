import { Megaphone } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDataSource } from '@/data';
import type { PolicyAnswer } from '@/types';

const STATUS_LABELS = {
  listening: 'Wir hören zu',
  reviewing: 'Wir prüfen',
  planned: 'Maßnahme geplant',
  done: 'Umgesetzt',
} as const;

/** „Politik antwortet“ auf dem Danke-Screen inkl. Bewertung. */
export function PolicyAnswers() {
  const source = getDataSource();
  const query = useQuery({ queryKey: ['policy', 'answers'], queryFn: () => source.getPolicyAnswers({}) });
  const [rated, setRated] = useState<string | null>(null);
  const answers = (query.data ?? []).slice(0, 2);

  if (answers.length === 0) return null;

  async function rate(answer: PolicyAnswer, value: 1 | 2 | 3 | 4 | 5) {
    const result = await source.ratePolicyAnswer(answer.id, value);
    if (result.ok) setRated(answer.id);
  }

  return (
    <section className="card space-y-3 p-5" aria-label="Politik antwortet">
      <h2 className="flex items-center gap-2 font-semibold">
        <Megaphone aria-hidden className="size-4 text-accent" />
        Die Politik antwortet
      </h2>
      {answers.map((answer) => (
        <article key={answer.id} className="rounded-2xl bg-subtle p-3">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">
            {STATUS_LABELS[answer.status]}
          </p>
          <h3 className="mt-1 text-sm font-semibold">{answer.title}</h3>
          <p className="mt-1 text-sm text-muted">{answer.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
            <span className="text-muted">Hilft dir das?</span>
            {([1, 2, 3, 4, 5] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => void rate(answer, value)}
                className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full bg-card ring-1 ring-border hover:bg-subtle"
                aria-label={`${value} von 5`}
              >
                {value}
              </button>
            ))}
            {rated === answer.id && <span className="text-accent">Danke!</span>}
          </div>
        </article>
      ))}
    </section>
  );
}

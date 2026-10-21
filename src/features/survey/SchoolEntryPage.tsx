import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getDataSource } from '@/data';
import { cn } from '@/lib/utils';
import { useParticipantStore } from '@/store/participant';
import type { GradeBand } from '@/types';

const GRADE_OPTIONS: { value: GradeBand; label: string }[] = [
  { value: '5-7', label: '5–7' },
  { value: '8-10', label: '8–10' },
  { value: 'oberstufe', label: 'Oberstufe' },
  { value: 'berufskolleg', label: 'Berufskolleg' },
];

export function SchoolEntryPage() {
  const { schoolCode = '' } = useParams();
  const code = schoolCode.toUpperCase();
  const navigate = useNavigate();
  const setSchool = useParticipantStore((s) => s.setSchool);
  const setGradeBand = useParticipantStore((s) => s.setGradeBand);
  const [grade, setGrade] = useState<GradeBand | undefined>(useParticipantStore.getState().gradeBand);

  const {
    data: school,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['school', code],
    queryFn: () => getDataSource().getSchoolByCode(code),
  });

  if (isPending) {
    return (
      <section className="mx-auto max-w-md px-4 py-8" aria-busy="true" aria-label="Schule wird geladen">
        <div className="card space-y-4 p-6">
          <div className="h-6 w-2/3 animate-pulse rounded bg-subtle" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-subtle" />
          <div className="h-11 w-full animate-pulse rounded-2xl bg-subtle" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mx-auto max-w-md px-4 py-8">
        <div className="card space-y-4 p-6" role="alert">
          <h1 className="text-xl font-bold">Das hat gerade nicht geklappt</h1>
          <p className="text-muted">Bitte versuche es noch einmal.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-11 rounded-2xl bg-primary px-5 font-semibold text-primary-fg"
          >
            Nochmal versuchen
          </button>
        </div>
      </section>
    );
  }

  if (!school) {
    return (
      <section className="mx-auto max-w-md px-4 py-8">
        <div className="card space-y-4 p-6">
          <h1 className="text-xl font-bold">Diesen Schulcode kennen wir nicht</h1>
          <p className="text-muted">
            Der Code <span className="font-mono font-semibold">{code}</span> gehört zu keiner Schule. Scanne
            den QR-Code deiner Schule noch einmal.
          </p>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 font-semibold text-primary-fg"
          >
            Zur Startseite
          </Link>
        </div>
      </section>
    );
  }

  const start = () => {
    setSchool({ id: school.id, code: school.joinCode, name: school.name, isTest: school.isTest });
    setGradeBand(grade);
    navigate('/check');
  };

  return (
    <section className="mx-auto max-w-md px-4 py-8">
      <div className="card space-y-6 p-6">
        <div>
          <p className="text-sm font-medium text-muted">Willkommen bei Moodmap 👋</p>
          <h1 className="mt-1 text-2xl font-bold">{school.name}</h1>
          <p className="text-muted">{school.city}</p>
        </div>

        <div>
          <p id="grade-label" className="mb-2 text-sm font-medium">
            In welcher Stufe bist du? <span className="text-muted">(freiwillig)</span>
          </p>
          <div role="group" aria-labelledby="grade-label" className="flex flex-wrap gap-2">
            {GRADE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={grade === o.value}
                onClick={() => setGrade(grade === o.value ? undefined : o.value)}
                className={cn(
                  'min-h-11 rounded-full px-4 text-sm font-medium ring-1 transition-colors',
                  grade === o.value
                    ? 'bg-primary text-primary-fg ring-primary'
                    : 'bg-card text-fg ring-border hover:bg-subtle',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <p className="rounded-2xl bg-subtle p-3 text-sm">
          🔒 100 % anonym – keine Namen, keine E-Mail, keine IP.{' '}
          <Link to="/privacy" className="font-medium text-accent underline">
            Mehr dazu
          </Link>
        </p>

        <button
          type="button"
          onClick={start}
          className="min-h-12 w-full rounded-2xl bg-primary px-5 text-lg font-semibold text-primary-fg"
        >
          Los geht's
        </button>
      </div>
    </section>
  );
}

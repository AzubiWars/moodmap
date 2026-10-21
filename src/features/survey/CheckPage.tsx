import { Link } from 'react-router-dom';
import { Placeholder } from '@/components/Placeholder';
import { useParticipantStore } from '@/store/participant';

export function CheckPage() {
  const schoolId = useParticipantStore((s) => s.schoolId);

  if (!schoolId) {
    return (
      <section className="mx-auto max-w-md px-4 py-8">
        <div className="card space-y-4 p-6">
          <h1 className="text-xl font-bold">Zuerst deine Schule</h1>
          <p className="text-muted">Scanne den QR-Code deiner Schule, dann geht's los.</p>
          <Link
            to="/s/DEMO42"
            className="inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 font-semibold text-primary-fg"
          >
            Demo-Schule ausprobieren
          </Link>
        </div>
      </section>
    );
  }

  return <Placeholder title="Mood-Check" issue={12} />;
}

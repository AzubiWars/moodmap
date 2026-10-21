import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getDataSource } from '@/data';
import { useParticipantStore } from '@/store/participant';
import { useRoleStore } from '@/store/role';
import type { School } from '@/types';

/** Demo-Schule (`/demo`), solange auf diesem Gerät keine Schule gewählt wurde. */
const FALLBACK_SCHOOL_CODE = 'DEMO42';

const linkButton =
  'inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 font-semibold text-primary-fg';

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-8 print:hidden">
      <div className="card space-y-4 p-6" role="status">
        <h1 className="text-xl font-bold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

/**
 * Schul-Ansichten gibt es nur in der Rolle „Schule“ (docs/PRIVACY.md §4) und nur für die eigene Schule:
 * `?code=` vor der Schule dieses Geräts vor der Demo-Schule. Andere Schulen sind hier nicht erreichbar.
 */
export function SchoolAccess({ children }: { children: (school: School) => ReactNode }) {
  const role = useRoleStore((s) => s.role);
  const setRole = useRoleStore((s) => s.setRole);
  const [params] = useSearchParams();
  const storedCode = useParticipantStore((s) => s.schoolCode);
  const code = (params.get('code') ?? storedCode ?? FALLBACK_SCHOOL_CODE).toUpperCase();

  const query = useQuery({
    queryKey: ['school', code],
    queryFn: () => getDataSource().getSchoolByCode(code),
    enabled: role === 'school',
  });

  if (role !== 'school') {
    return (
      <Notice title="Diese Ansicht ist für Schulen">
        <p className="text-muted">
          Das Schul-Dashboard zeigt Schulleitung und SV die eigene Schule. Wechseln Sie dafür die Ansicht auf
          „Schule“.
        </p>
        <button type="button" onClick={() => setRole('school')} className={linkButton}>
          Ansicht „Schule“ wählen
        </button>
      </Notice>
    );
  }
  if (query.isError) {
    return (
      <Notice title="Die Schule konnte nicht geladen werden">
        <button type="button" onClick={() => void query.refetch()} className={linkButton}>
          Erneut versuchen
        </button>
      </Notice>
    );
  }
  if (query.isPending) {
    return <div className="mx-auto h-64 max-w-3xl animate-pulse px-4 py-8" aria-busy="true" />;
  }
  if (!query.data) {
    return (
      <Notice title="Diesen Schulcode kennen wir nicht">
        <p className="text-muted">
          Der Code <span className="font-mono font-semibold">{code}</span> gehört zu keiner Schule.
        </p>
        <Link to="/demo" className={linkButton}>
          Zur Demo-Seite
        </Link>
      </Notice>
    );
  }
  return <>{children(query.data)}</>;
}

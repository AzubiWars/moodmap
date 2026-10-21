import { useQuery } from '@tanstack/react-query';
import { ScoreBar } from '@/components/ScoreBar';
import { WeatherIcon } from '@/components/WeatherIcon';
import { getDataSource } from '@/data';
import { getTopic } from '@/data/topics';
import { K_MIN } from '@/lib/env';

interface SchoolVsNrwProps {
  schoolId: string;
  schoolCode: string;
  topics: string[];
}

/** „Deine Schule vs. NRW": Werte erst ab K_MIN, darunter nur ein Hinweis. */
export function SchoolVsNrw({ schoolId, schoolCode, topics }: SchoolVsNrwProps) {
  const data = useQuery({
    queryKey: ['doneComparison', schoolId, schoolCode, topics],
    queryFn: async () => {
      const source = getDataSource();
      const school = await source.getSchoolByCode(schoolCode);
      const rows = await Promise.all(
        topics.map(async (topic) => {
          const [nrw, schools] = await Promise.all([
            source.getAggregates({ level: 'nrw', topic }),
            school
              ? source.getAggregates({ level: 'school', topic, parentId: school.kreisId })
              : Promise.resolve([]),
          ]);
          const mine = schools.find((row) => row.id === schoolId);
          return { topic, nrw: nrw[0]?.score ?? null, school: mine?.score ?? null };
        }),
      );
      const overall = school
        ? (await source.getAggregates({ level: 'school', topic: 'all', parentId: school.kreisId })).find(
            (row) => row.id === schoolId,
          )
        : undefined;
      return { rows, participants: overall?.n ?? 0 };
    },
  });

  if (data.isPending) {
    return <div className="card h-40 animate-pulse p-5" aria-busy="true" aria-label="Vergleich lädt" />;
  }
  if (data.isError) return null;

  const { rows, participants } = data.data;
  return (
    <div className="card space-y-4 p-5">
      <h2 className="text-lg font-bold">Deine Schule vs. NRW</h2>
      <ul className="space-y-4">
        {rows.map((row) => {
          const topic = getTopic(row.topic);
          const enough = row.school !== null;
          return (
            <li key={row.topic} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                <span>
                  <span aria-hidden>{topic?.icon} </span>
                  {topic?.title ?? row.topic}
                </span>
                {enough && (
                  <span className="flex items-center gap-1.5">
                    <WeatherIcon score={row.school} />
                    {Math.round(row.school!)}
                  </span>
                )}
              </div>
              {enough ? (
                <>
                  <ScoreBar score={row.school} compare={row.nrw} compareLabel="NRW" />
                  <p className="text-xs text-muted">
                    Strich = NRW-Durchschnitt{row.nrw !== null ? ` (${Math.round(row.nrw)})` : ''}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">
                  Noch zu wenige Stimmen an deiner Schule – teile den Link!
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">
        {participants >= K_MIN
          ? `Schon ${participants} Stimmen an deiner Schule.`
          : `Stimmen an deiner Schule: noch unter ${K_MIN}.`}
      </p>
    </div>
  );
}

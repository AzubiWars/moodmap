import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { measuresForTopic } from '@/features/actions/catalog';
import { EvidenceBadge } from '@/features/actions/Evidence';
import { openDataset, schoolDatasheetUrl } from '@/data/openData';
import type { School } from '@/types';
import type { FactsFile } from '@/types/facts';
import { type DrillState, isCityKreis } from './drilldown';
import {
  areaFacts,
  type FactArea,
  formatPct,
  formatSozial,
  schoolFacts,
  STAGE_LABELS,
  useFacts,
} from './facts';
import { loadSchoolDirectory, SCHOOL_FORM_LABELS } from './schools';

function drillArea(drill: DrillState): FactArea | null {
  if (drill.gemeinde) return { level: 'gemeinde', id: drill.gemeinde.properties.id };
  if (drill.kreis) return { level: 'kreis', id: drill.kreis.properties.id };
  if (drill.regbez) return { level: 'regbez', id: drill.regbez.properties.id };
  return null;
}

function SourceLink({ id }: { id: 'untstat' | 'sozialindex' | 'eckdaten' }) {
  const dataset = openDataset(id);
  return (
    <a
      href={dataset.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-0.5 underline decoration-border underline-offset-2 hover:text-fg"
    >
      {dataset.publisher.replace(' (über Open.NRW)', '')}, Stand {dataset.stand}
      <ExternalLink aria-hidden className="size-3" />
    </a>
  );
}

/**
 * Amtliche Daten zur gewählten Einheit (#297): Unterrichtsausfall und Sozialindex mit NRW-Vergleich und Quelle.
 * `detailed` (Fakten-Modus) ergänzt die Liste der Schulen einer Stadt – alphabetisch, nicht als Rangliste.
 */
export function FactsSection({ drill, detailed = false }: { drill: DrillState; detailed?: boolean }) {
  const factsQuery = useFacts();
  const facts = factsQuery.data;
  if (!facts) return null;
  if (drill.school) return <SchoolFacts facts={facts} school={drill.school} />;
  const area = drillArea(drill);
  if (!area) return null;
  const values = areaFacts(facts, area);
  const nrw = areaFacts(facts, { level: 'nrw', id: 'nrw' });
  const cityLevel = Boolean(drill.gemeinde || (drill.kreis && isCityKreis(drill.kreis)));
  const cancellation = measuresForTopic('cancellation', 1)[0];

  return (
    <section aria-label="Amtliche Daten" className="space-y-3 rounded-xl bg-subtle p-3 text-sm">
      <h3 className="flex items-center gap-1.5 font-semibold">
        <Landmark aria-hidden className="size-4" /> Amtliche Daten
      </h3>

      <div>
        <p className="text-xs text-muted">Ersatzloser Unterrichtsausfall {facts.untstat.year}</p>
        {values.ausfall == null ? (
          <p className="text-xs text-muted">Keine Unterrichtsstatistik für dieses Gebiet.</p>
        ) : (
          <>
            <p className="flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums">{formatPct(values.ausfall)}</span>
              {nrw.ausfall != null && (
                <span className="text-xs text-muted">NRW {formatPct(nrw.ausfall)}</span>
              )}
            </p>
            <p className="text-[11px] text-muted">
              {values.untstatSchools} Schulen · {formatPct(values.regular ?? 0)} nach Stundenplan erteilt ·
              stundengewichtet
            </p>
          </>
        )}
      </div>

      <ClassSize facts={facts} drill={drill} />

      {values.sozial != null && (
        <div>
          <p className="text-xs text-muted">
            Ø Schulsozialindex {facts.sozialindex.year} (1 = gering, 9 = hoch)
          </p>
          <p className="flex items-baseline gap-2">
            <span className="text-xl font-bold tabular-nums">{formatSozial(values.sozial)}</span>
            {nrw.sozial != null && <span className="text-xs text-muted">NRW {formatSozial(nrw.sozial)}</span>}
          </p>
          <p className="text-[11px] text-muted">
            {values.sozialSchools} Schulen · beschreibt die soziale Lage der Schülerschaft, bewertet keine
            Schule
          </p>
        </div>
      )}

      {detailed && cancellation && values.ausfall != null && (
        <Link
          to={`/massnahmen?topic=cancellation#${cancellation.id}`}
          className="flex items-start gap-2 rounded-lg bg-card p-2.5 text-xs font-semibold ring-1 ring-border hover:underline"
        >
          <EvidenceBadge level={cancellation.evidence} />
          Was hilft: {cancellation.title}
        </Link>
      )}

      {detailed && cityLevel && <SchoolList facts={facts} drill={drill} />}

      <p className="space-y-0.5 text-[11px] text-muted">
        <span className="block">
          Quelle Ausfall: <SourceLink id="untstat" />
        </span>
        <span className="block">
          Quelle Sozialindex: <SourceLink id="sozialindex" />
        </span>
        <span className="block">
          Quelle Klassen: <SourceLink id="eckdaten" />
        </span>
        <Link to="/quellen" className="block font-semibold text-accent underline">
          Alle Quellen, Lizenzen und Rechenwege
        </Link>
      </p>
    </section>
  );
}

/** Klassengröße gibt es nur je Kreis; in einer Gemeinde zeigen wir den Kreiswert und sagen das. */
function ClassSize({ facts, drill }: { facts: FactsFile; drill: DrillState }) {
  const kreisArea: FactArea | null = drill.kreis
    ? { level: 'kreis', id: drill.kreis.properties.id }
    : drill.regbez
      ? { level: 'regbez', id: drill.regbez.properties.id }
      : null;
  if (!kreisArea || !facts.eckdaten) return null;
  const values = areaFacts(facts, kreisArea);
  const nrw = areaFacts(facts, { level: 'nrw', id: 'nrw' });
  if (values.klassen == null) return null;
  return (
    <div>
      <p className="text-xs text-muted">
        Ø Schüler:innen je Klasse {facts.eckdaten.year}
        {drill.gemeinde && ' (Wert des Kreises)'}
      </p>
      <p className="flex items-baseline gap-2">
        <span className="text-xl font-bold tabular-nums">{formatSozial(values.klassen)}</span>
        {nrw.klassen != null && <span className="text-xs text-muted">NRW {formatSozial(nrw.klassen)}</span>}
      </p>
      {values.proLehrkraft != null && (
        <p className="text-[11px] text-muted">
          {formatSozial(values.proLehrkraft)} Schüler:innen je Lehrkraft (Personen, inkl. Teilzeit) ·
          allgemeinbildende Schulen
        </p>
      )}
    </div>
  );
}

function SchoolFacts({ facts, school }: { facts: FactsFile; school: School }) {
  const values = schoolFacts(facts, school.id, school.schoolForm);
  // Synthetische Demo-Schulen (ADR-013) haben keine amtlichen Werte
  if (values.stages.length === 0) return null;
  return (
    <section aria-label="Amtliche Daten" className="space-y-2 rounded-xl bg-subtle p-3 text-sm">
      <h3 className="flex items-center gap-1.5 font-semibold">
        <Landmark aria-hidden className="size-4" /> Amtliche Daten
      </h3>
      {
        <ul className="space-y-1 text-xs">
          <li className="text-muted">Ersatzloser Unterrichtsausfall {facts.untstat.year}</li>
          {values.stages.map((stage) => (
            <li key={stage.stage} className="flex items-baseline justify-between gap-2">
              <span>{STAGE_LABELS[stage.stage]}</span>
              <span className="tabular-nums">
                <span className="font-semibold">{formatPct(stage.ausfall)}</span>
                {stage.state != null && (
                  <span className="text-muted"> · Land gleiche Schulform {formatPct(stage.state)}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      }
      <p className="text-[11px] text-muted">
        Laut MSB sagt der Wert nichts über die Qualität der Arbeit an der Schule aus.{' '}
        <a
          href={schoolDatasheetUrl(school.id)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 font-semibold text-accent underline"
        >
          Original-Auswertung (MSB) <ExternalLink aria-hidden className="size-3" />
        </a>
      </p>
    </section>
  );
}

/** Echte Schulen der Stadt mit ihrem Ausfallwert und Link zum amtlichen Datenblatt. */
function SchoolList({ facts, drill }: { facts: FactsFile; drill: DrillState }) {
  const directory = useQuery({
    queryKey: ['schools', 'directory'],
    queryFn: loadSchoolDirectory,
    staleTime: Infinity,
    retry: false,
  });
  const inArea = (s: School) =>
    drill.gemeinde ? s.gemeindeId === drill.gemeinde.properties.id : s.kreisId === drill.kreis?.properties.id;
  const schools = (directory.data ?? [])
    .filter((s) => inArea(s) && facts.untstat.schools[s.id])
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  if (directory.isPending) return <p className="text-xs text-muted">Schulen laden …</p>;
  if (schools.length === 0) return null;
  return (
    <details>
      <summary className="cursor-pointer text-xs font-semibold">
        Schulen mit Unterrichtsstatistik ({schools.length})
      </summary>
      <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1 text-xs">
        {schools.map((school) => {
          const total = schoolFacts(facts, school.id, school.schoolForm).total;
          return (
            <li key={school.id} className="flex items-baseline justify-between gap-2">
              <a
                href={schoolDatasheetUrl(school.id)}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 truncate underline decoration-border underline-offset-2 hover:text-fg"
                title={`${school.name} · ${SCHOOL_FORM_LABELS[school.schoolForm]} · Datenblatt beim MSB`}
              >
                {school.name}
              </a>
              <span className="shrink-0 tabular-nums">{total == null ? '–' : formatPct(total)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-1 text-[11px] text-muted">Alphabetisch, bewusst keine Rangliste.</p>
    </details>
  );
}

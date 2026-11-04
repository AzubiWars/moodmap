/**
 * Amtliche Kennzahlen je Gebiet (#297): Unterrichtsstatistik und Schulsozialindex des MSB NRW, über
 * die Schulnummer an das Schulverzeichnis geknüpft und auf Gemeinde, Kreis, Regierungsbezirk und NRW summiert.
 * Keine Hochrechnung, keine Schätzung: Gebiete ohne Schulen mit Werten fehlen einfach.
 */
import type { DirectorySchool } from '../../src/types/domain.ts';
import type { FactsFile, UntstatCell } from '../../src/types/facts.ts';

export type Stage = 'primar' | 'sek1' | 'sek2';

export interface Hours {
  planned: number;
  regular: number;
  cancelled: number;
}

/** Eine Zeile aus dem Abruf der schulbezogenen Unterrichtsstatistik (eine Schule × Stufe). */
export interface UntstatRecord {
  id: string;
  stage: Stage;
  school: Hours;
  stateSameForm: Hours;
}

export interface SozialindexRecord {
  id: string;
  /** 1–9; `null` = „ohne“ Stufe */
  stufe: number | null;
}

/** Semikolon-CSV des MSB → Datensätze. Erwartet die Spalten `Schulnummer` und `Sozialindexstufe`. */
export function parseSozialindexCsv(text: string): SozialindexRecord[] {
  const [header, ...lines] = text.split(/\r?\n/).filter((line) => line.trim());
  const cols = header!.split(';');
  const idCol = cols.indexOf('Schulnummer');
  const stufeCol = cols.indexOf('Sozialindexstufe');
  if (idCol < 0 || stufeCol < 0) throw new Error('Sozialindex-CSV: Spalten fehlen');
  return lines.map((line) => {
    const cells = line.split(';');
    const stufe = Number(cells[stufeCol]);
    return {
      id: cells[idCol]!.trim(),
      stufe: Number.isInteger(stufe) && stufe >= 1 && stufe <= 9 ? stufe : null,
    };
  });
}

type Level = 'nrw' | 'regbez' | 'kreis' | 'gemeinde';

function areaIds(school: DirectorySchool): [Level, string][] {
  const ids: [Level, string][] = [
    ['nrw', 'nrw'],
    ['regbez', school.kreisId.slice(0, 3)],
    ['kreis', school.kreisId],
  ];
  if (school.gemeindeId) ids.push(['gemeinde', school.gemeindeId]);
  return ids;
}

const emptyCell = (): UntstatCell => [0, 0, 0, 0];

export function buildFacts(
  schools: readonly DirectorySchool[],
  untstat: readonly UntstatRecord[],
  sozialindex: readonly SozialindexRecord[],
  meta: { untstatYear: string; untstatStand: string; sozialindexYear: string },
): FactsFile {
  const byId = new Map(schools.map((s) => [s.id, s]));
  const facts: FactsFile = {
    untstat: { year: meta.untstatYear, stand: meta.untstatStand, areas: {}, schools: {}, stateByForm: {} },
    sozialindex: { year: meta.sozialindexYear, areas: {} },
  };
  const areas = facts.untstat.areas;
  const counted = new Set<string>();

  for (const record of untstat) {
    const school = byId.get(record.id);
    if (!school || record.school.planned <= 0) continue;
    const entry = (facts.untstat.schools[record.id] ??= {});
    entry[record.stage] = [record.school.planned, record.school.cancelled, record.school.regular];
    facts.untstat.stateByForm[`${school.schoolForm}:${record.stage}`] = [
      record.stateSameForm.planned,
      record.stateSameForm.cancelled,
      record.stateSameForm.regular,
    ];
    const firstStage = !counted.has(record.id);
    counted.add(record.id);
    for (const [level, id] of areaIds(school)) {
      const cell = ((areas[level] ??= {})[id] ??= emptyCell());
      cell[0] += record.school.planned;
      cell[1] += record.school.cancelled;
      cell[2] += record.school.regular;
      if (firstStage) cell[3] += 1;
    }
  }

  const soz = facts.sozialindex.areas;
  for (const record of sozialindex) {
    const school = byId.get(record.id);
    if (!school || record.stufe == null) continue;
    for (const [level, id] of areaIds(school)) {
      const cell = ((soz[level] ??= {})[id] ??= [0, 0]);
      cell[0] += record.stufe;
      cell[1] += 1;
    }
  }
  return facts;
}

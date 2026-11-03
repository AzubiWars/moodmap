/** Dry-run report (#268): only counts and row numbers, never cell contents (PRIVACY §9.6). */
import type { CanonicalAggregate, CanonicalResponse, CanonicalResult, ImportContext } from './canonical.ts';

export interface ImportReport {
  totalRows: number;
  accepted: number;
  rejected: number;
  /** Error code → count and the first row numbers. */
  errors: Record<string, { count: number; rows: number[] }>;
  warnings: Record<string, number>;
  critical: string[];
  waves: Record<string, number>;
  schools: number;
  /** Cells that will stay hidden on the map because they have fewer than K_MIN responses. */
  belowKMin: { schoolWave: { below: number; total: number }; kreisWave: { below: number; total: number } };
  /** Share of rejected rows that makes the run critical. */
  maxRejectRate: number;
}

const group = (rejections: { row: number; code: string }[]) => {
  const result: Record<string, { count: number; rows: number[] }> = {};
  for (const { row, code } of rejections) {
    const entry = (result[code] ??= { count: 0, rows: [] });
    entry.count += 1;
    if (entry.rows.length < 10) entry.rows.push(row);
  }
  return result;
};

export function buildReport(
  result: CanonicalResult<CanonicalResponse | CanonicalAggregate>,
  context: ImportContext,
  maxRejectRate = 0.1,
): ImportReport {
  const kreisOf = new Map(context.schools.map((s) => [s.id, s.kreisId]));
  const waves: Record<string, number> = {};
  const schoolWave = new Map<string, number>();
  const kreisWave = new Map<string, number>();
  const schools = new Set<string>();
  for (const row of result.rows) {
    waves[row.waveId] = (waves[row.waveId] ?? 0) + 1;
    if ('schoolId' in row) {
      schools.add(row.schoolId);
      const sw = `${row.schoolId}|${row.waveId}`;
      const kw = `${kreisOf.get(row.schoolId)}|${row.waveId}`;
      schoolWave.set(sw, (schoolWave.get(sw) ?? 0) + 1);
      kreisWave.set(kw, (kreisWave.get(kw) ?? 0) + 1);
    }
  }
  const below = (cells: Map<string, number>) => ({
    below: [...cells.values()].filter((n) => n < context.kMin).length,
    total: cells.size,
  });
  const critical = [...result.critical];
  // Cells dropped for K_MIN are privacy by design, not a profile problem.
  const failed = result.rejected.filter((r) => r.code !== 'below_k_min').length;
  const rate = result.totalRows ? failed / result.totalRows : 0;
  if (!critical.length && rate > maxRejectRate)
    critical.push(
      `${Math.round(rate * 100)} % der Zeilen abgelehnt (erlaubt: ${Math.round(maxRejectRate * 100)} %) – Profil prüfen`,
    );
  const warnings: Record<string, number> = {};
  for (const { code } of result.warnings) warnings[code] = (warnings[code] ?? 0) + 1;
  return {
    totalRows: result.totalRows,
    accepted: result.rows.length,
    rejected: result.rejected.length,
    errors: group(result.rejected),
    warnings,
    critical,
    waves: Object.fromEntries(Object.entries(waves).sort()),
    schools: schools.size,
    belowKMin: { schoolWave: below(schoolWave), kreisWave: below(kreisWave) },
    maxRejectRate,
  };
}

const ERROR_TEXT: Record<string, string> = {
  missing_external_id: 'Teilnahme-ID fehlt',
  duplicate_external_id: 'Teilnahme-ID doppelt',
  unknown_school: 'Schule unbekannt',
  invalid_date: 'Datum nicht lesbar',
  missing_date: 'Datum/Welle fehlt',
  invalid_wave: 'Welle nicht im Format JJJJ-Www',
  outside_period: 'Datum außerhalb des Quellen-Zeitraums',
  invalid_role: 'Rolle ungültig',
  invalid_grade_band: 'Stufe ungültig',
  question_not_for_role: 'Frage passt nicht zur Rolle',
  duplicate_question: 'Frage doppelt zugeordnet',
  invalid_value: 'Antwortwert nicht lesbar',
  value_out_of_range: 'Antwortwert außerhalb der Skala',
  value_not_on_scale: 'Antwortwert lässt sich nicht ganzzahlig auf 1–5 abbilden',
  invalid_choice: 'Auswahl-Option unbekannt',
  no_answers: 'keine einzige Antwort',
  invalid_level: 'Ebene ungültig',
  unknown_region: 'Region/Schule unbekannt',
  unknown_topic: 'Thema unbekannt',
  invalid_n: 'Teilnehmerzahl ungültig',
  below_k_min: `weniger als K_MIN Teilnahmen (Datenschutz, wird verworfen)`,
  invalid_score: 'Score nicht lesbar',
  score_out_of_range: 'Score außerhalb 0–100',
  invalid_distribution: 'Verteilung ungültig',
  duplicate_cell: 'Zelle doppelt',
};

export function formatReport(report: ImportReport): string {
  const lines = [
    `Zeilen: ${report.totalRows} · akzeptiert: ${report.accepted} · abgelehnt: ${report.rejected}`,
  ];
  if (report.schools) lines.push(`Schulen: ${report.schools}`);
  const waves = Object.entries(report.waves);
  if (waves.length) lines.push(`Wellen: ${waves.map(([id, n]) => `${id} (${n})`).join(', ')}`);
  const { schoolWave, kreisWave } = report.belowKMin;
  if (schoolWave.total)
    lines.push(
      `Unter K_MIN (bleiben auf der Karte ausgeblendet): ${schoolWave.below}/${schoolWave.total} Schul-Wellen, ${kreisWave.below}/${kreisWave.total} Kreis-Wellen`,
    );
  const errors = Object.entries(report.errors).sort((a, b) => b[1].count - a[1].count);
  if (errors.length) {
    lines.push('Abgelehnt:');
    for (const [code, { count, rows }] of errors)
      lines.push(
        `  ${count}× ${ERROR_TEXT[code] ?? code} (Zeilen ${rows.join(', ')}${count > rows.length ? ', …' : ''})`,
      );
  }
  const warnings = Object.entries(report.warnings);
  if (warnings.length) {
    lines.push('Hinweise:');
    for (const [code, count] of warnings)
      lines.push(
        code.startsWith('unmapped_column:')
          ? `  Spalte „${code.slice(16)}" wird nicht verwendet und verworfen`
          : `  ${count}× ${code}`,
      );
  }
  if (report.critical.length) {
    lines.push('KRITISCH – es wird nichts importiert:');
    for (const message of report.critical) lines.push(`  ✗ ${message}`);
  }
  return lines.join('\n');
}

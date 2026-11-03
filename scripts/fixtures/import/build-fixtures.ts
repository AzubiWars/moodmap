/**
 * Regenerates the synthetic import fixtures (#268, #273, #274). Deterministic; no real data.
 *   node scripts/fixtures/import/build-fixtures.ts
 * The CSV and XLSX workbook have the same content, plus a few deliberately invalid rows.
 */
import { writeFileSync } from 'node:fs';
import { createRandom } from '../../lib/schools.ts';
import { writeXlsx, type XlsxCell } from '../../lib/import/xlsx-write.ts';

const dir = new URL('./', import.meta.url);
const random = createRandom(268);
const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;
const SCHOOLS = ['900000', '900001', '900002', '900003', '900004'];
const DAYS = ['13.10.2026', '14.10.2026', '15.10.2026', '20.10.2026', '21.10.2026', '22.10.2026'];
const STRESS = ['Klausuren', 'Hausaufgaben', 'Noten/Zukunft', 'Eltern', 'Vergleich'];
const VOICE = ['Online', 'SV', 'Politik in der Schule', 'Jugendparlament'];

export const HEADER = [
  'Teilnahme-ID',
  'Schulnummer',
  'Datum',
  'Rolle',
  'Jahrgang',
  'Klasse',
  'F1_Gesamt',
  'F2_Belastung',
  'F3_Sicherheit',
  'F4_Mitsprache',
  'F5_Stressquellen',
  'F6_Freizeit',
  'F7_Beteiligung',
];

const rows: string[][] = [];
for (let i = 1; i <= 120; i += 1) {
  const grade = 5 + Math.floor(random() * 8);
  rows.push([
    `T-${String(i).padStart(4, '0')}`,
    pick(SCHOOLS),
    pick(DAYS),
    'S',
    String(grade),
    `${grade}${pick(['a', 'b', 'c'])}`,
    String(1 + Math.floor(random() * 5)),
    random() < 0.08 ? 'k.A.' : String(1 + Math.floor(random() * 5)),
    String(1 + Math.floor(random() * 5)),
    String(1 + Math.floor(random() * 5)),
    pick(STRESS),
    pick(['ja', 'nein']),
    [...new Set([pick(VOICE), pick(VOICE)])].join(', '),
  ]);
}
// Deliberately invalid rows: unknown school, unreadable date, value off the scale, duplicate ID.
rows.push(['T-9001', '123456', '14.10.2026', 'S', '8', '8a', '3', '3', '3', '3', 'Klausuren', 'ja', 'SV']);
rows.push(['T-9002', '900000', '31.02.2026', 'S', '8', '8a', '3', '3', '3', '3', 'Klausuren', 'ja', 'SV']);
rows.push(['T-9003', '900001', '14.10.2026', 'S', '8', '8a', '7', '3', '3', '3', 'Klausuren', 'ja', 'SV']);
rows.push(['T-0001', '900002', '14.10.2026', 'S', '8', '8a', '3', '3', '3', '3', 'Klausuren', 'ja', 'SV']);

const csv = [HEADER, ...rows]
  .map((r) => r.map((c) => (/[;"\n]/.test(c) ? `"${c.replaceAll('"', '""')}"` : c)).join(';'))
  .join('\n');
writeFileSync(new URL('beispiel.csv', dir), `${csv}\n`);

// Same content as a workbook: numbers as numbers, the date column as Excel serials, one formula
// (cached value) and the class column hidden – like real school exports.
const serial = (german: string) => {
  const [d, m, y] = german.split('.').map(Number);
  const time = Date.UTC(y!, m! - 1, d!);
  return Number.isNaN(time) ? german : time / 86_400_000 + 25569;
};
const cells: XlsxCell[][] = [
  HEADER,
  ...rows.map((r, i) => {
    const valid = !Number.isNaN(Date.UTC(0)) && /^\d{2}\.\d{2}\.\d{4}$/.test(r[2]!);
    const date = valid ? serial(r[2]!) : r[2]!;
    return r.map((c, col): XlsxCell => {
      if (col === 2)
        return typeof date === 'number' &&
          new Date((date - 25569) * 86_400_000).getUTCDate() === Number(r[2]!.slice(0, 2))
          ? date
          : r[2]!;
      if (col === 6 && i === 0) return { formula: `${c}*1`, value: Number(c) };
      return /^\d+$/.test(c) && col !== 1 ? Number(c) : c;
    });
  }),
];
writeFileSync(new URL('beispiel.xlsx', dir), writeXlsx('Antworten', cells, { hiddenColumns: [5] }));

// Provider aggregates (#274): Kreis level, scores on a 1–5 mean scale, one cell below K_MIN.
const aggregates = [
  ['Ebene', 'Region', 'Thema', 'Welle', 'Anzahl', 'Mittelwert', 'S1', 'S2', 'S3', 'S4', 'S5'],
  ['Kreis', '05111', 'Gesamt', '2026-W42', '48', '3,4', '', '', '', '', ''],
  ['Kreis', '05111', 'Gesamt', '2026-W43', '52', '3,1', '', '', '', '', ''],
  ['Kreis', '05111', 'Stress', '2026-W43', '52', '2,6', '9', '17', '13', '9', '4'],
  ['Kreis', '05111', 'Mitsprache', '2026-W43', '50', '2,9', '', '', '', '', ''],
  ['Kreis', '05111', 'Sicherheit', '2026-W43', '51', '3,8', '', '', '', '', ''],
  ['Kreis', '05315', 'Gesamt', '2026-W43', '61', '3,5', '', '', '', '', ''],
  ['Kreis', '05762', 'Gesamt', '2026-W43', '7', '2,0', '', '', '', '', ''],
];
writeFileSync(new URL('aggregate.csv', dir), `${aggregates.map((r) => r.join(';')).join('\n')}\n`);

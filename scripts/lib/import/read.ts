import { parseCsv } from './csv.ts';
import type { MappingProfile } from './mapping.ts';
import { readXlsx } from './xlsx.ts';

/** File → raw table by extension: .csv/.txt (UTF-8) or .xlsx (first or configured sheet). */
export function readTable(
  content: Buffer,
  extension: string,
  format: MappingProfile['format'] = {},
): string[][] {
  const ext = extension.toLowerCase();
  if (ext === '.xlsx') return readXlsx(content, { sheet: format.sheet });
  if (ext === '.csv' || ext === '.txt') return parseCsv(content.toString('utf8'), format.delimiter ?? 'auto');
  throw new Error(`Dateiformat ${extension} wird nicht unterstützt (CSV oder XLSX)`);
}

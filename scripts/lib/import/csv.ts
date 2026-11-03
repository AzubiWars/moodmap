/** RFC-4180 CSV (UTF-8, optional BOM) with `;`, `,` or tab as delimiter. Returns rows of raw strings. */
export type Delimiter = ';' | ',' | '\t';

/** Picks the delimiter that splits the header line into the most columns (outside quotes). */
export function detectDelimiter(text: string): Delimiter {
  const header = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? '';
  const counts = { ';': 0, ',': 0, '\t': 0 } as Record<Delimiter, number>;
  let quoted = false;
  for (const char of header) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char in counts) counts[char as Delimiter] += 1;
  }
  return (Object.entries(counts) as [Delimiter, number][]).sort((a, b) => b[1] - a[1])[0]![0];
}

export function parseCsv(text: string, delimiter: Delimiter | 'auto' = 'auto'): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const sep = delimiter === 'auto' ? detectDelimiter(source) : delimiter;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]!;
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === '') quoted = true;
    else if (char === sep) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (quoted) throw new Error('CSV: nicht geschlossenes Anführungszeichen');
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  // Trailing empty lines carry no data.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

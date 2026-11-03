/**
 * Minimal XLSX reader (#273) without a dependency: an .xlsx file is a ZIP of XML parts. We read the
 * central directory, inflate the parts we need with node:zlib and take the cached cell values, so
 * formulas yield their last computed result. Hidden rows/columns are read like visible ones (the
 * mapping profile addresses columns by header). Returns rows of raw strings, like parseCsv.
 */
import { inflateRawSync } from 'node:zlib';

function unzip(buffer: Buffer): Map<string, Buffer> {
  // End of central directory record: signature 0x06054b50, searched from the end (comment ≤ 64 KiB).
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 0xffff); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('XLSX: keine gültige ZIP-Datei');
  const entries = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const files = new Map<string, Buffer>();
  for (let n = 0; n < entries; n += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('XLSX: beschädigtes Inhaltsverzeichnis');
    const method = buffer.readUInt16LE(offset + 10);
    const compressed = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const local = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    const dataStart = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(dataStart, dataStart + compressed);
    if (method === 0) files.set(name, data);
    else if (method === 8) files.set(name, inflateRawSync(data));
    else throw new Error(`XLSX: Kompressionsmethode ${method} nicht unterstützt`);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

const decode = (text: string) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&');

/** Concatenated text of all <t> runs (rich text has several). */
const textOf = (xml: string) =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1]!)).join('');

const columnIndex = (ref: string) => {
  let index = 0;
  for (const char of /^[A-Z]+/.exec(ref)![0]) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
};

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

export interface XlsxOptions {
  /** Sheet name; default the first sheet. */
  sheet?: string;
}

export function readXlsx(buffer: Buffer, options: XlsxOptions = {}): string[][] {
  const files = unzip(buffer);
  const part = (name: string) => files.get(name)?.toString('utf8');
  const workbook = part('xl/workbook.xml');
  if (!workbook) throw new Error('XLSX: xl/workbook.xml fehlt');
  const sheets = [...workbook.matchAll(/<sheet\s[^>]*>/g)].map((m) => ({
    name: decode(attr(m[0], 'name') ?? ''),
    rid: attr(m[0], 'r:id') ?? '',
  }));
  const sheet = options.sheet ? sheets.find((s) => s.name === options.sheet) : sheets[0];
  if (!sheet) throw new Error(`XLSX: Tabellenblatt „${options.sheet}" nicht gefunden`);
  const rels = part('xl/_rels/workbook.xml.rels') ?? '';
  const target = [...rels.matchAll(/<Relationship\s[^>]*>/g)]
    .map((m) => m[0])
    .find((tag) => attr(tag, 'Id') === sheet.rid);
  const path = target ? `xl/${attr(target, 'Target')!.replace(/^\/?xl\//, '')}` : 'xl/worksheets/sheet1.xml';
  const xml = part(path);
  if (!xml) throw new Error(`XLSX: ${path} fehlt`);
  const shared = [...(part('xl/sharedStrings.xml') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    textOf(m[1]!),
  );

  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>|<row\b[^>]*\/>/g)) {
    const index = Number(attr(rowMatch[0], 'r') ?? rows.length + 1) - 1;
    const cells: string[] = [];
    for (const cell of (rowMatch[1] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(`<c${cell[1]}>`, 'r');
      const type = attr(`<c${cell[1]}>`, 't');
      const body = cell[2] ?? '';
      const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value: string;
      if (type === 's') value = raw === undefined ? '' : (shared[Number(raw)] ?? '');
      else if (type === 'inlineStr') value = textOf(body);
      else if (type === 'b') value = raw === '1' ? 'TRUE' : raw === '0' ? 'FALSE' : '';
      else if (type === 'e') value = '';
      else value = raw === undefined ? '' : decode(raw);
      cells[ref ? columnIndex(ref) : cells.length] = value;
    }
    rows[index] = Array.from(cells, (c) => c ?? '');
  }
  return Array.from(rows, (r) => r ?? []).filter((r) => r.some((cell) => cell.trim() !== ''));
}

/** Excel date serial (1900 system) → `YYYY-MM-DD`. */
export function excelSerialToIso(serial: number): string {
  return new Date(Math.round((serial - 25569) * 86_400_000)).toISOString().slice(0, 10);
}

/**
 * Tiny XLSX writer for synthetic test workbooks (#273): one sheet, shared strings, numbers, a cached
 * formula and an optionally hidden column. Never used for real data.
 */
import { deflateRawSync } from 'node:zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (data: Buffer) => {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

function zip(files: [string, string][]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of files) {
    const data = Buffer.from(content, 'utf8');
    const packed = deflateRawSync(data);
    const nameBytes = Buffer.from(name, 'utf8');
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(crc32(data), 14);
    header.writeUInt32LE(packed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc32(data), 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(header, nameBytes, packed);
    centrals.push(central, nameBytes);
    offset += header.length + nameBytes.length + packed.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ref = (col: number, row: number) => {
  let name = '';
  for (let n = col + 1; n > 0; n = Math.floor((n - 1) / 26))
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return `${name}${row + 1}`;
};

export type XlsxCell = string | number | null | { formula: string; value: number };

export function writeXlsx(
  sheetName: string,
  rows: XlsxCell[][],
  options: { hiddenColumns?: number[] } = {},
): Buffer {
  const strings: string[] = [];
  const stringIndex = (text: string) => {
    const index = strings.indexOf(text);
    return index >= 0 ? index : strings.push(text) - 1;
  };
  const body = rows
    .map(
      (cells, r) =>
        `<row r="${r + 1}">${cells
          .map((cell, c) => {
            if (cell === null || cell === '') return '';
            if (typeof cell === 'number') return `<c r="${ref(c, r)}"><v>${cell}</v></c>`;
            if (typeof cell === 'object')
              return `<c r="${ref(c, r)}"><f>${escape(cell.formula)}</f><v>${cell.value}</v></c>`;
            return `<c r="${ref(c, r)}" t="s"><v>${stringIndex(cell)}</v></c>`;
          })
          .join('')}</row>`,
    )
    .join('');
  const cols = (options.hiddenColumns ?? [])
    .map((c) => `<col min="${c + 1}" max="${c + 1}" hidden="1" width="0"/>`)
    .join('');
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  return zip([
    [
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`,
    ],
    [
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      'xl/workbook.xml',
      `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="${escape(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ],
    [
      'xl/_rels/workbook.xml.rels',
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
    ],
    [
      'xl/worksheets/sheet1.xml',
      `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}">${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${body}</sheetData></worksheet>`,
    ],
    [
      'xl/sharedStrings.xml',
      `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="${ns}" count="${strings.length}" uniqueCount="${strings.length}">${strings.map((s) => `<si><t xml:space="preserve">${escape(s)}</t></si>`).join('')}</sst>`,
    ],
  ]);
}

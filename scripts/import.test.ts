// @vitest-environment node
// Import adapters, mapping profiles and the dry-run report (#268, #273).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTIONS, TOPICS } from '../src/data/topics.ts';
import type { School } from '../src/types/domain.ts';
import { toCanonicalAggregates, toCanonicalResponses, type ImportContext } from './lib/import/canonical.ts';
import { parseCsv } from './lib/import/csv.ts';
import { parseMapping, type AggregateMapping, type ResponseMapping } from './lib/import/mapping.ts';
import { buildReport } from './lib/import/report.ts';
import { readXlsx } from './lib/import/xlsx.ts';
import { writeXlsx } from './lib/import/xlsx-write.ts';

const fixture = (name: string) => new URL(`./fixtures/import/${name}`, import.meta.url);
const schools = JSON.parse(
  readFileSync(new URL('../public/data/schools.json', import.meta.url), 'utf8'),
) as School[];
const context: ImportContext = { schools, questions: QUESTIONS, topics: TOPICS, kMin: 10 };
const profile = parseMapping(
  JSON.parse(readFileSync(fixture('beispiel.mapping.json'), 'utf8')),
) as ResponseMapping;
const csvTable = parseCsv(readFileSync(fixture('beispiel.csv'), 'utf8'));

describe('CSV adapter', () => {
  it('handles BOM, quotes, escaped quotes, CRLF and detects the delimiter', () => {
    expect(parseCsv('﻿a;b\r\n"x;1";"say ""hi"""\r\n\r\n')).toEqual([
      ['a', 'b'],
      ['x;1', 'say "hi"'],
    ]);
    expect(parseCsv('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(parseCsv('a\tb\n1\t2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(() => parseCsv('a;b\n"open;1')).toThrow(/Anführungszeichen/);
  });
});

describe('XLSX adapter (#273)', () => {
  it('reads shared strings, numbers, cached formula values, hidden columns and gaps', () => {
    const book = writeXlsx(
      'Daten',
      [
        ['A', 'B', 'C'],
        ['x', { formula: 'B3*2', value: 4 }, 7],
        [null, 'y', null],
      ],
      {
        hiddenColumns: [1],
      },
    );
    expect(readXlsx(book, { sheet: 'Daten' })).toEqual([
      ['A', 'B', 'C'],
      ['x', '4', '7'],
      ['', 'y'],
    ]);
    expect(() => readXlsx(book, { sheet: 'Fehlt' })).toThrow(/nicht gefunden/);
    expect(() => readXlsx(Buffer.from('kein zip'))).toThrow(/ZIP/);
  });

  it('yields the same canonical rows as the CSV with the same content', () => {
    const xlsxTable = readXlsx(readFileSync(fixture('beispiel.xlsx')), { sheet: 'Antworten' });
    const fromCsv = toCanonicalResponses(csvTable, profile, context);
    const fromXlsx = toCanonicalResponses(xlsxTable, profile, context);
    expect(fromXlsx.rows).toEqual(fromCsv.rows);
    expect(fromXlsx.rejected).toEqual(fromCsv.rejected);
  });
});

describe('mapping profile', () => {
  it('rejects incomplete profiles with a readable message', () => {
    expect(() => parseMapping({})).toThrow(/`id`/);
    expect(() => parseMapping({ id: 'x-1', version: 1, columns: {} })).toThrow(/externalId/);
    expect(() =>
      parseMapping({
        ...profile,
        questions: [{ column: 'F1', questionId: 'overall.core', scale: { min: 5, max: 1 } }],
      }),
    ).toThrow(/min < max/);
  });

  it('maps the fixture: reverse scale, grades → bands, choices, swipe values, ISO week', () => {
    const { rows, rejected, critical } = toCanonicalResponses(csvTable, profile, context);
    expect(critical).toEqual([]);
    expect(rows).toHaveLength(120);
    expect(rejected.map((r) => r.code).sort()).toEqual(
      ['duplicate_external_id', 'invalid_date', 'unknown_school', 'value_out_of_range'].sort(),
    );
    const first = rows[0]!;
    const raw = csvTable[1]!;
    expect(first).toMatchObject({
      externalId: 'T-0001',
      schoolId: raw[1],
      role: 'student',
      date: '2026-10-21',
      waveId: '2026-W43',
    });
    expect(first.gradeBand).toBe('oberstufe'); // Jahrgang 12
    expect(first.answers).toContainEqual({ questionId: 'stress.core', value: 6 - Number(raw[7]) });
    expect(first.answers).toContainEqual({
      questionId: 'stress.swipe.freetime',
      value: raw[11] === 'ja' ? 1 : 0,
    });
    // External IDs exist only in memory; the Klasse column never reaches a row.
    expect(JSON.stringify(rows)).not.toMatch(/"\d+[abc]"/);
  });

  it('treats personal-data columns that are not dropped as critical', () => {
    const table = csvTable.map((r, i) => [...r, i === 0 ? 'E-Mail' : 'x@example.org']);
    const result = toCanonicalResponses(table, profile, context);
    expect(result.critical.join()).toMatch(/E-Mail.*drop/);
    expect(result.rows).toEqual([]);
    const withoutDrop = toCanonicalResponses(csvTable, { ...profile, drop: [] }, context);
    expect(withoutDrop.critical.join()).toMatch(/Klasse/);
  });

  it('rescales other scales and rejects values that do not land on 1–5', () => {
    const table = [
      ['id', 'school', 'wave', 'v'],
      ['1', '900000', '2026-W43', '0'],
      ['2', '900000', '2026-W43', '10'],
      ['3', '900000', '2026-W43', '3'],
    ];
    const mapping = parseMapping({
      id: 'skala',
      version: 1,
      columns: {
        externalId: 'id',
        school: { column: 'school' },
        wave: { column: 'wave' },
        role: { default: 'student' },
      },
      questions: [{ column: 'v', questionId: 'overall.core', scale: { min: 0, max: 10 } }],
    }) as ResponseMapping;
    const { rows, rejected } = toCanonicalResponses(table, mapping, context);
    expect(rows.map((r) => r.answers[0])).toEqual([
      { questionId: 'overall.core', value: 1 },
      { questionId: 'overall.core', value: 5 },
    ]);
    expect(rejected).toEqual([{ row: 4, code: 'value_not_on_scale' }]);
  });

  it('rejects rows outside the source period', () => {
    const result = toCanonicalResponses(csvTable, profile, { ...context, period: { start: '2026-10-19' } });
    expect(result.rows.every((r) => r.date! >= '2026-10-19')).toBe(true);
    expect(result.rejected.some((r) => r.code === 'outside_period')).toBe(true);
  });
});

describe('provider aggregates (#274)', () => {
  const mapping = parseMapping(
    JSON.parse(readFileSync(fixture('aggregate.mapping.json'), 'utf8')),
  ) as AggregateMapping;
  it('maps scores onto 0–100, keeps delivered distributions and drops cells below K_MIN', () => {
    const table = parseCsv(readFileSync(fixture('aggregate.csv'), 'utf8'));
    const { rows, rejected } = toCanonicalAggregates(table, mapping, context);
    expect(rejected).toEqual([{ row: 8, code: 'below_k_min' }]);
    expect(rows[1]).toEqual({
      row: 3,
      level: 'kreis',
      regionId: '05111',
      topic: 'all',
      waveId: '2026-W43',
      n: 52,
      score: 52.5,
      distribution: null,
    });
    expect(rows[2]!.distribution).toEqual([9, 17, 13, 9, 4]);
  });
});

describe('dry-run report', () => {
  it('counts errors by code without cell contents and flags K_MIN cells', () => {
    const report = buildReport(toCanonicalResponses(csvTable, profile, context), context);
    expect(report).toMatchObject({ totalRows: 124, accepted: 120, rejected: 4, critical: [], schools: 5 });
    expect(report.errors.unknown_school).toEqual({ count: 1, rows: [122] });
    expect(report.belowKMin.schoolWave.total).toBe(10);
    expect(JSON.stringify(report)).not.toContain('123456');
  });

  it('is critical when too many rows fail', () => {
    const broken = csvTable.map((r, i) => (i === 0 ? r : [r[0]!, '000000', ...r.slice(2)]));
    expect(
      buildReport(toCanonicalResponses(broken, profile, context), context).critical.length,
    ).toBeGreaterThan(0);
  });

  it('the CLI dry-run needs no credentials, writes nothing and exits 0', () => {
    const output = execFileSync(
      process.execPath,
      [
        'scripts/import-survey.ts',
        '--file',
        'scripts/fixtures/import/beispiel.csv',
        '--mapping',
        'scripts/fixtures/import/beispiel.mapping.json',
        '--source',
        'test',
        '--synthetic',
      ],
      { encoding: 'utf8', env: { PATH: process.env.PATH ?? '' } },
    );
    expect(output).toMatch(/Dry-Run: nichts geschrieben/);
  });
});

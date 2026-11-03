/**
 * Survey import CLI (#268, #271, #273, #274, ADR-018). Dry-run is the default and never connects to
 * a database. Usage: docs/IMPORT.md.
 *
 *   npm run data:import -- --file imports/x.csv --mapping imports/x.mapping.json --source schule-2026
 *   npm run data:import -- … --commit --label "Schulbefragung 2026" --visibility ministry
 *   npm run data:import -- --rollback <import_run_id>
 *   npm run data:import -- --activate <source_id>
 */
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { parseArgs } from 'node:util';
import { QUESTIONS, TOPICS } from '../src/data/topics.ts';
import type { School } from '../src/types/domain.ts';
import { toCanonicalAggregates, toCanonicalResponses, type ImportContext } from './lib/import/canonical.ts';
import { commitImport, fileSha256, supabaseImportRpc } from './lib/import/commit.ts';
import { readTable } from './lib/import/read.ts';
import { parseMapping } from './lib/import/mapping.ts';
import { buildReport, formatReport } from './lib/import/report.ts';

const { values } = parseArgs({
  options: {
    file: { type: 'string' },
    mapping: { type: 'string' },
    source: { type: 'string' },
    commit: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    rollback: { type: 'string' },
    activate: { type: 'string' },
    label: { type: 'string' },
    visibility: { type: 'string', default: 'ministry' },
    'period-start': { type: 'string' },
    'period-end': { type: 'string' },
    'max-reject-rate': { type: 'string', default: '0.1' },
    importer: { type: 'string', default: process.env.USER ?? 'unbekannt' },
    synthetic: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
  },
});

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

function rpc() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in .env.local setzen (nie committen).');
    process.exit(2);
  }
  return supabaseImportRpc(url, key);
}

if (values.rollback) {
  console.log(JSON.stringify(await rpc()('import_rollback', { run_id: values.rollback })));
  process.exit(0);
}
if (values.activate) {
  console.log(
    JSON.stringify(await rpc()('import_set_source_status', { source_id: values.activate, status: 'active' })),
  );
  process.exit(0);
}

if (!values.file || !values.mapping || !values.source) {
  console.error(
    'Aufruf: npm run data:import -- --file <csv|xlsx> --mapping <profil.json> --source <id> [--commit]',
  );
  process.exit(2);
}

const profile = parseMapping(JSON.parse(readFileSync(values.mapping, 'utf8')));
const content = readFileSync(values.file);
const table = readTable(content, extname(values.file), profile.format);
const schools = JSON.parse(
  readFileSync(values.synthetic ? 'public/data/schools.json' : 'public/data/schools.real.json', 'utf8'),
) as School[];
const context: ImportContext = {
  schools: schools.filter((s) => !s.isTest),
  questions: QUESTIONS,
  topics: TOPICS,
  kMin: 10,
  period: { start: values['period-start'], end: values['period-end'] },
};
const result =
  profile.granularity === 'aggregate'
    ? toCanonicalAggregates(table, profile, context)
    : toCanonicalResponses(table, profile, context);
const report = buildReport(result, context, Number(values['max-reject-rate']));
console.log(values.json ? JSON.stringify(report, null, 2) : formatReport(report));

if (report.critical.length) process.exit(1);
if (!values.commit) {
  console.log('\nDry-Run: nichts geschrieben. Mit --commit importieren.');
  process.exit(0);
}

const client = rpc();
await client('import_upsert_source', {
  input: {
    id: values.source,
    label: values.label ?? values.source,
    visibility: values.visibility,
    periodStart: values['period-start'] ?? null,
    periodEnd: values['period-end'] ?? null,
  },
});
const committed = await commitImport(client, {
  sourceId: values.source,
  profile,
  rows: result.rows as never,
  report,
  fileHash: fileSha256(content),
  importer: values.importer,
  salt: process.env.MOODMAP_IMPORT_SALT,
});
console.log(
  `\nImportiert: ${committed.inserted} neu, ${committed.skipped} schon vorhanden. Lauf ${committed.runId}.` +
    `\nQuelle ist ein Entwurf. Nach der Prüfung: npm run data:import -- --activate ${values.source}` +
    `\nZurückrollen: npm run data:import -- --rollback ${committed.runId}`,
);

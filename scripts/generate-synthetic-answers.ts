/** Explicit, local artifact generation only. Does not connect to Supabase or read credentials. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { generateSeedData } from '../src/data/seed/generateSeed.ts';
import { loadSeedSources } from './lib/supabase-seed.ts';
import { buildSyntheticAnswerSql } from './lib/synthetic-answer-seed.ts';

const args = process.argv.slice(2);
if (args[0] !== '--synthetic-demo' || args.length > 2) {
  throw new Error('Aufruf: npm run db:seed:answers -- --synthetic-demo [Ausgabedatei.sql]');
}
const schools = loadSeedSources().schools;
const data = generateSeedData([...schools]);
const output = resolve(args[1] ?? '.cache/synthetic-answers.sql');
const sql = buildSyntheticAnswerSql(data, schools);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, sql, { mode: 0o600 });
console.log(
  `Synthetischer Demo-Import erzeugt: ${output} (${data.responses.length} Teilnahmen). Kein Upload ausgeführt.`,
);

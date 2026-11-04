/**
 * Baut `public/data/facts.json` aus den amtlichen Rohdaten in `scripts/data/` (#297).
 * - `untstat-2024-25.jsonl`: schulbezogene Unterrichtsstatistik, abgerufen aus dem Bildungsportal
 *   („Schule suchen“, je Schule die PDF „Untstat Auswertung“), Jahressummen je Stufe
 * - `eckdaten-schuldaten-2025-26.csv`: Eckdaten der Amtlichen Schuldaten je Kreis (Open.NRW, dl-de/by-2-0)
 * - `sozialindex-2025-26.csv`: schulscharfer Sozialindex, Open.NRW (dl-de/by-2-0), von cp850 nach UTF-8 umkodiert
 * Usage: npm run data:facts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { DirectorySchool } from '../src/types/domain.ts';
import { buildEckdaten, buildFacts, parseSozialindexCsv, type UntstatRecord } from './lib/facts.ts';

const file = (path: string) => new URL(`../${path}`, import.meta.url);

const schools = JSON.parse(readFileSync(file('public/data/schools.real.json'), 'utf8')) as DirectorySchool[];
const untstat = readFileSync(file('scripts/data/untstat-2024-25.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line) as UntstatRecord & { stand?: string; error?: string; none?: boolean })
  .filter((r) => r.school && r.stateSameForm);
const sozial = parseSozialindexCsv(readFileSync(file('scripts/data/sozialindex-2025-26.csv'), 'utf8'));

const stand = untstat.find((r) => r.stand)?.stand ?? '';
const facts = buildFacts(schools, untstat, sozial, {
  untstatYear: '2024/25',
  untstatStand: stand,
  sozialindexYear: '2025/26',
});
facts.eckdaten = buildEckdaten(
  readFileSync(file('scripts/data/eckdaten-schuldaten-2025-26.csv'), 'utf8'),
  '2025',
);
writeFileSync(file('public/data/facts.json'), JSON.stringify(facts));

const nrw = facts.untstat.areas.nrw?.nrw;
console.log(
  `Unterrichtsstatistik: ${Object.keys(facts.untstat.schools).length} Schulen, NRW ersatzlos ${
    nrw ? ((100 * nrw[1]) / nrw[0]).toFixed(2) : '–'
  } %`,
);
console.log(`Sozialindex: ${facts.sozialindex.areas.nrw?.nrw?.[1] ?? 0} Schulen zugeordnet`);
const eck = facts.eckdaten.areas.nrw?.nrw;
console.log(
  `Eckdaten ${facts.eckdaten.year}: ${eck ? (eck[0] / eck[1]).toFixed(1) : '–'} Schüler:innen je Klasse (NRW)`,
);

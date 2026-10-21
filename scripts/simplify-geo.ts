/**
 * Builds the NRW boundary files for the map (#6):
 *   public/geo/nrw-kreise.geojson  – 53 Kreise & kreisfreie Städte { id (AGS), name, regbez_id, type }
 *   public/geo/nrw-regbez.geojson  – 5 Regierungsbezirke { id, name }
 *
 * Source: BKG "Verwaltungsgebiete 1:250 000" (VG250, Ebenen, Stand 01.01.), © BKG, dl-de/by-2-0.
 * Regierungsbezirke are dissolved from the simplified Kreise, so both layers share identical borders.
 *
 * Usage: npm run geo:build   (downloads ~67 MB once into .cache/geo, output is committed)
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VG250_URL =
  'https://daten.gdz.bkg.bund.de/produkte/vg/vg250_ebenen_0101/aktuell/vg250_01-01.utm32s.shape.ebenen.zip';
const MAPSHAPER_VERSION = '0.7.93';
const SIMPLIFY_INTERVAL_M = 100;
const COORD_PRECISION = 0.0001; // ~10 m

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, '.cache', 'geo');
const outDir = join(root, 'public', 'geo');
const zipPath = join(cacheDir, 'vg250.zip');
const toolsDir = join(cacheDir, `mapshaper-${MAPSHAPER_VERSION}`);
const mapshaperBin = join(toolsDir, 'node_modules', 'mapshaper', 'bin', 'mapshaper');

// Always spawn node itself (no shell), so arguments with spaces/quotes behave the same on Windows and Linux.
function runNode(args: string[]): void {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`node ${args[0]} failed with exit code ${result.status}`);
}

async function downloadVg250(): Promise<void> {
  const expectedMd5 = (await (await fetch(`${VG250_URL}.md5`)).text()).trim().split(/\s+/)[0];
  if (existsSync(zipPath) && md5(zipPath) === expectedMd5) return;

  console.log(`Downloading ${VG250_URL} …`);
  const res = await fetch(VG250_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  if (md5(zipPath) !== expectedMd5) throw new Error('VG250 checksum mismatch');
}

function md5(path: string): string {
  return createHash('md5').update(readFileSync(path)).digest('hex');
}

function installMapshaper(): void {
  if (existsSync(mapshaperBin)) return;
  // Not a devDependency on purpose: its dependency tree is large and only needed for this one-off build.
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('Run this script via `npm run geo:build`');
  runNode([
    npmCli,
    'install',
    '--prefix',
    toolsDir,
    '--no-save',
    '--no-audit',
    '--no-fund',
    `mapshaper@${MAPSHAPER_VERSION}`,
  ]);
}

function buildGeoJson(): void {
  const out = (file: string) => join(outDir, file);
  const kreisType = 'BEZ === "Kreisfreie Stadt" ? "kreisfreie_stadt" : "kreis"';
  // One mapshaper command per line.
  const commands = [
    ['-i', zipPath, 'encoding=utf8'],
    ['-target', 'VG250_KRS'],
    ['-filter', 'SN_L === "05" && GF === 4'], // NRW, land areas only
    ['-proj', 'wgs84', 'target=VG250_KRS'],
    ['-each', `id = AGS, name = GEN, regbez_id = AGS.slice(0, 3), type = ${kreisType}`],
    ['-filter-fields', 'id,name,regbez_id,type'],
    ['-simplify', `interval=${SIMPLIFY_INTERVAL_M}`, 'keep-shapes'],
    ['-rename-layers', 'kreise'],
    ['-dissolve', 'regbez_id', '+', 'name=regbez'],
    ['-join', 'target=regbez', 'source=VG250_RBZ', 'keys=regbez_id,AGS', 'fields=GEN'],
    ['-each', 'target=regbez', 'id = regbez_id, name = GEN'],
    ['-filter-fields', 'target=regbez', 'id,name'],
    ['-o', 'target=kreise', out('nrw-kreise.geojson'), 'rfc7946', `precision=${COORD_PRECISION}`],
    ['-o', 'target=regbez', out('nrw-regbez.geojson'), 'rfc7946', `precision=${COORD_PRECISION}`],
  ];
  runNode([mapshaperBin, ...commands.flat()]);
}

mkdirSync(cacheDir, { recursive: true });
mkdirSync(outDir, { recursive: true });
await downloadVg250();
installMapshaper();
buildGeoJson();

for (const file of ['nrw-kreise.geojson', 'nrw-regbez.geojson']) {
  console.log(`${file}: ${(statSync(join(outDir, file)).size / 1024).toFixed(0)} KB`);
}

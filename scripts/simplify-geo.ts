/**
 * Builds the NRW geo base data from BKG open data (#6, #7):
 *   public/geo/nrw-kreise.geojson    – 53 Kreise & kreisfreie Städte { id (AGS), name, regbez_id, type }
 *   public/geo/nrw-regbez.geojson    – 5 Regierungsbezirke { id, name }
 *   scripts/data/nrw-gemeinden.json  – 396 Gemeinden { ags, name, kreisId, population, areaKm2, lon, lat }
 *                                      (input for scripts/generate-schools.ts, not shipped to the app)
 *
 * Sources (© BKG, dl-de/by-2-0):
 *   VG250    "Verwaltungsgebiete 1:250 000", Ebenen, Stand 01.01. → boundaries
 *   VG250-EW same with population (Einwohnerzahl), Stand 31.12.   → Gemeinden
 * Regierungsbezirke are dissolved from the simplified Kreise, so both layers share identical borders.
 *
 * Usage: npm run geo:build   (downloads ~2 × 67 MB once into .cache/geo, output is committed)
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BKG_VG = 'https://daten.gdz.bkg.bund.de/produkte/vg';
const VG250_URL = `${BKG_VG}/vg250_ebenen_0101/aktuell/vg250_01-01.utm32s.shape.ebenen.zip`;
const VG250_EW_URL = `${BKG_VG}/vg250-ew_ebenen_1231/aktuell/vg250-ew_12-31.utm32s.shape.ebenen.zip`;
const MAPSHAPER_VERSION = '0.7.93';
const SIMPLIFY_INTERVAL_M = 100;
const COORD_PRECISION = 0.0001; // ~10 m

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, '.cache', 'geo');
const outDir = join(root, 'public', 'geo');
const gemeindenPath = join(root, 'scripts', 'data', 'nrw-gemeinden.json');
const toolsDir = join(cacheDir, `mapshaper-${MAPSHAPER_VERSION}`);
const mapshaperBin = join(toolsDir, 'node_modules', 'mapshaper', 'bin', 'mapshaper');

// Always spawn node itself (no shell), so arguments with spaces/quotes behave the same on Windows and Linux.
function runNode(args: string[]): void {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`node ${args[0]} failed with exit code ${result.status}`);
}

/** Downloads a BKG archive into the cache. Verified via the `.md5` file, or via size where BKG has none. */
async function downloadBkg(url: string, fileName: string): Promise<string> {
  const zipPath = join(cacheDir, fileName);
  const md5Res = await fetch(`${url}.md5`);
  const expectedMd5 = md5Res.ok ? (await md5Res.text()).trim().split(/\s+/)[0] : null;
  const expectedSize = Number((await fetch(url, { method: 'HEAD' })).headers.get('content-length'));
  const isValid = () =>
    existsSync(zipPath) &&
    (expectedMd5 ? md5(zipPath) === expectedMd5 : statSync(zipPath).size === expectedSize);
  if (isValid()) return zipPath;

  console.log(`Downloading ${url} …`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  if (!isValid()) throw new Error(`${fileName}: checksum/size mismatch`);
  return zipPath;
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

/** One mapshaper command per inner array. */
function runMapshaper(commands: string[][]): void {
  runNode([mapshaperBin, ...commands.flat()]);
}

function buildBoundaries(zipPath: string): void {
  const out = (file: string) => join(outDir, file);
  const kreisType = 'BEZ === "Kreisfreie Stadt" ? "kreisfreie_stadt" : "kreis"';
  runMapshaper([
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
  ]);
}

function buildGemeinden(zipPath: string): void {
  const round5 = (v: string) => `Math.round(${v} * 1e5) / 1e5`; // ~1 m
  runMapshaper([
    ['-i', zipPath, 'encoding=utf8'],
    ['-target', 'VG250_GEM'],
    ['-filter', 'SN_L === "05" && GF === 4'],
    ['-each', 'areaKm2 = Math.round(this.area / 1e4) / 100'], // planar area in UTM32 (m²)
    ['-points', 'inner'], // guaranteed to lie inside the Gemeinde, unlike the centroid
    ['-proj', 'wgs84'],
    [
      '-each',
      `ags = AGS, name = GEN, kreisId = AGS.slice(0, 5), population = EWZ, lon = ${round5('this.x')}, lat = ${round5('this.y')}`,
    ],
    ['-filter-fields', 'ags,name,kreisId,population,areaKm2,lon,lat'],
    ['-sort', 'ags'],
    ['-o', gemeindenPath, 'format=json'],
  ]);
}

mkdirSync(cacheDir, { recursive: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(join(root, 'scripts', 'data'), { recursive: true });
const vg250Zip = await downloadBkg(VG250_URL, 'vg250.zip');
const vg250EwZip = await downloadBkg(VG250_EW_URL, 'vg250-ew.zip');
installMapshaper();
buildBoundaries(vg250Zip);
buildGemeinden(vg250EwZip);

for (const path of [join(outDir, 'nrw-kreise.geojson'), join(outDir, 'nrw-regbez.geojson'), gemeindenPath]) {
  console.log(`${path.slice(root.length)}: ${(statSync(path).size / 1024).toFixed(0)} KB`);
}

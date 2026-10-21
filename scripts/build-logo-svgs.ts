/**
 * Writes the static logo SVGs (#91) from the same markup the app uses (src/components/brand/logoMarkup.ts):
 *   public/brand/logo-<variant>.svg           – Kachel mit Rundung (Favicon, Header)
 *   public/brand/logo-<variant>-maskable.svg  – vollflächig, Umriss in der Safe-Zone (Maskable-Icon)
 * Run `node scripts/build-nrw-outline.ts` first if the outline changed.
 *
 * Usage: node scripts/build-logo-svgs.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LOGO_HEX, logoSvg, type LogoVariant } from '../src/components/brand/logoMarkup.ts';

const outDir = fileURLToPath(new URL('../public/brand/', import.meta.url));
mkdirSync(outDir, { recursive: true });

for (const variant of ['smiley', 'handshake'] as LogoVariant[]) {
  writeFileSync(`${outDir}logo-${variant}.svg`, logoSvg(variant, LOGO_HEX));
  // Safe-Zone: Kreis mit 80 % Durchmesser → Umriss + Gesicht bleiben innerhalb von ~0.62 der Kachel.
  writeFileSync(`${outDir}logo-${variant}-maskable.svg`, logoSvg(variant, LOGO_HEX, { scale: 0.62, rx: 0 }));
}

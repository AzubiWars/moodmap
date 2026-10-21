import { NRW_OUTLINE_PATH } from './nrwOutline.ts';

export type LogoVariant = 'smiley' | 'handshake';

export interface LogoColors {
  tile: string;
  shape: string;
  ink: string;
}

/** Hex-Werte = Tokens aus src/index.css (mood-5 / mood-3, Tinte = fg im Light Theme); für statische SVGs ohne CSS-Variablen. */
export const LOGO_HEX: LogoColors = { tile: '#2B78B8', shape: '#F6D365', ink: '#0F172A' };
/** Wie LOGO_HEX, aber über die Mood-Tokens; die Tinte bleibt auch im Dark Mode dunkel (liegt auf Gelb). */
export const LOGO_VARS: LogoColors = {
  tile: 'var(--color-mood-5)',
  shape: 'var(--color-mood-3)',
  ink: LOGO_HEX.ink,
};

/** Handshake-Pfade aus Lucide `handshake` (ISC), 24er-Raster. */
const HANDSHAKE_PATHS = [
  'm11 17 2 2a1 1 0 1 0 3-3',
  'm14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4',
  'm21 3 1 11h-2',
  'M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3',
  'M3 4h8',
];

const FACE: Record<LogoVariant, (ink: string) => string> = {
  smiley: (ink) =>
    `<circle cx="39" cy="44" r="5.5" fill="${ink}"/><circle cx="61" cy="44" r="5.5" fill="${ink}"/>` +
    `<path d="M33 58Q50 76 67 58" fill="none" stroke="${ink}" stroke-width="6.5" stroke-linecap="round"/>`,
  handshake: (ink) =>
    `<g transform="translate(26 30) scale(2)" fill="none" stroke="${ink}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">` +
    HANDSHAKE_PATHS.map((d) => `<path d="${d}"/>`).join('') +
    `</g>`,
};

interface LogoOptions {
  /** Anteil der Kachel, den der NRW-Umriss einnimmt. */
  scale?: number;
  /** Kachel-Rundung; 0 = vollflächig (maskable). */
  rx?: number;
}

/** Inneres SVG-Markup (viewBox 0 0 100 100) des App-Icons: Kachel + NRW-Umriss + Smiley/Handschlag. */
export function logoMarkup(
  variant: LogoVariant,
  colors: LogoColors,
  { scale = 0.76, rx = 22 }: LogoOptions = {},
): string {
  const off = (100 - 100 * scale) / 2;
  return (
    `<rect width="100" height="100" rx="${rx}" fill="${colors.tile}"/>` +
    `<g transform="translate(${off} ${off}) scale(${scale})">` +
    `<path d="${NRW_OUTLINE_PATH}" fill="${colors.shape}" stroke="${colors.shape}" stroke-width="3" stroke-linejoin="round"/>` +
    FACE[variant](colors.ink) +
    `</g>`
  );
}

export function logoSvg(variant: LogoVariant, colors: LogoColors, opts?: LogoOptions): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${logoMarkup(variant, colors, opts)}</svg>\n`;
}

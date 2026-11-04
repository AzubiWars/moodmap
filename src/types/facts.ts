/**
 * Amtliche Kennzahlen (`public/data/facts.json`, #297). Erzeugt von `npm run data:facts`.
 * Zellen sind Summen, damit jede Ebene exakt aus den Schulen folgt.
 */

/** [Soll-Stunden, ersatzlos ausgefallene Stunden, nach Stundenplan erteilte Stunden, Schulen] */
export type UntstatCell = [planned: number, cancelled: number, regular: number, schools: number];

/** [Soll-Stunden, ersatzlos ausgefallen, nach Stundenplan erteilt] je Stufe einer Schule */
export type UntstatHours = [planned: number, cancelled: number, regular: number];

/** [Summe der Stufen, Anzahl Schulen] */
export type SozialCell = [sum: number, schools: number];

export type FactLevel = 'nrw' | 'regbez' | 'kreis' | 'gemeinde';

/** [Schüler:innen, Klassen, Lehrkräfte (Personen), erteilte Wochenstunden] – allgemeinbildende Schulen */
export type EckdatenCell = [pupils: number, classes: number, teachers: number, hours: number];

export interface FactsFile {
  untstat: {
    /** Schuljahr, z. B. „2024/25“ */
    year: string;
    /** Stand der Auswertung laut MSB */
    stand: string;
    areas: Partial<Record<FactLevel, Record<string, UntstatCell>>>;
    schools: Record<string, Partial<Record<'primar' | 'sek1' | 'sek2', UntstatHours>>>;
    /** Landeswert je `${Schulform}:${Stufe}` zum Vergleich auf Schulebene */
    stateByForm: Record<string, UntstatHours>;
  };
  sozialindex: {
    year: string;
    areas: Partial<Record<FactLevel, Record<string, SozialCell>>>;
  };
  /** Eckdaten der Amtlichen Schuldaten; nur bis Kreisebene veröffentlicht */
  eckdaten?: {
    year: string;
    areas: Partial<Record<Exclude<FactLevel, 'gemeinde'>, Record<string, EckdatenCell>>>;
  };
}

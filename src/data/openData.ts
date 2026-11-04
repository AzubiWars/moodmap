/**
 * Alle externen Datensätze, die die App nutzt (#297) – mit Herausgeber, Lizenz, Stand und Link.
 * Die Seite `/quellen` listet sie vollständig; Karte und Detail-Panel verlinken einzelne Einträge.
 */

export type OpenDatasetId =
  'untstat' | 'sozialindex' | 'eckdaten' | 'schulverzeichnis' | 'vg250' | 'naturalearth' | 'openfreemap';

export interface OpenDataset {
  id: OpenDatasetId;
  title: string;
  publisher: string;
  /** Lizenz bzw. Nutzungsgrundlage, wie vom Herausgeber angegeben */
  license: string;
  licenseUrl?: string;
  /** Datenstand */
  stand: string;
  url: string;
  /** Wofür Moodmap den Datensatz nutzt */
  usage: string;
  /** Wie die Daten verarbeitet wurden */
  processing: string;
  /** Grenzen der Aussagekraft, möglichst in den Worten des Herausgebers */
  caveat?: string;
}

const DL_DE_BY = 'https://www.govdata.de/dl-de/by-2-0';

export const OPEN_DATASETS: readonly OpenDataset[] = [
  {
    id: 'untstat',
    title: 'Flächendeckende Unterrichtsstatistik mit Detailerhebung, Schuljahr 2024/25 (schulbezogen)',
    publisher: 'Ministerium für Schule und Bildung NRW',
    license: 'Veröffentlicht vom MSB NRW im Bildungsportal „Schule suchen“',
    stand: '05.12.2025',
    url: 'https://apps.schulministerium.nrw.de/BiPo/SchuleSuchen/',
    usage: 'Anteil ersatzlos ausgefallener Unterrichtsstunden je Schule, Stadt, Kreis und Regierungsbezirk.',
    processing:
      'Je Schule die Auswertungen „Untstat 2024/25“ (Primarstufe, Sek I, Sek II) abgerufen und die Jahressummen übernommen. Gebietswerte = Summe ausgefallener Stunden ÷ Summe der Soll-Stunden aller Schulen des Gebiets (stundengewichtet, keine Schätzung).',
    caveat:
      'Laut MSB misst die Statistik nur Abweichungen vom Stundenplan. Kürzungen im Stundenplan selbst sind nicht erfasst, ein Vergleich von Schulen ist daher nur bedingt möglich, und die Zahlen sagen nichts über die Qualität der Arbeit vor Ort.',
  },
  {
    id: 'sozialindex',
    title: 'Schulscharfer Sozialindex NRW, Schuljahr 2025/26',
    publisher: 'Ministerium für Schule und Bildung NRW (über Open.NRW)',
    license: 'Datenlizenz Deutschland – Namensnennung – Version 2.0',
    licenseUrl: DL_DE_BY,
    stand: '30.10.2025',
    url: 'https://ckan.open.nrw.de/dataset/schulsozialindex_1673961584',
    usage: 'Durchschnittliche Sozialindexstufe (1–9) je Stadt, Kreis und Regierungsbezirk als Kontext.',
    processing:
      'CSV über die Schulnummer mit dem Schulverzeichnis verknüpft (4.146 von 4.157 Schulen). Schulen „ohne“ Stufe zählen nicht mit. Gezeigt werden nur Gebietsmittel, keine Einzelschulen.',
    caveat:
      'Der Index beschreibt die soziale Zusammensetzung der Schülerschaft (u. a. Kinder- und Jugendarmut) und dient der Verteilung von Ressourcen. Er bewertet ausdrücklich nicht die pädagogische Arbeit einer Schule. Förderschulen und Berufskollegs sind nicht enthalten.',
  },
  {
    id: 'eckdaten',
    title: 'Eckdaten der Amtlichen Schuldaten, Schuljahr 2025/26',
    publisher: 'Ministerium für Schule und Bildung NRW (über Open.NRW)',
    license: 'Datenlizenz Deutschland – Namensnennung – Version 2.0',
    licenseUrl: DL_DE_BY,
    stand: 'Amtliche Schuldaten 2025/26',
    url: 'https://ckan.open.nrw.de/dataset/eckdaten_der_amtlichen_schuldaten_1567756447',
    usage: 'Ø Schüler:innen je Klasse und je Lehrkraft für Kreise, Regierungsbezirke und NRW.',
    processing:
      'Summe aller allgemeinbildenden Schulen (öffentlich und privat) je Kreis; Berufskollegs, Weiterbildungskollegs und Förderschulen BK sind ausgenommen. Quotienten aus den Summen, keine Mittelwerte von Mittelwerten.',
    caveat:
      'Nur bis Kreisebene veröffentlicht. „Lehrkräfte“ sind Personen inklusive Teilzeit, keine Vollzeitstellen. Der Mix der Schulformen (z. B. viele Grund- oder Förderschulen) beeinflusst die Werte.',
  },
  {
    id: 'schulverzeichnis',
    title: 'Schulverzeichnis NRW (INSPIRE Schulstandorte)',
    publisher: 'Ministerium für Schule und Bildung NRW',
    license: 'Datenlizenz Deutschland – Namensnennung – Version 2.0',
    licenseUrl: DL_DE_BY,
    stand: 'Abruf 21.10.2026',
    url: 'https://ogc-api.nrw.de/inspire-us-schule/v1',
    usage: 'Standorte, Namen, Schulformen und Schülerzahlen der 5.327 Schulen.',
    processing: 'Per Punkt-in-Polygon den Gemeinden zugeordnet (ADR-021).',
  },
  {
    id: 'vg250',
    title: 'Verwaltungsgebiete 1:250 000 (VG250)',
    publisher: 'Bundesamt für Kartographie und Geodäsie',
    license: 'Datenlizenz Deutschland – Namensnennung – Version 2.0, © GeoBasis-DE / BKG',
    licenseUrl: DL_DE_BY,
    stand: 'Stand 01.01., Abruf Oktober 2026',
    url: 'https://gdz.bkg.bund.de/index.php/default/verwaltungsgebiete-1-250-000-ebenen-stand-01-01-vg250-ebenen-01-01.html',
    usage: 'Grenzen von Regierungsbezirken, Kreisen und Gemeinden.',
    processing: 'Mit mapshaper auf ~100 m vereinfacht.',
  },
  {
    id: 'naturalearth',
    title: 'Natural Earth Admin 0 – Countries',
    publisher: 'Natural Earth',
    license: 'Public Domain',
    stand: 'Version 5',
    url: 'https://www.naturalearthdata.com/',
    usage: 'Maske außerhalb Deutschlands.',
    processing: 'Unverändert.',
  },
  {
    id: 'openfreemap',
    title: 'Hintergrundkarte',
    publisher: 'OpenFreeMap auf Basis von OpenStreetMap',
    license: 'ODbL, © OpenStreetMap contributors',
    licenseUrl: 'https://www.openstreetmap.org/copyright',
    stand: 'laufend',
    url: 'https://openfreemap.org/',
    usage: 'Straßen, Orte, Gebäude.',
    processing: 'Unverändert.',
  },
];

export const openDataset = (id: OpenDatasetId): OpenDataset => OPEN_DATASETS.find((d) => d.id === id)!;

/** Datenblatt einer Schule im Bildungsportal: dort liegen auch die Original-PDFs der Unterrichtsstatistik. */
export const schoolDatasheetUrl = (schulnummer: string) =>
  `https://apps.schulministerium.nrw.de/BiPo/SchuleSuchen/pages/schulsuche/schule_information_seite.xhtml?schulnummer=${schulnummer}`;

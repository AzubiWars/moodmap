import type { School } from '@/types';
import type { RegionCollection } from './geo';
import { normalizeSearch, searchMap } from './searchCatalog';

function school(
  id: string,
  name: string,
  city: string,
  kreisId = '05315',
  schoolForm: School['schoolForm'] = 'gesamtschule',
): School {
  return {
    id,
    name,
    schoolForm,
    kreisId,
    city,
    lat: 50.9,
    lon: 6.9,
    studentCount: 800,
    joinCode: `J${id}`,
  };
}

const schools: School[] = [
  school('199916', 'Städtische Gesamtschule Stettiner Straße', 'Düsseldorf', '05111'),
  school('100001', 'Gymnasium Musterstadt', 'Musterstadt', '05315'),
  school('100002', 'Realschule Musterstadt', 'Musterstadt', '05315'),
  school('100003', 'Berufskolleg Rhein', 'Köln', '05315'),
];

// Fixtures für die Filtertests (#303): gleiche Stadt, unterschiedliche Schulformen.
const filterSchools: School[] = [
  school('300001', 'Gymnasium Filterstadt', 'Filterstadt', '05315', 'gymnasium'),
  school('300002', 'Grundschule Filterstadt', 'Filterstadt', '05315', 'grundschule'),
  school('300003', 'Realschule Filterdorf', 'Filterdorf', '05315', 'realschule'),
];

const directorySchools: School[] = [
  school('400001', 'Gymnasium Verzeichnisstadt', 'Verzeichnisstadt', '05315', 'gymnasium'),
  school('400002', 'Grundschule Verzeichnisstadt', 'Verzeichnisstadt', '05315', 'grundschule'),
];

const kreise: RegionCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: '05111', name: 'Düsseldorf', regbez_id: '051', type: 'kreisfreie_stadt' },
      geometry: { type: 'Point', coordinates: [6.8, 51.2] },
    },
    {
      type: 'Feature',
      properties: { id: '05315', name: 'Köln', regbez_id: '053', type: 'kreisfreie_stadt' },
      geometry: { type: 'Point', coordinates: [6.9, 50.9] },
    },
    {
      type: 'Feature',
      properties: { id: '05515', name: 'Musterkreis', regbez_id: '055', type: 'kreis' },
      geometry: { type: 'Point', coordinates: [7.1, 51.1] },
    },
  ],
};

const regbez: RegionCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: '051', name: 'Düsseldorf' },
      geometry: { type: 'Point', coordinates: [6.8, 51.2] },
    },
    {
      type: 'Feature',
      properties: { id: '053', name: 'Köln' },
      geometry: { type: 'Point', coordinates: [6.9, 50.9] },
    },
  ],
};

describe('normalizeSearch', () => {
  it('ignores case, umlauts and punctuation', () => {
    expect(normalizeSearch('Städtische Gesamtschule, Straße')).toBe('stadtische gesamtschule strasse');
  });
});

describe('searchMap', () => {
  it('needs at least two characters', () => {
    expect(searchMap('a', { schools, kreise, regbez })).toEqual([]);
    expect(searchMap('  ', { schools, kreise, regbez })).toEqual([]);
  });

  it('finds schools by name, city, form and school number', () => {
    expect(searchMap('stettiner', { schools, kreise, regbez })[0]?.label).toContain('Stettiner');
    expect(searchMap('musterstadt', { schools, kreise, regbez }).some((r) => r.kind === 'city')).toBe(true);
    expect(searchMap('199916', { schools, kreise, regbez })[0]?.kind).toBe('school');
    expect(searchMap('berufskolleg', { schools, kreise, regbez })[0]?.label).toBe('Berufskolleg Rhein');
  });

  it('does not duplicate a live school from the directory', () => {
    const results = searchMap('stettiner', {
      schools,
      directorySchools: [schools[0]!],
      kreise,
      regbez,
    });
    expect(results.filter((result) => result.label.includes('Stettiner'))).toHaveLength(1);
    expect(results.find((result) => result.label.includes('Stettiner'))?.directory).not.toBe(true);
  });

  it('groups cities from school locations and skips independent cities', () => {
    const results = searchMap('musterstadt', { schools, kreise, regbez });
    const city = results.find((result) => result.kind === 'city');
    expect(city).toMatchObject({ label: 'Musterstadt', detail: '2 Schulen' });

    // Düsseldorf ist bereits ein Kreis-Treffer und soll nicht doppelt als Stadt erscheinen.
    const duesseldorf = searchMap('düsseldorf', { schools, kreise, regbez });
    expect(duesseldorf.some((result) => result.kind === 'city' && result.label === 'Düsseldorf')).toBe(false);
    expect(duesseldorf.some((result) => result.kind === 'kreis')).toBe(true);
  });

  it('finds Kreise and Regierungsbezirke with readable labels', () => {
    const results = searchMap('köln', { schools, kreise, regbez });
    expect(results.some((result) => result.label === 'Stadt Köln')).toBe(true);
    expect(results.some((result) => result.label === 'Reg.-Bez. Köln')).toBe(true);

    const kreis = searchMap('musterkreis', { schools, kreise, regbez });
    expect(kreis.some((result) => result.label === 'Musterkreis')).toBe(true);
  });

  it('puts exact and prefix matches first within a group', () => {
    const results = searchMap('muster', { schools, kreise, regbez });
    expect(results.find((result) => result.kind === 'city')?.label).toBe('Musterstadt');
    expect(results.find((result) => result.kind === 'school')?.label).toBe('Gymnasium Musterstadt');
  });
});

describe('searchMap filters (#303)', () => {
  it('restricts school hits to the selected school forms', () => {
    const unfiltered = searchMap('filterstadt', { schools: filterSchools });
    expect(unfiltered.filter((result) => result.kind === 'school')).toHaveLength(2);

    const filtered = searchMap('filterstadt', {
      schools: filterSchools,
      filters: { schoolForm: ['gymnasium'] },
    });
    expect(filtered.filter((result) => result.kind === 'school').map((result) => result.label)).toEqual([
      'Gymnasium Filterstadt',
    ]);
  });

  it('counts only matching schools for city hits', () => {
    const unfiltered = searchMap('filterstadt', { schools: filterSchools });
    expect(unfiltered.find((result) => result.kind === 'city')).toMatchObject({
      label: 'Filterstadt',
      detail: '2 Schulen',
    });

    const filtered = searchMap('filterstadt', {
      schools: filterSchools,
      filters: { schoolForm: ['gymnasium'] },
    });
    expect(filtered.find((result) => result.kind === 'city')).toMatchObject({
      label: 'Filterstadt',
      detail: '1 Schule',
    });
  });

  it('treats an empty schoolForm list as no restriction', () => {
    const withoutFilters = searchMap('filterstadt', { schools: filterSchools });
    const emptyFilter = searchMap('filterstadt', {
      schools: filterSchools,
      filters: { schoolForm: [] },
    });
    expect(emptyFilter).toEqual(withoutFilters);
  });

  it('applies the school form filter to directory schools too', () => {
    const unfiltered = searchMap('verzeichnisstadt', { directorySchools });
    expect(unfiltered.filter((result) => result.directory === true)).toHaveLength(2);

    const filtered = searchMap('verzeichnisstadt', {
      directorySchools,
      filters: { schoolForm: ['gymnasium'] },
    });
    expect(filtered.map((result) => result.label)).toEqual(['Gymnasium Verzeichnisstadt']);
    expect(filtered[0]?.directory).toBe(true);
  });

  it('hides directory schools when directory is false but keeps live schools', () => {
    const directorySchool = school(
      '400003',
      'Gymnasium Filterstadt Abend',
      'Filterstadt',
      '05315',
      'gymnasium',
    );
    const input = { schools: filterSchools, directorySchools: [directorySchool] };

    expect(searchMap('filterstadt', input).some((result) => result.directory === true)).toBe(true);

    const withoutDirectory = searchMap('filterstadt', {
      ...input,
      filters: { directory: false },
    });
    expect(withoutDirectory.some((result) => result.directory === true)).toBe(false);
    expect(withoutDirectory.filter((result) => result.kind === 'school')).toHaveLength(2);
  });

  it('keeps Kreise and Regierungsbezirke unfiltered', () => {
    const results = searchMap('köln', {
      schools: filterSchools,
      directorySchools,
      kreise,
      regbez,
      filters: { schoolForm: ['foerderschule'], directory: false },
    });
    expect(results.some((result) => result.kind === 'kreis' && result.label === 'Stadt Köln')).toBe(true);
    expect(results.some((result) => result.kind === 'regbez' && result.label === 'Reg.-Bez. Köln')).toBe(
      true,
    );
  });
});

import { breadcrumb, clickTarget, drillParams, kreisLabel, resolveDrill } from './drilldown';
import type { RegionCollection, RegionFeature } from './geo';

function feature(properties: RegionFeature['properties']): RegionFeature {
  return { type: 'Feature', properties, geometry: { type: 'Point', coordinates: [7, 51] } };
}

const koelnRb = feature({ id: '053', name: 'Köln' });
const muensterRb = feature({ id: '055', name: 'Münster' });
const koelnStadt = feature({ id: '05315', name: 'Köln', regbez_id: '053', type: 'kreisfreie_stadt' });
const dueren = feature({ id: '05358', name: 'Düren', regbez_id: '053', type: 'kreis' });
const rheinErft = feature({ id: '05362', name: 'Rhein-Erft-Kreis', regbez_id: '053', type: 'kreis' });

const regbez: RegionCollection = { type: 'FeatureCollection', features: [koelnRb, muensterRb] };
const kreise: RegionCollection = { type: 'FeatureCollection', features: [koelnStadt, dueren, rheinErft] };

const resolve = (search: string) => resolveDrill(new URLSearchParams(search), regbez, kreise);

describe('resolveDrill', () => {
  it('starts at NRW without drill params', () => {
    expect(resolve('topic=ai')).toEqual({ level: 'nrw', regbez: null, kreis: null });
  });

  it('resolves a regbez and a kreis', () => {
    expect(resolve('regbez=053')).toMatchObject({ level: 'regbez', regbez: koelnRb, kreis: null });
    expect(resolve('regbez=053&kreis=05315')).toMatchObject({
      level: 'kreis',
      regbez: koelnRb,
      kreis: koelnStadt,
    });
  });

  it('derives the regbez from the kreis and ignores a contradicting regbez param', () => {
    expect(resolve('kreis=05358')).toMatchObject({ level: 'kreis', regbez: koelnRb, kreis: dueren });
    expect(resolve('regbez=055&kreis=05358')).toMatchObject({ level: 'kreis', regbez: koelnRb });
  });

  it('falls back to the next valid level for unknown ids', () => {
    expect(resolve('regbez=999').level).toBe('nrw');
    expect(resolve('regbez=053&kreis=00000')).toMatchObject({ level: 'regbez', regbez: koelnRb });
  });

  it('stays at NRW while geo data is loading', () => {
    expect(resolveDrill(new URLSearchParams('regbez=053&kreis=05315'), undefined, undefined).level).toBe(
      'nrw',
    );
  });
});

describe('drillParams', () => {
  it('replaces drill params and keeps other filters', () => {
    const next = drillParams(new URLSearchParams('topic=ai&regbez=055&kreis=05515'), { regbez: '053' });
    expect(next.toString()).toBe('topic=ai&regbez=053');
    expect(drillParams(next, {}).toString()).toBe('topic=ai');
  });
});

describe('clickTarget', () => {
  it('drills from NRW into a regbez and from there into a kreis', () => {
    expect(clickTarget(resolve(''), koelnRb)).toEqual({ regbez: '053' });
    expect(clickTarget(resolve('regbez=053'), dueren)).toEqual({ regbez: '053', kreis: '05358' });
  });

  it('switches regbez when clicking a dimmed kreis of another regbez', () => {
    const other = feature({ id: '05515', name: 'Münster', regbez_id: '055', type: 'kreisfreie_stadt' });
    expect(clickTarget(resolve('regbez=053&kreis=05315'), other)).toEqual({ regbez: '055', kreis: '05515' });
  });
});

describe('breadcrumb', () => {
  it('links every level above the current one', () => {
    expect(breadcrumb(resolve(''))).toEqual([{ label: 'NRW', params: null }]);
    expect(breadcrumb(resolve('kreis=05315'))).toEqual([
      { label: 'NRW', params: {} },
      { label: 'Reg.-Bez. Köln', params: { regbez: '053' } },
      { label: 'Stadt Köln', params: null },
    ]);
  });

  it('labels kreise readably', () => {
    expect(kreisLabel(dueren)).toBe('Kreis Düren');
    expect(kreisLabel(rheinErft)).toBe('Rhein-Erft-Kreis');
    expect(kreisLabel(feature({ id: '05334', name: 'Städteregion Aachen', type: 'kreis' }))).toBe(
      'Städteregion Aachen',
    );
  });
});

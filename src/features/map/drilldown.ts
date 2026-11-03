import type { School } from '@/types';
import type { RegionCollection, RegionFeature } from './geo';

/**
 * Drill-down der Karte: NRW → Regierungsbezirk → Kreis (#17) → Stadt/Gemeinde → Schule (#18).
 * Kreisfreie Städte sind selbst die Stadt: dort folgt auf den Kreis direkt die Schule.
 * Der Zustand steckt in der URL (`?regbez=057&kreis=05774&gemeinde=05774032&school=…`), damit Links
 * teilbar sind und Browser-Zurück eine Ebene hochspringt.
 */
export type DrillLevel = 'nrw' | 'regbez' | 'kreis' | 'gemeinde' | 'school';

export interface DrillState {
  level: DrillLevel;
  regbez: RegionFeature | null;
  kreis: RegionFeature | null;
  gemeinde: RegionFeature | null;
  school: School | null;
}

export interface DrillTarget {
  regbez?: string;
  kreis?: string;
  gemeinde?: string;
  school?: string;
}

export interface Crumb {
  label: string;
  /** Suchparameter für diesen Schritt; `null` = aktuelle Ebene (nicht klickbar) */
  params: DrillTarget | null;
}

// `city` stammt aus älteren Links (Stadtfilter der Suche) und wird beim nächsten Schritt entfernt.
export const DRILL_PARAMS = ['regbez', 'kreis', 'gemeinde', 'school', 'city'] as const;

const NRW_STATE: DrillState = { level: 'nrw', regbez: null, kreis: null, gemeinde: null, school: null };

/** Kreisfreie Stadt: Kreis und Stadt sind dasselbe, Schulen erscheinen schon auf Kreisebene. */
export const isCityKreis = (kreis: RegionFeature | null | undefined) =>
  kreis?.properties.type === 'kreisfreie_stadt';

/** Liest den Drill-down aus der URL. Unbekannte oder widersprüchliche IDs fallen auf die nächsthöhere gültige Ebene zurück. */
export function resolveDrill(
  params: URLSearchParams,
  regbez: RegionCollection | undefined,
  kreise: RegionCollection | undefined,
  schools: readonly School[] | undefined = undefined,
  gemeinden: RegionCollection | undefined = undefined,
): DrillState {
  const schoolId = params.get('school');
  const school = schoolId ? schools?.find((s) => s.id === schoolId) : undefined;
  // Die tiefere Ebene bestimmt die höheren – abweichende Parameter werden ignoriert.
  const kreisId = school?.kreisId ?? params.get('kreis');
  const kreis = kreisId ? kreise?.features.find((f) => f.properties.id === kreisId) : undefined;
  const regbezId = kreis?.properties.regbez_id ?? params.get('regbez');
  const rb = regbezId ? regbez?.features.find((f) => f.properties.id === regbezId) : undefined;

  const gemeindeId = isCityKreis(kreis) ? null : (school?.gemeindeId ?? params.get('gemeinde'));
  const gemeinde =
    (gemeindeId &&
      gemeinden?.features.find(
        (f) => f.properties.id === gemeindeId && f.properties.kreis_id === kreis?.properties.id,
      )) ||
    null;

  if (school && kreis && rb) return { level: 'school', regbez: rb, kreis, gemeinde, school };
  if (gemeinde && kreis && rb) return { level: 'gemeinde', regbez: rb, kreis, gemeinde, school: null };
  if (kreis && rb) return { level: 'kreis', regbez: rb, kreis, gemeinde: null, school: null };
  if (rb) return { level: 'regbez', regbez: rb, kreis: null, gemeinde: null, school: null };
  return NRW_STATE;
}

/** Neue Suchparameter für einen Drill-Schritt; andere Filter (z. B. `topic`) bleiben erhalten. */
export function drillParams(previous: URLSearchParams, target: DrillTarget): URLSearchParams {
  const next = new URLSearchParams(previous);
  for (const key of DRILL_PARAMS) {
    next.delete(key);
    const value = key === 'city' ? undefined : target[key];
    if (value) next.set(key, value);
  }
  return next;
}

/** Ziel eines Klicks auf eine Fläche der aktuell angezeigten Ebene. */
export function clickTarget(state: DrillState, feature: RegionFeature): DrillTarget {
  if (state.level === 'nrw') return { regbez: feature.properties.id };
  const { id, regbez_id: regbez, kreis_id: kreis, type } = feature.properties;
  if (type === 'gemeinde') return { regbez, kreis, gemeinde: id };
  return { regbez, kreis: id };
}

/** Ziel eines Klicks auf einen Schul-Marker. */
export function schoolTarget(state: DrillState, school: School): DrillTarget {
  // Schulen werden nur innerhalb des fokussierten Regierungsbezirks gezeigt; resolveDrill korrigiert ihn notfalls über den Kreis.
  return {
    regbez: state.regbez?.properties.id,
    kreis: school.kreisId,
    gemeinde: isCityKreis(state.kreis) ? undefined : school.gemeindeId,
    school: school.id,
  };
}

export function regbezLabel(feature: RegionFeature): string {
  return `Reg.-Bez. ${feature.properties.name}`;
}

export function kreisLabel(feature: RegionFeature): string {
  const { name, type } = feature.properties;
  if (type === 'kreisfreie_stadt') return `Stadt ${name}`;
  return /kreis|region/i.test(name) ? name : `Kreis ${name}`;
}

export function gemeindeLabel(feature: RegionFeature): string {
  return feature.properties.name;
}

export function breadcrumb(state: DrillState): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'NRW', params: state.level === 'nrw' ? null : {} }];
  if (state.regbez) {
    crumbs.push({
      label: regbezLabel(state.regbez),
      params: state.level === 'regbez' ? null : { regbez: state.regbez.properties.id },
    });
  }
  if (state.kreis) {
    crumbs.push({
      label: kreisLabel(state.kreis),
      params:
        state.level === 'kreis'
          ? null
          : { regbez: state.regbez?.properties.id, kreis: state.kreis.properties.id },
    });
  }
  if (state.gemeinde) {
    crumbs.push({
      label: gemeindeLabel(state.gemeinde),
      params:
        state.level === 'gemeinde'
          ? null
          : {
              regbez: state.regbez?.properties.id,
              kreis: state.kreis?.properties.id,
              gemeinde: state.gemeinde.properties.id,
            },
    });
  }
  if (state.school) crumbs.push({ label: state.school.name, params: null });
  return crumbs;
}

/** Untertitel der Ebene für Info-Box und Screenreader. */
export function levelCaption(state: DrillState): string {
  switch (state.level) {
    case 'nrw':
      return 'Regierungsbezirke';
    case 'regbez':
      return 'Kreise & kreisfreie Städte';
    case 'kreis':
      return isCityKreis(state.kreis) ? 'Schulen in der Stadt' : 'Städte & Gemeinden';
    case 'gemeinde':
      return 'Schulen in der Gemeinde';
    case 'school':
      return 'Schule';
  }
}

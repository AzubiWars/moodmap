import type { School } from '@/types';
import type { RegionCollection, RegionFeature } from './geo';

/**
 * Drill-down der Karte: NRW → Regierungsbezirk → Kreis (#17) → Schule (#18).
 * Der Zustand steckt in der URL (`?regbez=053&kreis=05315&school=900123`), damit Links teilbar sind
 * und Browser-Zurück eine Ebene hochspringt.
 */
export type DrillLevel = 'nrw' | 'regbez' | 'kreis' | 'school';

export interface DrillState {
  level: DrillLevel;
  regbez: RegionFeature | null;
  kreis: RegionFeature | null;
  school: School | null;
}

export interface DrillTarget {
  regbez?: string;
  kreis?: string;
  school?: string;
}

export interface Crumb {
  label: string;
  /** Suchparameter für diesen Schritt; `null` = aktuelle Ebene (nicht klickbar) */
  params: DrillTarget | null;
}

export const DRILL_PARAMS = ['regbez', 'kreis', 'school'] as const;

const NRW_STATE: DrillState = { level: 'nrw', regbez: null, kreis: null, school: null };

/** Liest den Drill-down aus der URL. Unbekannte oder widersprüchliche IDs fallen auf die nächsthöhere gültige Ebene zurück. */
export function resolveDrill(
  params: URLSearchParams,
  regbez: RegionCollection | undefined,
  kreise: RegionCollection | undefined,
  schools: readonly School[] | undefined = undefined,
): DrillState {
  const schoolId = params.get('school');
  const school = schoolId ? schools?.find((s) => s.id === schoolId) : undefined;
  // Die tiefere Ebene bestimmt die höheren – abweichende Parameter werden ignoriert.
  const kreisId = school?.kreisId ?? params.get('kreis');
  const kreis = kreisId ? kreise?.features.find((f) => f.properties.id === kreisId) : undefined;
  const regbezId = kreis?.properties.regbez_id ?? params.get('regbez');
  const rb = regbezId ? regbez?.features.find((f) => f.properties.id === regbezId) : undefined;

  if (school && kreis && rb) return { level: 'school', regbez: rb, kreis, school };
  if (kreis && rb) return { level: 'kreis', regbez: rb, kreis, school: null };
  if (rb) return { level: 'regbez', regbez: rb, kreis: null, school: null };
  return NRW_STATE;
}

/** Neue Suchparameter für einen Drill-Schritt; andere Filter (z. B. `topic`) bleiben erhalten. */
export function drillParams(previous: URLSearchParams, target: DrillTarget): URLSearchParams {
  const next = new URLSearchParams(previous);
  for (const key of DRILL_PARAMS) {
    next.delete(key);
    const value = target[key];
    if (value) next.set(key, value);
  }
  return next;
}

/** Ziel eines Klicks auf eine Fläche der aktuell angezeigten Ebene. */
export function clickTarget(state: DrillState, feature: RegionFeature): DrillTarget {
  if (state.level === 'nrw') return { regbez: feature.properties.id };
  return { regbez: feature.properties.regbez_id, kreis: feature.properties.id };
}

/** Ziel eines Klicks auf einen Schul-Marker. */
export function schoolTarget(state: DrillState, school: School): DrillTarget {
  // Schulen werden nur innerhalb des fokussierten Regierungsbezirks gezeigt; resolveDrill korrigiert ihn notfalls über den Kreis.
  return { regbez: state.regbez?.properties.id, kreis: school.kreisId, school: school.id };
}

export function regbezLabel(feature: RegionFeature): string {
  return `Reg.-Bez. ${feature.properties.name}`;
}

export function kreisLabel(feature: RegionFeature): string {
  const { name, type } = feature.properties;
  if (type === 'kreisfreie_stadt') return `Stadt ${name}`;
  return /kreis|region/i.test(name) ? name : `Kreis ${name}`;
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
      return 'Schulen im Kreis';
    case 'school':
      return 'Schule';
  }
}

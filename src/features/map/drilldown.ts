import type { RegionCollection, RegionFeature } from './geo';

/**
 * Drill-down der Karte (#17): NRW → Regierungsbezirk → Kreis.
 * Der Zustand steckt in der URL (`?regbez=053&kreis=05315`), damit Links teilbar sind
 * und Browser-Zurück eine Ebene hochspringt. Die Schul-Ebene ergänzt #18.
 */
export type DrillLevel = 'nrw' | 'regbez' | 'kreis';

export interface DrillState {
  level: DrillLevel;
  regbez: RegionFeature | null;
  kreis: RegionFeature | null;
}

export interface Crumb {
  label: string;
  /** Suchparameter für diesen Schritt; `null` = aktuelle Ebene (nicht klickbar) */
  params: { regbez?: string; kreis?: string } | null;
}

export const DRILL_PARAMS = ['regbez', 'kreis'] as const;

const NRW_STATE: DrillState = { level: 'nrw', regbez: null, kreis: null };

/** Liest den Drill-down aus der URL. Unbekannte oder widersprüchliche IDs fallen auf die nächsthöhere gültige Ebene zurück. */
export function resolveDrill(
  params: URLSearchParams,
  regbez: RegionCollection | undefined,
  kreise: RegionCollection | undefined,
): DrillState {
  const kreisId = params.get('kreis');
  const kreis = kreisId ? kreise?.features.find((f) => f.properties.id === kreisId) : undefined;
  // Der Kreis bestimmt seinen Regierungsbezirk – ein abweichender `regbez`-Parameter wird ignoriert.
  const regbezId = kreis?.properties.regbez_id ?? params.get('regbez');
  const rb = regbezId ? regbez?.features.find((f) => f.properties.id === regbezId) : undefined;

  if (kreis && rb) return { level: 'kreis', regbez: rb, kreis };
  if (rb) return { level: 'regbez', regbez: rb, kreis: null };
  return NRW_STATE;
}

/** Neue Suchparameter für einen Drill-Schritt; andere Filter (z. B. `topic`) bleiben erhalten. */
export function drillParams(
  previous: URLSearchParams,
  target: { regbez?: string; kreis?: string },
): URLSearchParams {
  const next = new URLSearchParams(previous);
  for (const key of DRILL_PARAMS) next.delete(key);
  if (target.regbez) next.set('regbez', target.regbez);
  if (target.kreis) next.set('kreis', target.kreis);
  return next;
}

/** Ziel eines Klicks auf eine Fläche der aktuell angezeigten Ebene. */
export function clickTarget(state: DrillState, feature: RegionFeature): { regbez?: string; kreis?: string } {
  if (state.level === 'nrw') return { regbez: feature.properties.id };
  return { regbez: feature.properties.regbez_id, kreis: feature.properties.id };
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
  if (state.kreis) crumbs.push({ label: kreisLabel(state.kreis), params: null });
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
      // Schul-Marker ergänzt #18
      return 'Kreis-Ansicht';
  }
}

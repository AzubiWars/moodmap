import { MOOD_LEVELS, NO_DATA } from '@/lib/colors';
import type { TensionLevel, TensionRow, TopicSlug } from '@/types';

/** Kartenmodi (#42; Trend & Beteiligung folgen mit #21). */
export type MapMode = 'mood' | 'radar';

export function parseMapMode(value: string | null): MapMode {
  return value === 'radar' ? 'radar' : 'mood';
}

/**
 * Stufen des Spannungs-Index (docs/PRODUCT_SPEC.md §3.10). Bewusst keine Alarm-/Gefahrensprache
 * (docs/PRIVACY.md §7): „Gespräch suchen“ statt „Risiko“.
 */
export const TENSION_INFO: Record<
  TensionLevel,
  { label: string; color: string; textColor: string; hint: string }
> = {
  stable: { label: 'stabil', color: MOOD_LEVELS[3]!.color, textColor: '#0F172A', hint: 'unter 45' },
  watch: { label: 'beobachten', color: MOOD_LEVELS[2]!.color, textColor: '#0F172A', hint: '45–59' },
  talk: { label: 'Gespräch suchen', color: MOOD_LEVELS[1]!.color, textColor: '#0F172A', hint: 'ab 60' },
};

export const TENSION_ORDER: readonly TensionLevel[] = ['talk', 'watch', 'stable'];

/** MapLibre-Expression: Feature-Property `tension` (Stufe oder 'none') → Farbe. */
export const TENSION_FILL_EXPRESSION = [
  'match',
  ['get', 'tension'],
  'talk',
  TENSION_INFO.talk.color,
  'watch',
  TENSION_INFO.watch.color,
  'stable',
  TENSION_INFO.stable.color,
  NO_DATA.color,
] as const;

export type TensionMap = ReadonlyMap<string, TensionRow>;

export function toTensionMap(rows: readonly TensionRow[] | undefined): TensionMap {
  return new Map((rows ?? []).map((row) => [row.id, row]));
}

/** Handlungsvorschläge statt Schuldzuweisung (Spec §3.10), je Haupttreiber. */
const SUGGESTIONS: Partial<Record<TopicSlug, string>> = {
  voice: 'Dialogrunde mit den Schülervertretungen anbieten',
  safety: 'Schulsozialarbeit und Schulpsychologie stärken',
  community: 'Klassenrat und Projekte für Zusammenhalt fördern',
  wellbeing: 'Beratungsangebote sichtbar machen',
  participation: 'Mitbestimmung stärken und die SV früh einbinden',
  teachers: 'Lehrkräfte entlasten und Fortbildungen anbieten',
};

export function suggestionsFor(drivers: readonly TopicSlug[]): string[] {
  return drivers.flatMap((slug) => (SUGGESTIONS[slug] ? [SUGGESTIONS[slug]!] : []));
}

/** Link zum Formular „Antwort veröffentlichen“ (#43) mit vorausgewählter Region und Thema. */
export function publishAnswerHref(
  scope: 'regbez' | 'kreis',
  regionId: string,
  topic: TopicSlug | undefined,
): string {
  const params = new URLSearchParams({ publish: '1', scope, region: regionId });
  if (topic) params.set('topic', topic);
  return `/dashboard?${params.toString()}`;
}

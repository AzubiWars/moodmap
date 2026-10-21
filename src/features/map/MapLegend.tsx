import { MOOD_LEVELS, NO_DATA } from '@/lib/colors';
import { type MapMode, PARTICIPATION_STEPS, type ScaleStep, TREND_STEPS } from './modes';
import { TENSION_INFO, TENSION_ORDER } from './radar';

const NO_DATA_PATTERN = {
  backgroundColor: NO_DATA.color,
  backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 2px, rgba(255,255,255,.7) 2px 4px)',
};

function rangeLabel(min: number, level: number) {
  return `${min}–${level === 5 ? 100 : min + 19}`;
}

export function MapLegend({ mode = 'mood' }: { mode?: MapMode }) {
  if (mode === 'radar') return <RadarLegend />;
  if (mode === 'trend') return <StepLegend title="Trend zur Vorwoche" steps={TREND_STEPS} />;
  if (mode === 'participation')
    return <StepLegend title="Beteiligung diese Woche" steps={PARTICIPATION_STEPS} />;
  const levels = [...MOOD_LEVELS].reverse();
  return (
    <div
      className="rounded-2xl bg-card/95 p-2 text-xs shadow-md ring-1 ring-border backdrop-blur md:p-3"
      role="group"
      aria-label="Legende Stimmungswetter"
    >
      {/* Mobile: kompakte Zeile */}
      <ul className="flex items-center gap-1 md:hidden">
        {[...MOOD_LEVELS].map((l) => (
          <li
            key={l.level}
            className="flex h-7 w-8 items-center justify-center rounded-md"
            style={{ backgroundColor: l.color }}
            title={`${l.label} (${rangeLabel(l.min, l.level)})`}
          >
            <span aria-hidden>{l.weather}</span>
            <span className="sr-only">{l.label}</span>
          </li>
        ))}
        <li className="h-7 w-8 rounded-md" style={NO_DATA_PATTERN} title={NO_DATA.label}>
          <span className="sr-only">{NO_DATA.label}</span>
        </li>
      </ul>

      {/* Desktop: Liste mit Bereichen */}
      <div className="hidden md:block">
        <div className="mb-2 font-semibold text-fg">Stimmungswetter</div>
        <ul className="space-y-1">
          {levels.map((l) => (
            <li key={l.level} className="flex items-center gap-2">
              <span className="size-3.5 rounded-sm" style={{ backgroundColor: l.color }} aria-hidden />
              <span className="w-5 text-center" aria-hidden>
                {l.weather}
              </span>
              <span>
                {l.label} <span className="text-muted">({rangeLabel(l.min, l.level)})</span>
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span className="size-3.5 rounded-sm" style={NO_DATA_PATTERN} aria-hidden />
            <span className="w-5" aria-hidden />
            <span>{NO_DATA.label}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Legende Frühwarn-Radar (#42): drei Stufen + zu wenige Daten, ohne Alarmsprache. */
function RadarLegend() {
  return (
    <div
      className="rounded-2xl bg-card/95 p-2 text-xs shadow-md ring-1 ring-border backdrop-blur md:p-3"
      role="group"
      aria-label="Legende Frühwarn-Radar"
    >
      <div className="mb-1.5 font-semibold text-fg md:mb-2">Frühwarn-Radar</div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 md:block md:space-y-1">
        {TENSION_ORDER.map((level) => (
          <li key={level} className="flex items-center gap-2">
            <span
              className="size-3.5 rounded-sm"
              style={{ backgroundColor: TENSION_INFO[level].color }}
              aria-hidden
            />
            <span>
              {TENSION_INFO[level].label}{' '}
              <span className="hidden text-muted md:inline">({TENSION_INFO[level].hint})</span>
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="size-3.5 rounded-sm" style={NO_DATA_PATTERN} aria-hidden />
          <span>{NO_DATA.label}</span>
        </li>
      </ul>
    </div>
  );
}

/** Legende für stufige Skalen (Trend, Beteiligung – #21), höchste Stufe oben. */
function StepLegend({ title, steps }: { title: string; steps: readonly ScaleStep[] }) {
  return (
    <div
      className="rounded-2xl bg-card/95 p-2 text-xs shadow-md ring-1 ring-border backdrop-blur md:p-3"
      role="group"
      aria-label={`Legende ${title}`}
    >
      <div className="mb-1.5 font-semibold text-fg md:mb-2">{title}</div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 md:block md:space-y-1">
        {[...steps].reverse().map((step) => (
          <li key={step.label} className="flex items-center gap-2">
            <span className="size-3.5 rounded-sm" style={{ backgroundColor: step.color }} aria-hidden />
            <span>{step.label}</span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="size-3.5 rounded-sm" style={NO_DATA_PATTERN} aria-hidden />
          <span>{NO_DATA.label}</span>
        </li>
      </ul>
    </div>
  );
}

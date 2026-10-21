import { Pause, Play, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { WaveId } from '@/types';
import { weekLabel, weekRange } from './filters';

/** Abspieltempo der Zeitachse – lang genug, dass die Umfärbung auf dem Beamer wahrnehmbar ist */
const TIMELINE_STEP_MS = 1200;

interface TimelineProps {
  waves: readonly WaveId[];
  /** `undefined` = keine Woche gewählt (Zeitraum-Filter gilt) */
  selected: WaveId | undefined;
  playing: boolean;
  onSelect: (wave: WaveId | undefined) => void;
  onPlayingChange: (playing: boolean) => void;
}

/** Zeitachse (#34): Slider über die Wellen des Schuljahres + Play-Animation. */
export function Timeline({ waves, selected, playing, onSelect, onPlayingChange }: TimelineProps) {
  const index = selected ? waves.indexOf(selected) : -1;
  const shown = index >= 0 ? index : waves.length - 1;

  // Callbacks und Wellen-Array sind pro Render neu – über Refs, damit Re-Renders (Daten, Live-Polling)
  // den Abspiel-Timer nicht ständig neu starten
  const latest = useRef({ waves, onSelect, onPlayingChange });
  useEffect(() => {
    latest.current = { waves, onSelect, onPlayingChange };
  });
  const wavesKey = waves.join(',');

  // Abspielen: eine Welle weiter, am Ende anhalten
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      const { waves: list, onSelect: select, onPlayingChange: setPlayingState } = latest.current;
      if (shown >= list.length - 1) setPlayingState(false);
      else select(list[shown + 1]);
    }, TIMELINE_STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, shown, wavesKey]);

  if (waves.length < 2) return null;
  const current = waves[shown]!;

  function togglePlay() {
    if (playing) return onPlayingChange(false);
    // Von vorn, wenn am Ende oder keine Woche gewählt
    if (index < 0 || index >= waves.length - 1) onSelect(waves[0]);
    onPlayingChange(true);
  }

  return (
    <div
      className="mb-1 flex w-[min(20rem,calc(100vw-1rem))] items-center gap-2 rounded-2xl bg-card/95 px-2 py-1.5 text-xs shadow-md ring-1 ring-border backdrop-blur"
      role="group"
      aria-label="Zeitachse"
    >
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Zeitachse anhalten' : 'Zeitachse abspielen'}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        {playing ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={waves.length - 1}
          step={1}
          value={shown}
          onChange={(event) => {
            onPlayingChange(false);
            onSelect(waves[Number(event.target.value)]);
          }}
          aria-label="Woche wählen"
          aria-valuetext={`${weekLabel(current)}, ${weekRange(current)}`}
          className="w-full accent-[var(--color-accent)]"
        />
        <div className="flex justify-between text-[10px] text-muted">
          <span>{weekLabel(waves[0]!)}</span>
          <span className="font-semibold text-fg" aria-live="polite">
            {selected ? `${weekLabel(current)} · ${weekRange(current)}` : 'aktuelle Woche'}
          </span>
          <span>{weekLabel(waves.at(-1)!)}</span>
        </div>
      </div>
      {selected && (
        <button
          type="button"
          onClick={() => {
            onPlayingChange(false);
            onSelect(undefined);
          }}
          aria-label="Zurück zur aktuellen Woche"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-fg"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  );
}

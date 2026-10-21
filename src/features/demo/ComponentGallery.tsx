import { useState } from 'react';
import { MoodBadge } from '@/components/MoodBadge';
import { MoodScaleInput, type MoodValue } from '@/components/MoodScaleInput';
import { ScoreBar } from '@/components/ScoreBar';
import { TopicChip } from '@/components/TopicChip';
import { WeatherIcon } from '@/components/WeatherIcon';
import { TOPICS } from '@/data/topics';

const SAMPLE_SCORES = [8, 31, 52, 68, 91, null] as const;

/** /demo/components – Übersicht der Basis-Komponenten für visuelle Reviews (#10). */
export function ComponentGallery() {
  const [mood, setMood] = useState<MoodValue | undefined>(undefined);
  const [topic, setTopic] = useState('overall');

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <h1 className="text-2xl font-bold">Komponenten</h1>

      <section className="space-y-3">
        <h2 className="font-semibold">WeatherIcon & MoodBadge</h2>
        <div className="flex flex-wrap items-center gap-3">
          {SAMPLE_SCORES.map((s, i) => (
            <WeatherIcon key={i} score={s} className="text-3xl" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_SCORES.map((s, i) => (
            <MoodBadge key={i} score={s} n={s === null ? 4 : 120} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <MoodBadge score={74} size="sm" showLabel={false} />
          <MoodBadge score={74} size="lg" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">ScoreBar (Marker = NRW-Ø 55)</h2>
        {SAMPLE_SCORES.map((s, i) => (
          <ScoreBar key={i} score={s} compare={55} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">TopicChip</h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {TOPICS.map((t) => (
            <TopicChip key={t.slug} topic={t} selected={topic === t.slug} onClick={setTopic} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">MoodScaleInput</h2>
        <p className="text-lg font-semibold">Wie geht's dir gerade mit Schule insgesamt?</p>
        <MoodScaleInput label="Wie geht's dir gerade mit Schule insgesamt?" value={mood} onChange={setMood} />
        <p className="text-sm text-slate-500">Wert: {mood === undefined ? '–' : String(mood)}</p>
      </section>
    </div>
  );
}

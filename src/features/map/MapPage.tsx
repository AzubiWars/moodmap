import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TopicChip } from '@/components/TopicChip';
import { TOPICS } from '@/data/topics';
import { demoScores } from './demoScores';
import { GEO_URLS, loadRegions, withScores } from './geo';
import { MapLegend } from './MapLegend';
import { MoodMap } from './MoodMap';

const MAP_TOPICS = [
  { slug: 'all', title: 'Gesamt-Mood', icon: '🗺️' },
  ...[...TOPICS].sort((a, b) => a.sort - b.sort),
];

export function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTopic = searchParams.get('topic');
  const topic = MAP_TOPICS.find((entry) => entry.slug === requestedTopic) ?? MAP_TOPICS[0]!;
  const filterRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    filterRef.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [topic.slug]);

  function selectTopic(slug: string) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (slug === 'all') next.delete('topic');
        else next.set('topic', slug);
        return next;
      },
      { preventScrollReset: true },
    );
  }
  const regionsQuery = useQuery({
    queryKey: ['geo', 'kreis'],
    queryFn: () => loadRegions(GEO_URLS.kreis),
    staleTime: Infinity,
    retry: false,
  });

  const scored = useMemo(() => {
    if (!regionsQuery.data) return null;
    // TODO(#9): durch DataSource.getAggregates({ level: 'kreis', topic }) ersetzen
    const scores = demoScores(
      regionsQuery.data.features.map((f) => f.properties.id),
      topic.slug,
    );
    return withScores(regionsQuery.data, scores);
  }, [regionsQuery.data, topic.slug]);

  const selected = scored?.features.find((f) => f.properties.id === selectedId);

  return (
    <div className="flex h-[calc(100dvh-8.5rem-env(safe-area-inset-bottom))] flex-col md:h-[calc(100dvh-5.1rem)]">
      <div
        ref={filterRef}
        role="group"
        aria-label="Karte nach Thema filtern"
        className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 py-3"
      >
        {MAP_TOPICS.map((entry) => (
          <TopicChip
            key={entry.slug}
            topic={entry}
            selected={topic.slug === entry.slug}
            onClick={selectTopic}
          />
        ))}
      </div>

      <div className="relative min-h-0 flex-1">
        <MoodMap regions={scored} selectedId={selectedId} onSelect={setSelectedId} />

        <div className="pointer-events-none absolute top-0 right-12 left-0 p-3">
          <div className="pointer-events-auto inline-block rounded-2xl bg-white/95 px-4 py-2 shadow-md ring-1 ring-slate-200">
            <h1 className="text-base font-bold">Moodmap NRW</h1>
            <p className="text-xs text-slate-500">
              {selected ? selected.properties.name : 'Kreise & kreisfreie Städte'}
            </p>
            <p className="text-xs text-slate-700" aria-live="polite">
              {topic.icon} {topic.title}
            </p>
          </div>
        </div>

        <div className="absolute bottom-8 left-2 md:bottom-3 md:left-3">
          <MapLegend />
        </div>

        {regionsQuery.isError && (
          <div className="absolute inset-x-3 top-24 rounded-2xl bg-white p-4 text-sm shadow-md ring-1 ring-slate-200 md:left-auto md:w-80">
            Die Kreisgrenzen konnten nicht geladen werden. Lade die Seite bitte erneut.
          </div>
        )}
      </div>
    </div>
  );
}

import { ChevronDown, ChevronUp, TrendingDown, TrendingUp } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { MoodBadge } from '@/components/MoodBadge';
import { ScoreBar } from '@/components/ScoreBar';
import { TOPICS } from '@/data/topics';
import { cn } from '@/lib/utils';
import { type GapAnalysis, gapAnalysis, nrwReference, type TopicGap } from './detailStats';
import { type DrillState, kreisLabel, regbezLabel } from './drilldown';
import { SCHOOL_FORM_LABELS } from './schools';
import { useAggregates } from './useAggregates';

interface DetailPanelProps {
  drill: DrillState;
}

/** Detail-Panel für Regierungsbezirk, Kreis oder Schule (#19, FB-005): Gesamt-Mood, Baustellen & Stärken vs. NRW, alle Themen. */
export function DetailPanel({ drill }: DetailPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  const level = drill.level === 'nrw' ? 'regbez' : drill.level;
  const unitId = drill.school?.id ?? drill.kreis?.properties.id ?? drill.regbez?.properties.id;
  const unitQuery = useAggregates(level, 'all', {
    parentId: level === 'school' ? drill.kreis?.properties.id : undefined,
    enabled: drill.level !== 'nrw',
  });
  const nrwQuery = useAggregates('nrw', 'all', { enabled: drill.level !== 'nrw' });

  if (drill.level === 'nrw' || !unitId) return null;

  const row = unitQuery.data?.find((r) => r.id === unitId);
  const nrw = nrwReference(nrwQuery.data);
  const gaps = gapAnalysis(TOPICS, row?.topicScores, nrw);
  const loading = unitQuery.isPending || nrwQuery.isPending;

  const title = drill.school
    ? drill.school.name
    : drill.kreis
      ? kreisLabel(drill.kreis)
      : regbezLabel(drill.regbez!);
  const subtitle = drill.school
    ? `${SCHOOL_FORM_LABELS[drill.school.schoolForm]} · ${drill.school.city} · Schulnummer ${drill.school.id}`
    : drill.kreis
      ? drill.kreis.properties.type === 'kreisfreie_stadt'
        ? 'Kreisfreie Stadt'
        : 'Kreis'
      : 'Regierungsbezirk';
  const participation =
    drill.school?.studentCount && row
      ? Math.min(100, Math.round((row.n / drill.school.studentCount) * 100))
      : null;

  return (
    <aside
      aria-label={`Details: ${title}`}
      className={cn(
        'pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-2xl bg-card shadow-[0_-4px_16px_rgba(15,23,42,0.12)] ring-1 ring-border',
        'md:inset-x-auto md:top-[4.5rem] md:right-3 md:bottom-3 md:w-[380px] md:rounded-2xl md:shadow-md',
      )}
    >
      <header className="flex items-start gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold">{title}</h2>
          <p className="truncate text-xs text-muted">{subtitle}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <MoodBadge score={row?.score ?? null} size="sm" />
            <span className="text-xs text-muted">
              {loading ? 'lädt …' : `${row?.n ?? 0} Stimmen`}
              {participation != null && ` · ${participation} % Beteiligung`}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="rounded-full p-1.5 text-muted hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:hidden"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? (
            <ChevronDown aria-hidden className="size-5" />
          ) : (
            <ChevronUp aria-hidden className="size-5" />
          )}
          <span className="sr-only">{expanded ? 'Details einklappen' : 'Details anzeigen'}</span>
        </button>
      </header>

      {/* Mobile: Peek zeigt die wichtigste Baustelle, aufgeklappt alles. Desktop: immer alles. */}
      {!expanded && gaps.weaknesses[0] && (
        <p className="px-4 pb-3 text-xs text-fg md:hidden">
          Größte Baustelle: {gaps.weaknesses[0].icon} {gaps.weaknesses[0].title} (
          {formatDelta(gaps.weaknesses[0].delta)} vs. NRW)
        </p>
      )}
      <div
        id={detailsId}
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4',
          expanded ? 'max-h-[55dvh]' : 'hidden',
          'md:block md:max-h-none',
        )}
      >
        <GapDetails gaps={gaps} hasData={row?.score != null} />
      </div>
    </aside>
  );
}

function GapDetails({ gaps, hasData }: { gaps: GapAnalysis; hasData: boolean }) {
  if (!hasData) {
    return (
      <p className="rounded-xl bg-subtle p-3 text-sm text-muted">
        Noch zu wenige Stimmen für eine Auswertung (mindestens 10). So bleibt niemand erkennbar.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <GapList
        title="Top 3 Baustellen"
        icon={<TrendingDown aria-hidden className="size-4 text-mood-2" />}
        items={gaps.weaknesses}
        empty="Keine Baustellen – alle Themen liegen auf oder über NRW-Niveau."
      />
      <GapList
        title="Top 3 Stärken"
        icon={<TrendingUp aria-hidden className="size-4 text-accent" />}
        items={gaps.strengths}
        empty="Kein Thema liegt deutlich über dem NRW-Schnitt."
      />
      <section>
        <h3 className="mb-2 text-sm font-semibold">Alle Themen vs. NRW</h3>
        <ul className="space-y-2.5">
          {gaps.topics.map((topic) => (
            <li key={topic.slug}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate">
                  <span aria-hidden>{topic.icon}</span> {topic.title}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {topic.score == null
                    ? 'zu wenige Daten'
                    : `${Math.round(topic.score)} · ${formatDelta(topic.delta)}`}
                </span>
              </div>
              <ScoreBar score={topic.score} compare={topic.nrw} compareLabel="NRW-Ø" />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted">
          Strich = NRW-Durchschnitt. Themen mit weniger als 10 Stimmen werden nicht ausgewertet.
        </p>
      </section>
    </div>
  );
}

function GapList({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: ReactNode;
  items: TopicGap[];
  empty: string;
}) {
  return (
    <section>
      <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted">{empty}</p>
      ) : (
        <ol className="space-y-1">
          {items.map((item) => (
            <li
              key={item.slug}
              className="flex items-center justify-between gap-2 rounded-lg bg-subtle px-2.5 py-1.5 text-sm"
            >
              <span className="truncate">
                <span aria-hidden>{item.icon}</span> {item.title}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <MoodBadge score={item.score} size="sm" showLabel={false} />
                <span className="w-16 text-right text-xs tabular-nums text-muted">
                  {formatDelta(item.delta)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatDelta(delta: number | null): string {
  if (delta == null) return '–';
  const rounded = Math.round(delta);
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : '±'}${Math.abs(rounded)} Pkt.`;
}

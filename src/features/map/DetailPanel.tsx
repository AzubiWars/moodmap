import { ChevronDown, ChevronUp, Megaphone, Radar, TrendingDown, TrendingUp } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoodBadge } from '@/components/MoodBadge';
import { ScoreBar } from '@/components/ScoreBar';
import { TOPICS } from '@/data/topics';
import { measuresForTopic } from '@/features/actions/catalog';
import { EvidenceBadge, SourceLine } from '@/features/actions/Evidence';
import { cn } from '@/lib/utils';
import { useRoleStore } from '@/store/role';
import type { AggregateRow, TensionRow } from '@/types';
import { type GapAnalysis, gapAnalysis, nrwReference, type TopicGap } from './detailStats';
import { type DrillState, gemeindeLabel, kreisLabel, regbezLabel } from './drilldown';
import { FactsSection } from './FactsSection';
import { isFactMode, type MapMode } from './modes';
import { publishAnswerHref, suggestionsFor, TENSION_INFO } from './radar';
import { SCHOOL_FORM_LABELS } from './schools';
import { type AggregateFilters, useAggregates, useTension } from './useAggregates';

interface DetailPanelProps {
  drill: DrillState;
  mode?: MapMode;
  /** Gleiche Filter wie die Karte (#20) – auch für den NRW-Vergleich */
  filters?: AggregateFilters;
}

/** Detail-Panel für Regierungsbezirk, Kreis oder Schule (#19, FB-005): Gesamt-Mood, Baustellen & Stärken vs. NRW, alle Themen. */
export function DetailPanel({ drill, mode = 'mood', filters }: DetailPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  const level = drill.level === 'nrw' ? 'regbez' : drill.level;
  const unitId =
    drill.school?.id ??
    drill.gemeinde?.properties.id ??
    drill.kreis?.properties.id ??
    drill.regbez?.properties.id;
  // Schulen einer Gemeinde bzw. Gemeinden eines Kreises; sonst ohne Eltern-Einschränkung.
  const parentId =
    level === 'school'
      ? (drill.gemeinde?.properties.id ?? drill.kreis?.properties.id)
      : level === 'gemeinde'
        ? drill.kreis?.properties.id
        : undefined;
  const unitQuery = useAggregates(level, 'all', {
    parentId,
    enabled: drill.level !== 'nrw',
    filters,
  });
  const nrwQuery = useAggregates('nrw', 'all', { enabled: drill.level !== 'nrw', filters });
  const radar = mode === 'radar';
  const factMode = isFactMode(mode);
  const ministry = useRoleStore((state) => state.role) === 'ministry';
  // Spannungs-Index pro Schule nur für das Ministerium (Spec §3.10)
  const tensionAllowed = level !== 'school' || ministry;
  const tensionQuery = useTension(level, {
    parentId,
    enabled: radar && tensionAllowed && drill.level !== 'nrw',
    filters,
  });

  if (drill.level === 'nrw' || !unitId) return null;

  const row = unitQuery.data?.find((r) => r.id === unitId);
  const nrw = nrwReference(nrwQuery.data);
  const gaps = gapAnalysis(
    TOPICS.filter((topic) => topic.audience.includes('student')),
    row?.topicScores,
    nrw,
  );
  const loading = unitQuery.isPending || nrwQuery.isPending;
  const tension = tensionQuery.data?.find((t) => t.id === unitId);

  const title = drill.school
    ? drill.school.name
    : drill.gemeinde
      ? gemeindeLabel(drill.gemeinde)
      : drill.kreis
        ? kreisLabel(drill.kreis)
        : regbezLabel(drill.regbez!);
  const subtitle = drill.school
    ? `${SCHOOL_FORM_LABELS[drill.school.schoolForm]} · ${drill.school.city} · Schulnummer ${drill.school.id}`
    : drill.gemeinde
      ? `Stadt/Gemeinde · ${drill.kreis ? kreisLabel(drill.kreis) : ''}`
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
        // Desktop: so hoch wie der Inhalt, höchstens bis zum unteren Rand – kein leerer Kasten.
        'md:inset-x-auto md:top-3 md:right-3 md:bottom-auto md:max-h-[calc(100%-1.5rem)] md:w-[360px] md:rounded-2xl md:shadow-md',
      )}
    >
      <header className="flex items-start gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-base font-bold">{title}</h2>
            <DataBadge live={row?.liveN != null} />
          </div>
          <p className="truncate text-xs text-muted">{subtitle}</p>
          <div className={cn('mt-1.5 flex flex-wrap items-center gap-2', factMode && 'hidden')}>
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
      {!expanded && radar && tension?.level && (
        <p className="px-4 pb-3 text-xs text-fg md:hidden">
          Spannungs-Index {Math.round(tension.index ?? 0)} · {TENSION_INFO[tension.level].label}
        </p>
      )}
      {!expanded && factMode && (
        <p className="px-4 pb-3 text-xs text-fg md:hidden">
          Amtliche Daten zu diesem Gebiet · <span className="font-semibold text-accent">Aufklappen</span>
        </p>
      )}
      {!expanded && !radar && !factMode && gaps.weaknesses[0] && (
        <p className="px-4 pb-3 text-xs text-fg md:hidden">
          Größte Baustelle: {gaps.weaknesses[0].icon} {gaps.weaknesses[0].title} (
          {formatDelta(gaps.weaknesses[0].delta)} vs. NRW) ·{' '}
          <span className="font-semibold text-accent">Was hilft? Aufklappen</span>
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
        {radar && (
          <RadarSection
            tension={tension}
            allowed={tensionAllowed}
            row={row}
            publishScope={drill.kreis ? 'kreis' : 'regbez'}
            publishRegionId={(drill.kreis ?? drill.regbez)!.properties.id}
          />
        )}
        {factMode ? (
          <FactsSection drill={drill} detailed />
        ) : (
          <>
            <GapDetails gaps={gaps} hasData={row?.score != null} />
            <div className="mt-4">
              <FactsSection drill={drill} />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

/**
 * Kennzeichnung der Datenbasis (#160, ADR-012/013): „Live-Stimmen“, sobald mindestens K_MIN echte Abgaben
 * aus dem Mood-Check in der Einheit stecken (`liveN`), sonst kein Kennzeichen.
 */
function DataBadge({ live }: { live: boolean }) {
  // Nur das Positive kennzeichnen; „noch keine Live-Stimmen“ sagt die Stimmenzahl schon.
  return live ? (
    <span
      className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent"
      title="Enthält mindestens 10 echte Stimmen aus dem Mood-Check"
    >
      Live-Stimmen
    </span>
  ) : null;
}

/** Frühwarn-Radar (#42): Index, Trend, Treiber, Handlungsvorschläge und Weg zu „Antwort veröffentlichen“ (#43). */
function RadarSection({
  tension,
  allowed,
  row,
  publishScope,
  publishRegionId,
}: {
  tension: TensionRow | undefined;
  allowed: boolean;
  row: AggregateRow | undefined;
  publishScope: 'regbez' | 'kreis';
  publishRegionId: string;
}) {
  const box = 'mb-4 rounded-xl bg-subtle p-3 text-sm';
  if (!allowed) {
    return (
      <p className={cn(box, 'text-muted')}>
        Der Spannungs-Index je Schule ist nur in der Ansicht „Ministerium“ sichtbar.
      </p>
    );
  }
  if (!tension?.level || tension.index == null) {
    return (
      <p className={cn(box, 'text-muted')}>
        Für den Spannungs-Index gibt es hier noch zu wenige Stimmen (mindestens 10).
      </p>
    );
  }
  const info = TENSION_INFO[tension.level];
  const drivers = tension.drivers.map((slug) => ({ slug, topic: TOPICS.find((t) => t.slug === slug) }));
  const suggestions = suggestionsFor(tension.drivers);
  return (
    <section className={box} aria-label="Frühwarn-Radar">
      <h3 className="mb-2 flex items-center gap-1.5 font-semibold">
        <Radar aria-hidden className="size-4" /> Frühwarn-Radar
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: info.color, color: info.textColor }}
        >
          {Math.round(tension.index)} · {info.label}
        </span>
        {tension.trend != null && (
          <span className="text-xs text-muted">
            {tension.trend > 0 ? '↗' : tension.trend < 0 ? '↘' : '→'} {formatDelta(tension.trend)} zur
            Vorwoche
          </span>
        )}
      </div>
      {drivers.length > 0 && (
        <p className="mt-2 text-xs">
          <span className="text-muted">Treiber: </span>
          {drivers.map(({ slug, topic }, i) => (
            <span key={slug}>
              {i > 0 && ', '}
              {topic?.icon} {topic?.title ?? slug}
              {row?.topicScores?.[slug] != null && ` (${Math.round(row.topicScores[slug]!)})`}
            </span>
          ))}
        </p>
      )}
      {suggestions.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
          {suggestions.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
      <Link
        to={publishAnswerHref(publishScope, publishRegionId, tension.drivers[0])}
        className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-fg hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <Megaphone aria-hidden className="size-3.5" /> Antwort veröffentlichen
      </Link>
    </section>
  );
}

function GapDetails({ gaps, hasData }: { gaps: GapAnalysis; hasData: boolean }) {
  if (!hasData) {
    return (
      <div className="rounded-xl bg-subtle p-3 text-sm text-muted">
        <p>
          Noch zu wenige Stimmen für eine Auswertung. Ab 10 Stimmen erscheinen hier die Werte – so bleibt
          niemand erkennbar.
        </p>
        <Link
          to="/check"
          className="mt-2 inline-flex min-h-9 items-center font-semibold text-accent underline"
        >
          Jetzt mitmachen
        </Link>
      </div>
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
      {gaps.weaknesses[0] && <WhatHelps topic={gaps.weaknesses[0]} />}
      <GapList
        title="Top 3 Stärken"
        icon={<TrendingUp aria-hidden className="size-4 text-accent" />}
        items={gaps.strengths}
        empty="Kein Thema liegt deutlich über dem NRW-Schnitt."
      />
      <details className="group">
        <summary className="cursor-pointer text-sm font-semibold">Alle Themen vs. NRW</summary>
        <ul className="mt-2 space-y-2.5">
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
      </details>
    </div>
  );
}

/** Zur größten Baustelle direkt die am besten belegten Maßnahmen aus dem Katalog – mit Quelle. */
function WhatHelps({ topic }: { topic: TopicGap }) {
  const measures = measuresForTopic(topic.slug);
  if (measures.length === 0) return null;
  return (
    <section aria-label={`Was hilft bei ${topic.title}`} className="rounded-xl bg-accent/10 p-3">
      <h3 className="text-sm font-semibold">Was hilft bei „{topic.title}“?</h3>
      <p className="text-[11px] text-muted">Aus dem Maßnahmenkatalog, am besten belegte zuerst</p>
      <ul className="mt-2 space-y-2">
        {measures.map((measure) => (
          <li key={measure.id} className="rounded-lg bg-card p-2.5 ring-1 ring-border">
            <Link
              to={`/massnahmen?topic=${topic.slug}#${measure.id}`}
              className="flex items-start gap-2 text-sm font-semibold hover:underline"
            >
              <EvidenceBadge level={measure.evidence} />
              {measure.title}
            </Link>
            <SourceLine sources={measure.sources.slice(0, 2)} className="mt-1.5 pl-8 text-[11px]" />
          </li>
        ))}
      </ul>
      <Link
        to={`/massnahmen?topic=${topic.slug}`}
        className="mt-2 inline-flex min-h-9 items-center text-xs font-semibold text-accent underline"
      >
        Alle Maßnahmen zu diesem Thema
      </Link>
    </section>
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

import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { filterTopics, type FilterTopic } from './topicSearch';

interface TopicFilterProps {
  topics: readonly FilterTopic[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}

/**
 * Themenwahl der Karte: ein Knopf mit dem aktuellen Thema, der die durchsuchbare Liste öffnet.
 * Bewusst keine Chip-Reihe mehr – ein Bedienelement statt fünf.
 */
export function TopicFilter({ topics, selectedSlug, onSelect }: TopicFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const panelId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const current = topics.find((topic) => topic.slug === selectedSlug) ?? topics[0]!;
  const result = useMemo(() => filterTopics(topics, query), [topics, query]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function choose(slug: string) {
    onSelect(slug);
    setOpen(false);
    setQuery('');
  }

  const sections = query.trim()
    ? [{ title: null as string | null, items: result.topics }]
    : [
        { title: 'Gesamt', items: result.topics.filter((topic) => topic.slug === 'all') },
        { title: 'Pflichtthemen', items: result.topics.filter((topic) => topic.mandatory) },
        {
          title: 'Weitere Themen',
          items: result.topics.filter((topic) => !topic.mandatory && topic.slug !== 'all'),
        },
      ].filter((section) => section.items.length > 0);

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Thema: ${current.title}`}
        className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-fg transition-colors hover:border-muted/40 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <span aria-hidden>{current.icon}</span>
        <span className="truncate">{current.title}</span>
        <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-fg/30 md:absolute md:inset-auto md:bg-transparent"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Thema wählen"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[75dvh] flex-col rounded-t-3xl bg-card shadow-2xl ring-1 ring-border md:absolute md:inset-auto md:top-full md:left-0 md:mt-2 md:max-h-[28rem] md:w-[28rem] md:rounded-2xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Thema wählen</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Thema-Auswahl schließen"
                className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-fg"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="border-b border-border p-3">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Suchen … (Regex: /ki|stress/i)"
                  aria-label="Thema suchen"
                  className="min-h-11 w-full rounded-xl bg-subtle py-2 pr-9 pl-9 text-sm text-fg ring-1 ring-border outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Suche löschen"
                    className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-card hover:text-fg"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
              </label>
              {result.error && (
                <p role="alert" className="mt-2 text-xs text-mood-1">
                  {result.error}
                </p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {sections.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted">Keine Themen gefunden.</p>
              ) : (
                <div className="space-y-4">
                  {sections.map((section) => (
                    <section key={section.title ?? 'results'}>
                      {section.title && (
                        <h3 className="mb-2 px-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
                          {section.title}
                        </h3>
                      )}
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {section.items.map((topic) => {
                          const selected = topic.slug === selectedSlug;
                          return (
                            <button
                              key={topic.slug}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => choose(topic.slug)}
                              className={cn(
                                'flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm ring-1 transition-colors',
                                selected
                                  ? 'bg-primary text-primary-fg ring-primary'
                                  : 'bg-card text-fg ring-border hover:bg-subtle',
                              )}
                            >
                              <span
                                aria-hidden
                                className={cn(
                                  'size-1.5 shrink-0 rounded-full',
                                  selected ? 'bg-primary-fg/80' : 'bg-muted/60',
                                )}
                              />
                              <span className="min-w-0 flex-1 truncate">{topic.title}</span>
                              {topic.mandatory && (
                                <span
                                  className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                                    selected ? 'bg-white/20' : 'bg-subtle text-muted',
                                  )}
                                >
                                  Pflicht
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>

            <p className="border-t border-border px-4 py-2 text-xs text-muted">
              Tipp: Regex mit <code>/muster/flags</code>, z. B. <code>/ki|stress/i</code>
            </p>
          </div>
        </>
      )}
    </div>
  );
}

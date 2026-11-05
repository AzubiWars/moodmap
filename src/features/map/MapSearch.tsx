import { MapPin, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { type School, SCHOOL_FORMS } from '@/types';
import type { MapFilters } from './filters';
import type { RegionCollection, RegionFeature } from './geo';
import { SCHOOL_FORM_LABELS } from './schools';
import { MIN_SEARCH_LENGTH, type MapSearchResult, searchMap } from './searchCatalog';

interface MapSearchProps {
  schools?: readonly School[];
  directorySchools?: readonly School[];
  kreise?: RegionCollection;
  regbez?: RegionCollection;
  /** Aktive Kartenfilter – sie gelten auch für die Trefferliste (#303). */
  filters?: MapFilters;
  onChangeFilters?: (filters: MapFilters) => void;
  onSelectSchool: (school: School) => void;
  onSelectDirectorySchool?: (school: School) => void;
  /** Lädt das große Schulverzeichnis erst beim ersten Suchen. */
  onRequestDirectory?: () => void;
  /** Meldet, ob das Treffer-Panel offen ist – die Karte lädt dann die Schulen lazily (#250). */
  onOpenChange?: (open: boolean) => void;
  onSelectCity: (city: string) => void;
  onSelectRegion: (region: RegionFeature) => void;
}

const GROUP_LABELS: Record<MapSearchResult['kind'], string> = {
  school: 'Schulen',
  city: 'Städte',
  kreis: 'Kreise & Städte',
  regbez: 'Regierungsbezirke',
};

const GROUP_ORDER: MapSearchResult['kind'][] = ['school', 'city', 'kreis', 'regbez'];

/** Schnellsuche für Schulen, Städte und Regionen direkt auf der Karte. */
export function MapSearch({
  schools,
  directorySchools,
  kreise,
  regbez,
  filters,
  onChangeFilters,
  onSelectSchool,
  onSelectDirectorySchool,
  onRequestDirectory,
  onOpenChange,
  onSelectCity,
  onSelectRegion,
}: MapSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = useMemo(
    () =>
      searchMap(query, {
        schools,
        directorySchools,
        kreise,
        regbez,
        filters: { schoolForm: filters?.schoolForm, directory: filters?.directory },
      }),
    [query, schools, directorySchools, kreise, regbez, filters?.schoolForm, filters?.directory],
  );
  const tooShort = query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH;
  const showResults = open && query.trim().length >= MIN_SEARCH_LENGTH;
  const activeSearchFilters = (filters?.schoolForm.length ?? 0) + (filters && !filters.directory ? 1 : 0);
  // Filterchips nur zeigen, solange die Suche benutzt wird – oder wenn ein Filter aktiv ist.
  const showFilterRow = focused || activeSearchFilters > 0;
  const valuesOnlyFilters =
    (filters?.gradeBand.length ?? 0) > 0 || (filters != null && filters.period !== 'week');

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function choose(result: MapSearchResult) {
    if (result.directory && result.school) onSelectDirectorySchool?.(result.school);
    else if (result.school) onSelectSchool(result.school);
    else if (result.city) onSelectCity(result.city);
    else if (result.region) onSelectRegion(result.region);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  }

  function clear() {
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  }

  function selectionIfAvailable() {
    if (!filters || !onChangeFilters) return null;
    return (next: Partial<MapFilters>) => onChangeFilters({ ...filters, ...next });
  }

  function toggleForm(form: (typeof SCHOOL_FORMS)[number]) {
    const update = selectionIfAvailable();
    if (!update || !filters) return;
    update({
      schoolForm: filters.schoolForm.includes(form)
        ? filters.schoolForm.filter((value) => value !== form)
        : [...filters.schoolForm, form],
    });
  }

  function resetSearchFilters() {
    selectionIfAvailable()?.({ schoolForm: [], directory: true });
  }

  return (
    <div
      ref={rootRef}
      className="relative w-full max-w-sm"
      role="search"
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <label className="relative block">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (event.target.value.trim().length >= MIN_SEARCH_LENGTH) onRequestDirectory?.();
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
            onRequestDirectory?.();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false);
              inputRef.current?.blur();
            }
            if (event.key === 'Enter' && results[0]) {
              event.preventDefault();
              choose(results[0]);
            }
          }}
          placeholder="Schule oder Stadt suchen …"
          aria-label="Schule oder Stadt suchen"
          aria-controls={showResults ? listId : undefined}
          aria-expanded={showResults}
          className="min-h-10 w-full rounded-xl bg-subtle py-2 pr-9 pl-9 text-sm text-fg ring-1 ring-border outline-none placeholder:text-muted focus:ring-2 focus:ring-accent [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Suche löschen"
            className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-card hover:text-fg"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </label>

      {showFilterRow && (
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">Schulform</span>
            {activeSearchFilters > 0 && onChangeFilters && (
              <button
                type="button"
                onClick={resetSearchFilters}
                className="text-[11px] font-medium text-accent hover:underline"
              >
                Zurücksetzen
              </button>
            )}
          </div>
          <div
            role="group"
            aria-label="Treffer nach Schulform filtern"
            className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5"
          >
            {SCHOOL_FORMS.map((form) => {
              const selected = filters?.schoolForm.includes(form) ?? false;
              return (
                <button
                  key={form}
                  type="button"
                  aria-pressed={selected}
                  disabled={!onChangeFilters}
                  onClick={() => toggleForm(form)}
                  className={cn(
                    'min-h-8 shrink-0 rounded-full border px-2.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
                    selected
                      ? 'border-primary bg-primary text-primary-fg'
                      : 'border-border bg-card text-fg hover:border-muted/40 hover:bg-subtle',
                  )}
                >
                  {SCHOOL_FORM_LABELS[form]}
                </button>
              );
            })}
          </div>
          <label className="flex min-h-9 cursor-pointer items-center justify-between gap-3 px-1 text-xs">
            <span>Auch Schulen ohne Stimmungsdaten</span>
            <input
              type="checkbox"
              role="switch"
              checked={filters?.directory ?? true}
              disabled={!onChangeFilters}
              onChange={(event) => selectionIfAvailable()?.({ directory: event.target.checked })}
              className="size-4 shrink-0 accent-primary"
            />
          </label>
          {valuesOnlyFilters && (
            <p className="px-1 text-[11px] text-muted">
              Stufe und Zeitraum wirken auf die Kartenwerte, nicht auf die Suche.
            </p>
          )}
        </div>
      )}

      {tooShort && <p className="mt-1 text-[11px] text-muted">Bitte mindestens 2 Zeichen eingeben.</p>}

      {showResults && (
        <div
          id={listId}
          className="absolute top-full left-0 z-50 mt-2 max-h-[min(24rem,60dvh)] w-[min(24rem,calc(100vw-2.5rem))] overflow-y-auto rounded-2xl bg-card p-2 shadow-xl ring-1 ring-border"
        >
          {results.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted">
              <p>
                {activeSearchFilters > 0
                  ? `Keine Treffer für „${query.trim()}“ mit den aktiven Filtern.`
                  : `Keine Treffer für „${query.trim()}“. Versuch es mit Schulname, Stadt oder Schulnummer.`}
              </p>
              {activeSearchFilters > 0 && onChangeFilters && (
                <button
                  type="button"
                  onClick={resetSearchFilters}
                  className="mt-2 font-medium text-accent hover:underline"
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {GROUP_ORDER.map((kind) => {
                const group = results.filter((result) => result.kind === kind);
                if (group.length === 0) return null;
                return (
                  <section key={kind} aria-label={GROUP_LABELS[kind]}>
                    <h3 className="px-2 py-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
                      {GROUP_LABELS[kind]}
                    </h3>
                    <ul>
                      {group.map((result) => (
                        <li key={result.key}>
                          <button
                            type="button"
                            onClick={() => choose(result)}
                            className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                          >
                            <MapPin aria-hidden className="size-4 shrink-0 text-muted" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{result.label}</span>
                              <span className="block truncate text-xs text-muted">{result.detail}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

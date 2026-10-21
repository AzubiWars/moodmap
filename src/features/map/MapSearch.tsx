import { MapPin, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { School } from '@/types';
import type { RegionCollection, RegionFeature } from './geo';
import { MIN_SEARCH_LENGTH, type MapSearchResult, searchMap } from './mapSearch';

interface MapSearchProps {
  schools?: readonly School[];
  kreise?: RegionCollection;
  regbez?: RegionCollection;
  onSelectSchool: (school: School) => void;
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
  kreise,
  regbez,
  onSelectSchool,
  onSelectCity,
  onSelectRegion,
}: MapSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = useMemo(
    () => searchMap(query, { schools, kreise, regbez }),
    [query, schools, kreise, regbez],
  );
  const tooShort = query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH;
  const showResults = open && query.trim().length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function choose(result: MapSearchResult) {
    if (result.school) onSelectSchool(result.school);
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

  return (
    <div ref={rootRef} className="relative w-full max-w-sm" role="search">
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
          }}
          onFocus={() => query.trim() && setOpen(true)}
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
          className="min-h-10 w-full rounded-xl bg-subtle py-2 pr-9 pl-9 text-sm text-fg ring-1 ring-border outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
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

      {tooShort && <p className="mt-1 text-[11px] text-muted">Bitte mindestens 2 Zeichen eingeben.</p>}

      {showResults && (
        <div
          id={listId}
          className="absolute top-full left-0 z-50 mt-2 max-h-[min(24rem,60dvh)] w-[min(24rem,calc(100vw-2.5rem))] overflow-y-auto rounded-2xl bg-card p-2 shadow-xl ring-1 ring-border"
        >
          {results.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted">
              Keine Treffer für „{query.trim()}“. Versuch es mit Schulname, Stadt oder Schulnummer.
            </p>
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

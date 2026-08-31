import { useState } from 'react';
import { Badge, IconGlobe, IconSearch, IconTarget, Input, Skeleton, Tag, useRovingFocus } from '~ui';
import type { EventSetView } from '../types';
import { railLine, setName, summarize } from '../lib/summary';

interface SetRailProps {
  sets: readonly EventSetView[];
  activeId: string | null;
  loading: boolean;
  onSelect: (setId: string) => void;
}

/**
 * The sets, in the order they take effect: the default first, then the ones
 * that override it for the ads they name.
 *
 * The two groups are the model — a custom set exists only to say something
 * different from the default about a handful of ads, and a flat list of
 * thirty-one names hides which one is the fallback. The background is painted
 * here rather than on `SplitPane`'s `<aside>` because below the collapse band
 * there is no aside at all and this nav is the whole screen.
 */
export function SetRail({ sets, activeId, loading, onSelect }: SetRailProps) {
  const [query, setQuery] = useState('');

  const q = query.trim().toLocaleLowerCase();
  const matches = (set: EventSetView) => q === '' || setName(set).toLocaleLowerCase().includes(q);
  const groups = [
    { title: 'Default', items: sets.filter((set) => set.isBase && matches(set)) },
    { title: 'Custom sets', items: sets.filter((set) => !set.isBase && matches(set)) },
  ].filter((group) => group.items.length > 0);

  /* One roving Tab stop over every visible row, in rail order. */
  const rows = groups.flatMap((group) => group.items);
  const roving = useRovingFocus(rows.length, { orientation: 'vertical', labels: rows.map(setName) });
  const indexOf = (setId: string) => rows.findIndex((set) => set.id === setId);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-raised" onKeyDown={roving.onKeyDown}>
      <div className="relative shrink-0 border-b border-border px-3 py-2">
        <IconSearch
          size={14}
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-text-faint"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a set…"
          aria-label="Find a set"
          className="pl-8 text-xs"
        />
      </div>

      <nav aria-label="Event sets" className="min-h-0 flex-1 overflow-y-auto">
        {loading && sets.length === 0 ? (
          <div className="flex flex-col gap-2 p-3" aria-busy="true" aria-label="Loading event sets">
            <Skeleton variant="block" height="2rem" />
            <Skeleton variant="block" height="2rem" />
            <Skeleton variant="block" height="2rem" />
          </div>
        ) : null}

        {!loading && groups.length === 0 && sets.length > 0 ? (
          <p className="p-3 text-xs text-text-muted">No set matches “{query.trim()}”.</p>
        ) : null}

        {groups.map((group) => (
          <section
            key={group.title}
            aria-label={group.title}
            className="border-b border-border-subtle py-1 last:border-b-0"
          >
            <div className="px-3 py-1.5">
              <span className="text-micro font-semibold uppercase tracking-wide text-text-faint">{group.title}</span>
            </div>
            <ul role="list">
              {group.items.map((set) => {
                const summary = summarize(set);
                const selected = set.id === activeId;
                return (
                  <li key={set.id}>
                    <button
                      type="button"
                      {...roving.itemProps(indexOf(set.id))}
                      onClick={() => onSelect(set.id)}
                      aria-current={selected ? 'true' : undefined}
                      title={railLine(set)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring ${
                        selected ? 'bg-accent-soft' : ''
                      }`}
                    >
                      <span className="shrink-0 text-text-muted">
                        {set.isBase ? <IconGlobe size={14} /> : <IconTarget size={14} />}
                      </span>
                      <span className={`min-w-0 flex-1 truncate text-sm text-text ${selected ? 'font-medium' : ''}`}>
                        {setName(set)}
                      </span>
                      {!set.enabled ? <Tag tone="neutral">Off</Tag> : null}
                      {summary.silent ? <Tag tone="warning">Silent</Tag> : null}
                      <Badge count={summary.events} tone="muted" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
    </div>
  );
}

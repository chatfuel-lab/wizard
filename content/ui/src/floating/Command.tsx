import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { IconSearch } from '../icons';
import { filterAcross, highlightRanges, type FilterText, type TextRange } from '../lib/data/filter';
import { Kbd } from '../primitives/Kbd';
import { Overlay } from '../overlay/Overlay';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  /** Extra search terms that never render — "won", "close", "money". */
  keywords?: readonly string[];
  icon?: ReactNode;
  shortcut?: readonly string[];
  disabled?: boolean;
  onSelect: () => void;
}

export interface CommandGroup {
  id: string;
  label?: string;
  items: readonly CommandItem[];
}

export interface CommandProps {
  open: boolean;
  onClose: () => void;
  groups: readonly CommandGroup[];
  /** Controlled query. Omit to let the palette own it. */
  query?: string;
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  empty?: ReactNode;
  /** Footer hints under the list. Omit for the standard navigate/run/close row; null for no footer at all. */
  footer?: ReactNode;
}

interface Match {
  item: CommandItem;
  group: CommandGroup;
  /** Ranges into the label, empty when the hit came from a keyword. */
  ranges: TextRange[];
  /** Position in the rendered list — what the arrow keys and Enter address. */
  index: number;
}

interface Section {
  group: CommandGroup;
  matches: Match[];
}

/**
 * How much a hit in the description is worth against the same hit in the
 * label. Half: a description is prose, and prose contains most short strings
 * somewhere — "Hands Maria back to the bot — you pick which flow runs" has an
 * n, an e and a w in that order, and at full weight that scattered hit sat
 * above "New conversation" in the group below. At half, a description PREFIX
 * lands between a label's mid-word hit and its scattered one: still found,
 * never first over a label that actually contains the query.
 */
const DESCRIPTION_WEIGHT = 0.5;

const searchable = (item: CommandItem): FilterText[] => [
  item.label,
  { text: item.description ?? '', weight: DESCRIPTION_WEIGHT },
  ...(item.keywords ?? []),
];

/**
 * The keyboard hints every palette was writing by hand, identically. The
 * default for `footer` rather than a hardwired row, so a caller can still
 * replace it — or pass null to drop the strip entirely.
 */
function FooterHints() {
  return (
    <>
      <span className="flex items-center gap-1">
        <Kbd keys={['up']} />
        <Kbd keys={['down']} /> navigate
      </span>
      <span className="flex items-center gap-1">
        <Kbd keys={['enter']} /> run
      </span>
      <span className="flex items-center gap-1">
        <Kbd keys={['esc']} /> close
      </span>
    </>
  );
}

function Highlighted({ text, ranges }: { text: string; ranges: readonly TextRange[] }) {
  return (
    <>
      {highlightRanges(text, ranges).map((segment, index) =>
        segment.match ? (
          <mark key={index} className="bg-transparent font-semibold text-accent">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

/**
 * ⌘K palette.
 *
 * Focus never leaves the input — the list is driven by `aria-activedescendant`,
 * which is what lets a user keep typing while arrowing through results. Moving
 * real DOM focus onto the rows would break the input's caret and force a
 * refocus on every keystroke.
 *
 * It is an Overlay rather than a FloatingSurface: it is modal, has no anchor,
 * and wants the scrim and scroll lock that Overlay already owns.
 */
export function Command({
  open,
  onClose,
  groups,
  query: controlledQuery,
  onQueryChange,
  placeholder = 'Type a command or search…',
  empty = 'No results',
  footer = <FooterHints />,
}: CommandProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [innerQuery, setInnerQuery] = useState('');
  const [active, setActive] = useState(0);

  const query = controlledQuery ?? innerQuery;
  const setQuery = (next: string) => {
    if (controlledQuery === undefined) setInnerQuery(next);
    onQueryChange?.(next);
  };

  /* One ranked list across every group — `filterAcross` says why rows, not
   * groups, compete. With a query the list renders FLAT in that order, each row
   * carrying its group's label as a hint; with none, the same list is the
   * author's order and is sectioned under its headings for browsing. Either
   * way the render order is the keyboard order: the arrow keys walk one list.
   * Disabled items are dropped BEFORE ranking so they hold no position. */
  const browsing = query.trim() === '';
  const { sections, flat } = useMemo(() => {
    const offered = groups.map((group) => ({ ...group, items: group.items.filter((item) => !item.disabled) }));
    const flat = filterAcross(offered, query, searchable).map((match, index): Match => ({
      item: match.item,
      group: match.group,
      /* Only highlight when the label itself matched; underlining random
           characters because a hidden keyword hit is worse than no highlight. */
      ranges: match.index === 0 ? match.ranges : [],
      index,
    }));
    /* Consecutive runs of one group — with an empty query the list is in author
       order, so each group is exactly one run. */
    const sections: Section[] = [];
    for (const match of flat) {
      const last = sections[sections.length - 1];
      if (last && last.group.id === match.group.id) last.matches.push(match);
      else sections.push({ group: match.group, matches: [match] });
    }
    return { sections, flat };
  }, [groups, query]);

  /* A shrinking result set must not leave the highlight past the end. */
  useEffect(() => setActive((index) => (index >= flat.length ? 0 : index)), [flat.length]);
  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    setActive(0);
    if (controlledQuery === undefined) setInnerQuery('');
  }, [open, controlledQuery]);

  /* Keep the highlighted row on screen without scrolling the page. */
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const activeId = flat[active] ? `${listId}-${flat[active]!.item.id}` : undefined;

  const run = (item: CommandItem) => {
    onClose();
    item.onSelect();
  };

  /* `hint`: the group's label at the row's right edge. Only on the flat,
     ranked list — under a heading it would repeat what the heading says. */
  const renderRow = (match: Match, hint: boolean) => {
    const isActive = match.index === active;
    return (
      <div
        key={match.item.id}
        id={`${listId}-${match.item.id}`}
        role="option"
        aria-selected={isActive}
        data-active={isActive}
        onPointerMove={() => setActive(match.index)}
        onClick={() => run(match.item)}
        className={`flex cursor-pointer items-center gap-2.5 rounded-control px-2 py-2 text-sm ${
          isActive ? 'bg-surface-hover text-text' : 'text-text-muted'
        }`}
      >
        {match.item.icon !== undefined ? <span className="shrink-0 text-text-muted">{match.item.icon}</span> : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-text">
            <Highlighted text={match.item.label} ranges={match.ranges} />
          </span>
          {match.item.description !== undefined ? (
            <span className="block truncate text-xs text-text-faint">{match.item.description}</span>
          ) : null}
        </span>
        {hint && match.group.label !== undefined ? (
          <span className="shrink-0 text-xs text-text-faint">{match.group.label}</span>
        ) : null}
        {match.item.shortcut ? <Kbd keys={match.item.shortcut} className="shrink-0" /> : null}
      </div>
    );
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (flat.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % flat.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index - 1 + flat.length) % flat.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(flat.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const match = flat[active];
      if (match) run(match.item);
    }
  };

  return (
    <Overlay open={open} onClose={onClose} align="center" initialFocusRef={inputRef}>
      {(state) => (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          data-state={state}
          className="mt-[12vh] flex max-h-[70vh] w-full max-w-xl flex-col self-start overflow-hidden rounded-card border border-border bg-surface-overlay shadow-modal data-[state=entering]:animate-scale-in data-[state=exiting]:animate-scale-out"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-3">
            <IconSearch size={16} className="shrink-0 text-text-faint" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              value={query}
              placeholder={placeholder}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              className="h-topbar w-full bg-transparent text-sm text-text outline-none placeholder:text-text-faint"
            />
          </div>

          <div ref={listRef} id={listId} role="listbox" className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {flat.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-text-muted">{empty}</div>
            ) : browsing ? (
              sections.map(({ group, matches }) => (
                <div key={group.id} className="mb-1 last:mb-0">
                  {group.label !== undefined ? (
                    <div className="px-2 pb-1 pt-1.5 text-micro font-medium uppercase tracking-wide text-text-faint">
                      {group.label}
                    </div>
                  ) : null}
                  {matches.map((match) => renderRow(match, false))}
                </div>
              ))
            ) : (
              flat.map((match) => renderRow(match, true))
            )}
          </div>

          {footer !== undefined && footer !== null ? (
            <div className="flex shrink-0 items-center gap-3 border-t border-border bg-surface-sunken px-3 py-2 text-xs text-text-faint">
              {footer}
            </div>
          ) : null}
        </div>
      )}
    </Overlay>
  );
}

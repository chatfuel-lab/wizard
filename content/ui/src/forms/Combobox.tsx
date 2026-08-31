import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { FloatingSurface } from '../floating/FloatingSurface';
import { IconCheck, IconChevronDown, IconClose } from '../icons';
import { filterItems, highlightRanges, type TextRange } from '../lib/data/filter';
import { groupOptions, ungroupedCount } from '../lib/data/optionGroups';
import { Button } from '../primitives/Button';
import { Spinner } from '../primitives/Spinner';

interface ComboboxMatch {
  option: ComboboxOption;
  /** Empty when the list is unfiltered or the hit came from a hidden keyword. */
  ranges: readonly TextRange[];
}

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  /** Extra search terms that never render. */
  keywords?: readonly string[];
  icon?: ReactNode;
  disabled?: boolean;
  /**
   * Section this option belongs to, rendered as a header above its run.
   *
   * Options carry the group rather than the caller passing sections, because
   * the list is filtered: a section that lost all its options to the query
   * would leave an orphan header, and a caller rebuilding its section array on
   * every keystroke is the same bug moved outside. Options with no group come
   * first, header-free — a list where nothing declares one renders exactly as
   * it always did.
   *
   * The header is NOT searched. Typing "custom" finds an attribute called
   * custom, not every attribute filed under "Custom fields": a query that
   * matched a heading would silently pull in rows whose own text has nothing
   * to do with what was typed.
   */
  group?: string;
}

export interface ComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: readonly ComboboxOption[];
  placeholder?: string;
  /**
   * Take over filtering. Given this, `options` is used exactly as passed —
   * which is what a server-side search needs, since the local list is only
   * ever the current page of results.
   */
  onSearch?: (query: string) => void;
  loading?: boolean;
  /** Renders a "Create …" row when the query matches nothing. */
  onCreate?: (label: string) => void;
  createLabel?: (query: string) => string;
  /** Offer an × to go back to no selection. */
  clearable?: boolean;
  disabled?: boolean;
  empty?: ReactNode;
  'aria-label'?: string;
  className?: string;
}

const searchable = (option: ComboboxOption): string[] => [
  option.label,
  option.description ?? '',
  ...(option.keywords ?? []),
];

/**
 * Filtering single-select.
 *
 * Focus never leaves the input — `aria-activedescendant` marks the highlighted
 * row. That is the listbox pattern, and the only version of it that lets a user
 * keep typing while arrowing: moving real focus onto the options would blur the
 * input on every keystroke.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  onSearch,
  loading = false,
  onCreate,
  createLabel = (query) => `Create “${query}”`,
  clearable = false,
  disabled = false,
  empty = 'No matches',
  className = '',
  ...aria
}: ComboboxProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((option) => option.value === value) ?? null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selected?.label ?? '');
  /* Untouched query = show everything. Without this, opening a combobox that
   * already has a value would filter down to just that one option. */
  const [dirty, setDirty] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) setQuery(selected?.label ?? '');
  }, [open, selected]);

  /* Disabled options stay in the list, greyed and unselectable, so a picker can
   * SAY why a hit cannot be chosen ("only WhatsApp contacts can be booked")
   * instead of silently dropping it — a hit that vanishes reads as "not found". */
  const filtered = useMemo<ComboboxMatch[]>(() => {
    if (onSearch || !dirty) return options.map((option) => ({ option, ranges: [] }));
    return filterItems(options, query, searchable).map((match) => ({
      option: match.item,
      ranges: match.index === 0 ? match.ranges : [],
    }));
  }, [options, onSearch, dirty, query]);

  /* Grouping settles the ORDER before anything indexes into it, so headers
   * never enter the index space: `active`, `aria-activedescendant` and the
   * arrow-key skip below all count options and only options. See
   * lib/data/optionGroups.ts — with no groups declared this is `filtered` itself. */
  const grouped = useMemo(() => groupOptions(filtered, (match) => match.option.group), [filtered]);
  const matches = grouped.order;

  const canCreate =
    onCreate !== undefined &&
    dirty &&
    query.trim() !== '' &&
    !options.some((option) => option.label.toLowerCase() === query.trim().toLowerCase());

  const rowCount = matches.length + (canCreate ? 1 : 0);

  useEffect(() => setActive((index) => (index >= rowCount ? 0 : index)), [rowCount]);

  const close = useCallback(() => {
    setOpen(false);
    setDirty(false);
  }, []);

  const commit = (option: ComboboxOption) => {
    onChange(option.value);
    setQuery(option.label);
    close();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (rowCount === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => {
        // Skip disabled rows; give up after a full lap so an all-disabled list cannot spin.
        let next = index;
        for (let i = 0; i < rowCount; i += 1) {
          next = (next + step + rowCount) % rowCount;
          if (!matches[next]?.option.disabled) return next;
        }
        return index;
      });
      return;
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (active < matches.length) {
        const match = matches[active];
        if (match && !match.option.disabled) commit(match.option);
      } else if (canCreate) {
        onCreate?.(query.trim());
        close();
      }
      return;
    }
    if (event.key === 'Escape' && open) {
      /* Stop here so the same Escape does not also close a dialog behind. */
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === 'Tab' && open) close();
  };

  const activeId = active < rowCount ? `${listId}-${active}` : undefined;

  const renderOption = (match: ComboboxMatch, index: number) => (
    <div
      key={match.option.value}
      id={`${listId}-${index}`}
      role="option"
      aria-selected={match.option.value === value}
      aria-disabled={match.option.disabled || undefined}
      onPointerMove={() => !match.option.disabled && setActive(index)}
      onClick={() => !match.option.disabled && commit(match.option)}
      className={`flex items-center gap-2 rounded-control px-2 py-1.5 text-sm ${
        match.option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${index === active ? 'bg-surface-hover' : ''}`}
    >
      {match.option.icon !== undefined ? <span className="shrink-0 text-text-muted">{match.option.icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-text">
          {highlightRanges(match.option.label, match.ranges).map((segment, i) =>
            segment.match ? (
              <mark key={i} className="bg-transparent font-semibold text-accent">
                {segment.text}
              </mark>
            ) : (
              <span key={i}>{segment.text}</span>
            ),
          )}
        </span>
        {match.option.description !== undefined ? (
          <span className="block truncate text-xs text-text-faint">{match.option.description}</span>
        ) : null}
      </span>
      {match.option.value === value ? <IconCheck size={14} className="shrink-0 text-accent" /> : null}
    </div>
  );

  return (
    <>
      <div
        ref={anchorRef}
        className={`relative flex h-field items-center rounded-control border bg-surface-sunken transition-colors duration-fast ease-standard ${
          open ? 'border-accent' : 'border-border'
        } ${disabled ? 'opacity-60' : ''} ${className}`}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          aria-label={aria['aria-label']}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setDirty(true);
            setActive(0);
            setOpen(true);
            onSearch?.(event.target.value);
          }}
          onKeyDown={onKeyDown}
          onPointerDown={() => !disabled && setOpen(true)}
          className="h-full min-w-0 flex-1 rounded-control bg-transparent px-3 text-sm text-text outline-none placeholder:text-text-faint disabled:cursor-not-allowed"
        />

        {clearable && selected && !disabled ? (
          <Button
            iconOnly
            variant="ghost"
            size="sm"
            aria-label="Clear selection"
            onClick={() => {
              onChange(null);
              setQuery('');
              setDirty(false);
            }}
            className="mr-0.5"
          >
            <IconClose />
          </Button>
        ) : null}

        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          onClick={() => {
            setOpen(!open);
            inputRef.current?.focus();
          }}
          className="flex aspect-square h-field shrink-0 items-center justify-center text-text-faint"
        >
          <IconChevronDown
            size={16}
            className={`transition-transform duration-fast ease-standard ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <FloatingSurface
        anchorRef={anchorRef}
        open={open && !disabled}
        onDismiss={close}
        placement="bottom-start"
        matchAnchorWidth
        /* Escape is handled on the input so it can stop propagation before an
           enclosing dialog sees it. */
        closeOnEscape={false}
        id={listId}
        role="listbox"
        aria-label={aria['aria-label']}
        className="rounded-card border border-border bg-surface-overlay p-1 shadow-overlay"
      >
        {loading ? (
          <div className="flex items-center gap-2 px-2 py-3 text-sm text-text-muted">
            <Spinner size={14} /> Loading…
          </div>
        ) : rowCount === 0 ? (
          <div className="px-2 py-3 text-center text-sm text-text-muted">{empty}</div>
        ) : (
          <>
            {matches.slice(0, ungroupedCount(grouped)).map(renderOption)}

            {grouped.runs.map((run, runIndex) => {
              const headerId = `${listId}-group-${runIndex}`;
              return (
                /* role="group" with the header as its label, rather than a bare
                   heading between options: a listbox may own groups, and a div
                   of loose text between two options is neither. The header is
                   presentational so it is read as the group's NAME and not as a
                   row of its own — it cannot be highlighted or chosen, and it
                   is not in the index space the arrows walk. */
                <div key={headerId} role="group" aria-labelledby={headerId} className="mb-1 last:mb-0">
                  <div
                    id={headerId}
                    role="presentation"
                    className="px-2 pb-1 pt-1.5 text-micro font-medium uppercase tracking-wide text-text-faint"
                  >
                    {run.label}
                  </div>
                  {matches
                    .slice(run.from, run.from + run.count)
                    .map((match, offset) => renderOption(match, run.from + offset))}
                </div>
              );
            })}

            {canCreate ? (
              <div
                id={`${listId}-${matches.length}`}
                role="option"
                aria-selected={false}
                onPointerMove={() => setActive(matches.length)}
                onClick={() => {
                  onCreate?.(query.trim());
                  close();
                }}
                className={`cursor-pointer truncate rounded-control px-2 py-1.5 text-sm text-accent ${
                  active === matches.length ? 'bg-surface-hover' : ''
                }`}
              >
                {createLabel(query.trim())}
              </div>
            ) : null}
          </>
        )}
      </FloatingSurface>
    </>
  );
}

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button, IconCheck, IconImage, Spinner } from '~ui';

/**
 * The bits the three drawers share: the local selection (the drawer proposes,
 * the editor owns — `onChange` fires on Done), the footer with the counter,
 * "Clear all" and Done, a thumbnail-or-glyph, the load-more row.
 */

export interface PickerSelection {
  selected: ReadonlySet<string>;
  isSelected: (id: string) => boolean;
  /** Adds up to `maxItems`; a toggle past the ceiling is a no-op and `full` says so. */
  toggle: (id: string) => void;
  clear: () => void;
  /** Merge ids in (a paste), respecting the ceiling. */
  add: (ids: readonly string[]) => void;
  remove: (id: string) => void;
  full: boolean;
  list: () => string[];
}

/** Local selection, seeded from the editor's draft every time the drawer opens. */
export function usePickerSelection(open: boolean, initial: readonly string[], maxItems: number): PickerSelection {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(initial));
  const [order, setOrder] = useState<string[]>(() => [...initial]);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(initial));
    setOrder([...initial]);
    // Seed on open only — the draft may change under an open drawer, and the drawer's proposal wins on Done.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const remove = useCallback((id: string) => {
    setSelected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setOrder((prev) => prev.filter((x) => x !== id));
  }, []);

  const add = useCallback(
    (ids: readonly string[]) => {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) {
          if (next.size >= maxItems) break;
          next.add(id);
        }
        return next;
      });
      setOrder((prev) => {
        const next = [...prev];
        for (const id of ids) {
          if (next.length >= maxItems) break;
          if (!next.includes(id)) next.push(id);
        }
        return next;
      });
    },
    [maxItems],
  );

  const toggle = useCallback(
    (id: string) => {
      if (selected.has(id)) remove(id);
      else add([id]);
    },
    [selected, remove, add],
  );

  const clear = useCallback(() => {
    setSelected(new Set());
    setOrder([]);
  }, []);

  return {
    selected,
    isSelected: (id) => selected.has(id),
    toggle,
    clear,
    add,
    remove,
    full: selected.size >= maxItems,
    list: () => order.filter((id) => selected.has(id)),
  };
}

export interface PickerFooterProps {
  count: number;
  maxItems: number;
  /** What an empty list means on this setting — "All posts", "All ads". */
  emptyMeaning: string;
  canEdit: boolean;
  onClear: () => void;
  onDone: () => void;
  onClose: () => void;
  /** Something the drawer wants to say instead of the counter (an inline error). */
  note?: ReactNode;
}

export function PickerFooter({
  count,
  maxItems,
  emptyMeaning,
  canEdit,
  onClear,
  onDone,
  onClose,
  note,
}: PickerFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0 text-xs text-text-muted">
        {note ?? (
          <span>
            <span className="font-medium text-text">{count}</span> / {maxItems} selected
            {count === 0 ? <span className="text-text-faint"> · {emptyMeaning}</span> : null}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {canEdit ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={count === 0}
              title={`Empty the list — the rule applies to ${emptyMeaning.toLowerCase()}`}
            >
              Clear all → {emptyMeaning}
            </Button>
            <Button variant="primary" size="sm" onClick={onDone}>
              Done
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}

/** A thumbnail, or the type glyph on a sunken square when there is none. */
export function MediaThumb({
  src,
  alt,
  glyph,
  className = '',
}: {
  src: string | null | undefined;
  alt: string;
  glyph?: ReactNode;
  className?: string;
}) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" className={`bg-surface-sunken object-cover ${className}`} />
  ) : (
    <span aria-hidden className={`flex items-center justify-center bg-surface-sunken text-text-faint ${className}`}>
      {glyph ?? <IconImage size={20} />}
    </span>
  );
}

/** The check badge on a selected tile. */
export function SelectedBadge() {
  return (
    <span
      aria-hidden
      className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-fg shadow-raised"
    >
      <IconCheck size={12} />
    </span>
  );
}

export function LoadMoreRow({
  hasNext,
  loading,
  onLoadMore,
  label = 'Load more',
}: {
  hasNext: boolean;
  loading: boolean;
  onLoadMore: () => void;
  label?: string;
}) {
  if (!hasNext && !loading) return null;
  return (
    <div className="flex justify-center py-2">
      <Button variant="secondary" size="sm" disabled={loading} onClick={onLoadMore}>
        {loading ? (
          <>
            <Spinner size={12} /> Loading…
          </>
        ) : (
          label
        )}
      </Button>
    </div>
  );
}

/** A centred spinner for the first page. */
export function PickerLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex h-40 items-center justify-center gap-2 text-sm text-text-muted" role="status">
      <Spinner size={16} /> {label}
    </div>
  );
}

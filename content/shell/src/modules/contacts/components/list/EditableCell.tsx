import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SelectOption } from '~ui';

export interface EditableCellProps {
  /** Names the control for a screen reader: "Stage of Anna Koch". */
  label: string;
  /** The value an editor starts from. */
  value: string;
  /** What the cell shows when it is not being edited. */
  display: ReactNode;
  editing: boolean;
  onStart: () => void;
  onCancel: () => void;
  /**
   * `moveDown` is true when Enter committed it: the table then opens the same
   * column on the next row, which is what makes a column of values fillable
   * without touching the mouse.
   */
  onCommit: (value: string, moveDown: boolean) => void;
  editable: boolean;
  /** Present for a closed set (stage, owner, a boolean field). */
  options?: readonly SelectOption[];
  placeholder?: string;
}

/**
 * One cell that can be edited in place.
 *
 * The rules it holds, all of which have bitten a table somewhere:
 *
 * - **Escape cancels, blur saves.** A person who clicks away expects the value
 *   to be kept; a person who presses Escape expects it thrown away. Both paths
 *   end in a blur, so a `cancelled` ref decides which one the blur belongs to.
 * - **The cell owns its clicks.** The row has an `onClick` that opens the
 *   record, and without `stopPropagation` touching a select would open a panel
 *   over the thing being edited.
 * - **A commit that changed nothing sends nothing.** Every write costs a
 *   request and re-stamps `updatedAt`, which is the only clock this module has.
 *
 * Editing is CONTROLLED by the table rather than held here, because "Enter
 * moves to the cell below" is a statement about two cells and one of them does
 * not exist yet when the key is pressed.
 */
export function EditableCell({
  label,
  value,
  display,
  editing,
  onStart,
  onCancel,
  onCommit,
  editable,
  options,
  placeholder,
}: EditableCellProps) {
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  /* The draft is seeded when editing opens, not on every value change: a live
     echo landing mid-edit must not overwrite what is being typed. */
  useEffect(() => {
    if (editing) {
      cancelled.current = false;
      setDraft(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    const node = options ? selectRef.current : inputRef.current;
    node?.focus();
    if (node instanceof HTMLInputElement) node.select();
  }, [editing, options]);

  if (!editable) {
    return <span className="block min-w-0 truncate">{display}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          onStart();
        }}
        className="-mx-1 block w-full min-w-0 truncate rounded-control px-1 text-left transition-colors duration-instant ease-standard hover:bg-surface-hover focus-visible:focus-ring"
      >
        {display}
      </button>
    );
  }

  const commit = (next: string, moveDown: boolean) => {
    if (next === value) {
      onCancel();
      return;
    }
    onCommit(next, moveDown);
  };

  if (options) {
    return (
      <span onClick={(event) => event.stopPropagation()} className="block">
        <select
          ref={selectRef}
          aria-label={label}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            commit(event.target.value, false);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            cancelled.current = true;
            onCancel();
          }}
          onBlur={() => {
            if (cancelled.current) return;
            onCancel();
          }}
          className="h-7 w-full rounded-control border border-border bg-surface-raised px-1.5 text-xs text-text focus-visible:focus-ring"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    );
  }

  return (
    <span onClick={(event) => event.stopPropagation()} className="block">
      <input
        ref={inputRef}
        aria-label={label}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            cancelled.current = true;
            onCancel();
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            cancelled.current = true;
            commit(draft, true);
          }
        }}
        onBlur={() => {
          if (cancelled.current) return;
          commit(draft, false);
        }}
        className="h-7 w-full min-w-0 rounded-control border border-border bg-surface-raised px-1.5 text-xs text-text placeholder:text-text-faint focus-visible:focus-ring"
      />
    </span>
  );
}

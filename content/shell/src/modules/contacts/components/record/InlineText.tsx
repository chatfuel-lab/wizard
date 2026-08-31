import { useEffect, useRef, useState } from 'react';
import { IconClose, Spinner } from '~ui';

export interface InlineTextProps {
  value: string;
  /** Shown when the value is empty — a word, not a dash. */
  placeholder: string;
  'aria-label': string;
  disabled?: boolean;
  onSave: (next: string) => Promise<void>;
  /** `title` for the record heading, `body` everywhere else. */
  size?: 'title' | 'body';
}

/**
 * Text that becomes an input when you click it.
 *
 * `~ui`'s `Field` is the labelled, boxed version of this and is the right
 * control inside a form; a record heading is not a form. What a record page
 * needs is text that reads as a heading until it is touched — which is what
 * Attio, Twenty and Linear all do with a record's name.
 *
 * Three behaviours, and each one is a thing a person expects from an inline
 * edit and nothing else provides:
 *
 * - **Escape reverts and leaves.** Not "closes the panel": while an inline edit
 *   is open, Escape belongs to the edit. `InspectorHost` and the module's own
 *   hotkeys both already stand down for a focused text field, so the key lands
 *   here.
 * - **Enter commits, blur commits.** A person who clicks elsewhere meant to
 *   keep what they typed. Only a change is sent; re-blurring an untouched field
 *   is not a mutation.
 * - **A rejected save keeps the words.** The box stays open holding what was
 *   typed with the server's complaint under it, because the alternative is
 *   silently throwing away someone's typing.
 */
export function InlineText({
  value,
  placeholder,
  'aria-label': ariaLabel,
  disabled,
  onSave,
  size = 'body',
}: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Adopt what the server confirmed, but never while the box is open: this
     component is fed by a live subscription and the echo of one's own save
     arrives while the next keystrokes are already going in. */
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const textSize = size === 'title' ? 'text-title font-semibold' : 'text-body';

  const commit = async () => {
    const next = draft.trim();
    if (next === value.trim()) {
      setEditing(false);
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    const shown = value.trim();
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setEditing(true)}
        aria-label={ariaLabel}
        className={`-mx-1 min-w-0 truncate rounded-control px-1 text-left transition-colors duration-fast ease-standard focus-visible:focus-ring disabled:cursor-default ${textSize} ${
          shown === '' ? 'text-text-faint' : 'text-text'
        } ${disabled ? '' : 'hover:bg-surface-hover'}`}
      >
        {shown === '' ? placeholder : shown}
      </button>
    );
  }

  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="flex min-w-0 items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          aria-label={ariaLabel}
          placeholder={placeholder}
          disabled={saving}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void commit();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              setDraft(value);
              setError(null);
              setEditing(false);
            }
          }}
          className={`h-field min-w-0 flex-1 rounded-control border border-border bg-surface-raised px-2 text-text placeholder:text-text-faint focus-visible:focus-ring ${textSize}`}
        />
        {saving ? <Spinner size={14} /> : null}
      </span>
      {error ? (
        <span className="flex items-center gap-1 text-micro text-danger">
          <IconClose size={12} />
          {error}
        </span>
      ) : null}
    </span>
  );
}

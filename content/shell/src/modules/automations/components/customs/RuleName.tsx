import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Input } from '~ui';

export interface RuleNameProps {
  name: string;
  canEdit: boolean;
  /** Resolve true when saved (or unchanged); the hook toasts its own failure. */
  onRename: (next: string) => Promise<boolean>;
  className?: string;
}

export const NAME_MIN = 1;
export const NAME_MAX = 200;

/** The API's rule (`FuelyAutomationNameInvalid`), checked before the round trip. */
export function nameError(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < NAME_MIN) return 'A rule needs a name.';
  if (raw.length > NAME_MAX) return `Keep the name under ${NAME_MAX} characters.`;
  return null;
}

/**
 * The rule's name as an inline-editable field: the text is a button; a click
 * turns it into an `Input`; Enter or blur commits through `mutations.rename`
 * (optimistic, undoable, toasts on failure), Escape cancels. 1–200 chars are
 * checked here first so an empty name never leaves the card.
 */
export function RuleName({ name, canEdit, onRename, className = '' }: RuleNameProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const committing = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const cancel = () => {
    setEditing(false);
    setDraft(name);
    setError(null);
  };

  const commit = async () => {
    if (committing.current) return;
    const problem = nameError(draft);
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    committing.current = true;
    setSaving(true);
    try {
      await onRename(draft.trim());
      setEditing(false);
      setError(null);
    } finally {
      setSaving(false);
      committing.current = false;
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }
  };

  if (!canEdit) return <span className={`truncate text-sm font-semibold text-text ${className}`}>{name}</span>;

  if (editing) {
    return (
      <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => void commit()}
          maxLength={NAME_MAX + 1}
          aria-label="Rule name"
          aria-invalid={error ? true : undefined}
          disabled={saving}
          className="h-field-sm font-semibold"
        />
        {error ? (
          <span className="text-xs text-danger" role="alert">
            {error}
          </span>
        ) : (
          <span className="text-micro text-text-faint">Enter to save · Esc to cancel</span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={`Rename “${name}”`}
      title="Click to rename"
      className={`-mx-1 min-w-0 max-w-full truncate rounded-control px-1 text-left text-sm font-semibold text-text transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring ${className}`}
    >
      {name}
    </button>
  );
}

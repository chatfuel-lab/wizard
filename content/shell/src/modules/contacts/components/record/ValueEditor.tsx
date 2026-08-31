import { useEffect, useRef, useState } from 'react';
import { DateField, Input, Spinner, Switch } from '~ui';
import { shouldAdoptExternalValue, type EditorKind } from '../../lib/attributeValue';
import { toDayInput } from '../../lib/contactFields';

export interface ValueEditorProps {
  kind: EditorKind;
  /** The value exactly as the server holds it. `''` means unset. */
  value: string;
  /** The accessible name. The row's own label is a sibling, not a wrapper. */
  label: string;
  disabled?: boolean;
  placeholder?: string;
  /**
   * What was typed → the wire string, or `null` to refuse it.
   *
   * A refusal rather than a coercion, because `contactAttributeUpdate` accepts
   * ANY string for any dataType: an unparseable date is stored as prose and the
   * server-side filters that read the typed interpretation stop matching it.
   */
  toStored: (input: string) => string | null;
  /** Why a refusal happened, in the words of the field that refused. */
  invalidMessage: string;
  onCommit: (stored: string) => Promise<void>;
  /** Fence this field against a live echo while it is being typed into. */
  onHold?: () => void;
  onRelease?: () => void;
  /**
   * A note is prose. `text` only: Enter makes a new line instead of
   * committing, and the box commits on blur like every other one.
   */
  multiline?: boolean;
}

/**
 * One editable value, in whichever control its `dataType` deserves.
 *
 * Four editors, chosen by `editorFor()` rather than by the caller, so the Fields
 * tab and the key fields on Overview cannot drift apart on what
 * a boolean looks like.
 *
 * The one rule worth stating: **an external change never lands in a box that
 * has focus**. This module is fed by `contactUpdated`, which fires on every
 * attribute write including this page's own; `~ui`'s `Field`
 * adopts its `value` prop whenever it changes, which is right for a form and
 * wrong here — the echo of a save arrives while the next keystrokes are already
 * going in. `shouldAdoptExternalValue` is that rule, and it has tests.
 */
export function ValueEditor({
  kind,
  value,
  label,
  disabled,
  placeholder,
  toStored,
  invalidMessage,
  onCommit,
  onHold,
  onRelease,
  multiline,
}: ValueEditorProps) {
  /* A date editor always wants `YYYY-MM-DD`, and the wire always carries a
     millisecond string — so the conversion belongs here rather than at every
     call site, where forgetting it silently blanks the picker. */
  const shown = kind === 'date' ? toDayInput(value) : value;
  const [draft, setDraft] = useState(shown);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const committed = useRef(shown);
  const focused = useRef(false);

  /* The draft lives in a ref as well as in state, and the ref is what every
     handler reads. Escape has to put the box back and leave it, and leaving it
     means blurring the input — which dispatches the blur handler synchronously,
     inside the Escape keydown, before React has re-rendered anything. A commit
     reading the draft out of state there would read the words Escape had just
     discarded and SAVE them, which is the opposite of what the key means. The
     state draws the input; the ref is what the value actually is. */
  const draftRef = useRef(shown);
  const write = (next: string) => {
    draftRef.current = next;
    setDraft(next);
  };

  useEffect(() => {
    if (shouldAdoptExternalValue({ focused: focused.current, incoming: shown, committed: committed.current })) {
      committed.current = shown;
      draftRef.current = shown;
      setDraft(shown);
      setInvalid(null);
    }
  }, [shown]);

  const send = async (stored: string) => {
    setSaving(true);
    try {
      await onCommit(stored);
      const settled = kind === 'date' ? toDayInput(stored) : stored;
      committed.current = settled;
      /* Show what was STORED, not what was typed. "1,50" is written as "1.5",
         and a box that goes on showing the typed form disagrees with the record
         beside it — and with the next filter that reads the stored text. */
      if (!focused.current) write(settled);
    } catch (err) {
      /* The write failing is not the same as the server declining it: a
         declined write comes back 200 and is reported per field by the record
         hook. This is the socket, the session or the mutation itself, and a
         value that vanished without a word is the one outcome nobody can act
         on. */
      setInvalid(err instanceof Error ? err.message : 'Could not save this value.');
    } finally {
      setSaving(false);
    }
  };

  const problem = invalid ? <p className="text-micro text-danger">{invalid}</p> : null;

  if (kind === 'boolean') {
    return (
      <div className="flex flex-col gap-1">
        <Switch
          aria-label={label}
          checked={value === 'true'}
          disabled={disabled}
          onChange={(next) => void send(next ? 'true' : 'false')}
        />
        {problem}
      </div>
    );
  }

  if (kind === 'date') {
    return (
      <div className="flex flex-col gap-1">
        <DateField
          aria-label={label}
          disabled={disabled}
          value={shown === '' ? null : shown}
          onChange={(iso) => void send(iso === null ? '' : (toStored(iso) ?? ''))}
        />
        {/* A date attribute holding prose is ordinary — a flow or a CSV import
            wrote it. Showing what is really stored beats an empty picker. */}
        {value !== '' && shown === '' ? (
          <p className="text-micro text-warning">Stored as “{value}” — not a date this picker can show.</p>
        ) : null}
        {problem}
      </div>
    );
  }

  const commit = () => {
    focused.current = false;
    onRelease?.();
    const typed = draftRef.current.trim();
    if (typed === committed.current.trim()) {
      /* Nothing was typed, but the world may have moved while the box had
         focus. Take the newer value now rather than showing a stale one. */
      if (shown !== committed.current) {
        committed.current = shown;
        write(shown);
      }
      return;
    }
    const stored = toStored(typed);
    if (stored === null) {
      setInvalid(invalidMessage);
      return;
    }
    setInvalid(null);
    void send(stored);
  };

  const revert = (element: HTMLInputElement | HTMLTextAreaElement) => {
    write(committed.current);
    setInvalid(null);
    element.blur();
  };

  const focus = () => {
    focused.current = true;
    onHold?.();
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
        {multiline ? (
          <textarea
            rows={3}
            value={draft}
            aria-label={label}
            placeholder={placeholder ?? 'Not set'}
            disabled={disabled || saving}
            onChange={(event) => write(event.target.value)}
            onFocus={focus}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                revert(event.currentTarget);
              }
            }}
            className="w-full resize-y rounded-control border border-border bg-surface-raised px-3 py-2 text-body text-text placeholder:text-text-faint focus-visible:focus-ring"
          />
        ) : (
          <Input
            value={draft}
            aria-label={label}
            placeholder={placeholder ?? 'Not set'}
            disabled={disabled || saving}
            inputMode={kind === 'number' ? 'decimal' : undefined}
            onChange={(event) => write(event.target.value)}
            onFocus={focus}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                revert(event.currentTarget);
              }
            }}
          />
        )}
        {saving ? <Spinner size={14} className="mt-2" /> : null}
      </div>
      {problem}
    </div>
  );
}

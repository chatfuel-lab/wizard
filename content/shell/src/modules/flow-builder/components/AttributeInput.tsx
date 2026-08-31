import { useEffect, useId, useRef, useState } from 'react';
import { errorMessageFor } from '~api';

export interface AttributeInputProps {
  label: string;
  value: string;
  /** Save-on-blur; resolve = saved, reject = error shown inline (mirrors ~ui Field). */
  onSave: (next: string) => Promise<void>;
  suggestions: readonly string[];
  placeholder?: string;
  /** Return an error message to block saving, null to allow. */
  validate?: (value: string) => string | null;
}

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

/**
 * ~ui Field's save-on-blur contract plus a native datalist fed by
 * BotAttributesAutocomplete — the simple suggestion list the plan calls for.
 */
export function AttributeInput({ label, value, onSave, suggestions, placeholder, validate }: AttributeInputProps) {
  const listId = useId();
  const [draft, setDraft] = useState(value);
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const lastSaved = useRef(value);

  useEffect(() => {
    if (value !== lastSaved.current) {
      lastSaved.current = value;
      setDraft(value);
      setState({ kind: 'idle' });
    }
  }, [value]);

  const commit = async () => {
    if (draft === lastSaved.current) return;
    const invalid = validate?.(draft);
    if (invalid) {
      setState({ kind: 'error', message: invalid });
      return;
    }
    setState({ kind: 'saving' });
    try {
      await onSave(draft);
      lastSaved.current = draft;
      setState({ kind: 'saved' });
      setTimeout(() => setState((s) => (s.kind === 'saved' ? { kind: 'idle' } : s)), 1500);
    } catch (err) {
      setState({ kind: 'error', message: errorMessageFor(err, {}) });
    }
  };

  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-xs font-medium text-text-muted">
        {label}
        {state.kind === 'saving' ? <span className="text-text-faint">saving…</span> : null}
        {state.kind === 'saved' ? <span className="text-success">saved</span> : null}
      </span>
      <input
        value={draft}
        list={listId}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
      />
      <datalist id={listId}>
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {state.kind === 'error' ? <span className="mt-1 block text-xs text-danger">{state.message}</span> : null}
    </label>
  );
}

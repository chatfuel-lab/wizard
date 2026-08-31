import { useEffect, useRef, useState } from 'react';

export interface FieldProps {
  label: string;
  value: string;
  /** Called on blur when the value changed; resolve = saved, reject = error shown inline. */
  onSave: (next: string) => Promise<void>;
  multiline?: boolean;
  placeholder?: string;
  /** Native input type (e.g. "datetime-local"); ignored when multiline. */
  type?: string;
  /** Return an error message to block saving, null to allow. */
  validate?: (value: string) => string | null;
}

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

/** Save-on-blur field with inline pending/saved/error feedback. */
export function Field({ label, value, onSave, multiline, placeholder, type, validate }: FieldProps) {
  const [draft, setDraft] = useState(value);
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const lastSaved = useRef(value);

  // Adopt external updates unless the user is mid-edit of something else.
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
      setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  const inputClass =
    'w-full rounded-control border border-border bg-surface-sunken px-3 py-2 text-sm text-text placeholder:text-text-faint hover:border-border-strong focus-visible:focus-ring';

  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-xs font-medium text-text-muted">
        {label}
        {state.kind === 'saving' ? <span className="text-text-faint">saving…</span> : null}
        {state.kind === 'saved' ? <span className="text-success">saved</span> : null}
      </span>
      {multiline ? (
        <textarea
          rows={3}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          className={`${inputClass} resize-y`}
        />
      ) : (
        <input
          value={draft}
          type={type}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          className={inputClass}
        />
      )}
      {state.kind === 'error' ? <span className="mt-1 block text-xs text-danger">{state.message}</span> : null}
    </label>
  );
}

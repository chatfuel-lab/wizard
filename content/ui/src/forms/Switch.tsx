import { useState, type ReactNode } from 'react';

export interface SwitchProps {
  checked: boolean;
  /** Reject to surface an inline error and revert the visual state. */
  onChange: (next: boolean) => void | Promise<void>;
  /** Visible text beside the track. It IS the accessible name, and clicking it toggles. */
  label?: ReactNode;
  /**
   * For a switch whose name is already on screen beside it. Declared rather
   * than assumed: TypeScript lets ANY hyphenated attribute through a component
   * without complaint — that is a deliberate JSX rule, not an oversight — so an
   * `aria-label` on a component that does not declare one is silently dropped
   * and the control ends up with no accessible name at all.
   */
  'aria-label'?: string;
  disabled?: boolean;
}

/**
 * Controlled toggle with async-aware pending state and inline error.
 *
 * The track and the text sit inside one `<label>`. A `<button>` is a labelable
 * element, so the label's text becomes the switch's accessible name and a
 * click anywhere on the text activates the button — no `id`/`htmlFor` pair to
 * keep unique, and no `aria-labelledby` to keep in sync. A click on the button
 * itself is not doubled: a label's activation behaviour does nothing when the
 * event already targeted its control.
 */
export function Switch({ checked, onChange, label, disabled, 'aria-label': ariaLabel }: SwitchProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inert = disabled || pending;
  const hasLabel = label !== undefined && label !== null;

  const toggle = async () => {
    if (inert) return;
    setError(null);
    const result = onChange(!checked);
    if (result instanceof Promise) {
      setPending(true);
      try {
        await result;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setPending(false);
      }
    }
  };

  const track = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hasLabel ? undefined : ariaLabel}
      disabled={inert}
      onClick={() => void toggle()}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-fast ease-standard focus-visible:focus-ring ${
        checked ? 'bg-accent' : 'bg-border-strong'
      } ${inert ? 'opacity-50' : 'cursor-pointer'}`}
    >
      {/* `left-0` is load-bearing. An absolutely positioned child with no
          inset keeps its STATIC position, and inside a `<button>` — which
          centres its content — that is the middle of the track. The knob
          then translated from the centre: off sat right of middle, on spilled
          past the pill's edge and over the label beside it. Anchored at the
          track's left, the two translations mean what they say. */}
      {/* Same 2px inset at both ends: 36 − 16 − 2 = 18. It used to travel 16
          and stop 4px short on the right, so the on and off knobs sat at
          different distances from their edge. The knob also throws a hairline
          shadow — white on the off track's grey is otherwise a flat disc. */}
      <span
        className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-control-knob shadow-sm transition-transform duration-fast ease-spring ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );

  return (
    <span className="inline-flex flex-col">
      {hasLabel ? (
        <label className={`inline-flex items-center gap-2 ${inert ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          {track}
          <span className={`text-sm ${disabled ? 'text-text-faint' : 'text-text'}`}>{label}</span>
        </label>
      ) : (
        track
      )}
      {error ? <span className="mt-1 text-xs text-danger">{error}</span> : null}
    </span>
  );
}

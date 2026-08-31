import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { IconCheck, IconMinus } from '../icons';

export interface CheckboxProps {
  /** `'indeterminate'` for a partial selection — a header box over a mixed page. */
  checked: boolean | 'indeterminate';
  onChange: (checked: boolean, event: MouseEvent<HTMLInputElement>) => void;
  label?: ReactNode;
  disabled?: boolean;
  /** Required when there is no visible label. */
  'aria-label'?: string;
  className?: string;
}

/**
 * A real `<input type="checkbox">` under a drawn box.
 *
 * The native input stays in the DOM (only visually hidden) rather than being
 * replaced by a div with `role="checkbox"`: it brings form participation, the
 * platform's own indeterminate semantics, and Space handling for free.
 *
 * `onChange` forwards the click event because tables need `event.shiftKey` to
 * extend a range, and React's change event does not carry modifier keys.
 */
export function Checkbox({ checked, onChange, label, disabled = false, className = '', ...aria }: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const indeterminate = checked === 'indeterminate';

  /* `indeterminate` is a property, not an attribute — there is no way to set it
   * from JSX. */
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label
      className={`inline-flex items-center gap-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <span className="relative inline-flex">
        <input
          ref={inputRef}
          type="checkbox"
          checked={checked === true}
          disabled={disabled}
          aria-label={aria['aria-label']}
          /* onChange satisfies React's controlled-input warning; the real work
             happens in onClick, which is the only one carrying shiftKey. */
          onChange={() => {}}
          onClick={(event) => {
            if (disabled) return;
            onChange(!(checked === true), event);
          }}
          className="peer absolute inset-0 h-full w-full cursor-[inherit] appearance-none rounded-chip focus-visible:focus-ring"
        />
        <span
          aria-hidden
          className={`flex aspect-square h-4 items-center justify-center rounded-chip border transition-colors duration-fast ease-standard ${
            checked === true || indeterminate
              ? 'border-accent bg-accent text-accent-fg'
              : 'border-border-strong bg-surface-raised text-transparent'
          } ${disabled ? 'opacity-50' : 'peer-hover:border-accent'}`}
        >
          {indeterminate ? <IconMinus size={12} /> : <IconCheck size={12} />}
        </span>
      </span>
      {label !== undefined ? (
        <span className={`text-sm ${disabled ? 'text-text-faint' : 'text-text'}`}>{label}</span>
      ) : null}
    </label>
  );
}

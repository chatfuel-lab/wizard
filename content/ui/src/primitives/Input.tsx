import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * The value failed validation: danger border, and the focus ring turns
   * danger too so the field still reads as wrong while it is being fixed.
   * Sets `aria-invalid` unless the caller already did — a `FormField` passes
   * `aria-invalid` down through its render prop, and that alone is enough to
   * paint the state, so a form never has to say it twice.
   */
  invalid?: boolean;
}

/* The invalid classes are a whole string, not fragments, so Tailwind's text
   scan sees each utility written out in full. */
const INVALID_CLASSES = 'border-danger focus-visible:outline-danger';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', invalid, ...props },
  ref,
) {
  const ariaInvalid = props['aria-invalid'];
  const isInvalid = invalid ?? (ariaInvalid === true || ariaInvalid === 'true');
  return (
    <input
      ref={ref}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
      className={`h-field w-full rounded-control border bg-surface-sunken px-3 text-sm text-text placeholder:text-text-faint focus-visible:focus-ring ${
        isInvalid ? INVALID_CLASSES : 'border-border hover:border-border-strong'
      } ${className}`}
      {...props}
    />
  );
});

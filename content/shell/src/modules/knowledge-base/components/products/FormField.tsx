import type { ReactNode } from 'react';

export interface FormFieldProps {
  /** The control's id. The label points at it and the error id is derived from it. */
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}

/** The id of a field's error text, so the control can `aria-describedby` it. */
export const errorIdOf = (id: string): string => `${id}-error`;

/**
 * Label, control, hint, error — the four parts of one form row, in one place
 * so a dialog does not re-solve the wiring per input.
 *
 * Lives under `products/` because that is where it was needed first; the two
 * mirror dialogs use it too. There is no third home for it inside this
 * module's component tree, and a second copy would drift.
 */
export function FormField({ id, label, required = false, hint, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-text-muted">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <span id={errorIdOf(id)} role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-text-faint">{hint}</span>
      ) : null}
    </div>
  );
}

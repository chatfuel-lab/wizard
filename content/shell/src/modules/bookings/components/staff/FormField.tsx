import type { ReactNode } from 'react';
import { Label } from '~ui';

export interface FormFieldProps {
  id: string;
  label: string;
  hint?: ReactNode;
  required?: boolean;
  /** Shown under the control in the danger tone and announced through `aria-describedby` on it. */
  error?: string | null;
  children: ReactNode;
  className?: string;
}

/** The id the control should put in `aria-describedby` when the field has an error. */
export const errorIdOf = (id: string) => `${id}-error`;

/**
 * Label + control + error, for the staff form and the service dialog. `~ui`'s
 * `Field` is save-on-blur with its own state; these forms save as a whole,
 * so the control is the caller's and this only frames it.
 */
export function FormField({ id, label, hint, required = false, error, children, className = '' }: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Label htmlFor={id} required={required} hint={hint}>
        {label}
      </Label>
      {children}
      {error ? (
        <span id={errorIdOf(id)} role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}

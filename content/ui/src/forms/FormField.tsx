import { useId, type ReactNode } from 'react';
import { Label } from './Label';

/** What the control has to carry for the label, hint and error to be its own. */
export interface FormFieldA11y {
  id: string;
  'aria-invalid': boolean | undefined;
  'aria-describedby': string | undefined;
}

export interface FormFieldProps {
  label: string;
  /** Helper line under the control. Always present, unlike the error. */
  hint?: ReactNode;
  /** The validation message. `null` / `undefined` / `''` all mean "no error". */
  error?: string | null;
  required?: boolean;
  /**
   * A render prop, not a child element: the field mints the id and the two
   * ARIA attributes, and the control has to receive them, whatever it is —
   * an Input, a PasswordInput, a Select, a Textarea. Spread them:
   *
   *     <FormField label="Email">{(a11y) => <Input {...a11y} type="email" />}</FormField>
   */
  children: (a11y: FormFieldA11y) => ReactNode;
  className?: string;
}

/**
 * Label + control + hint + error, wired together.
 *
 * `Field` (save-on-blur, owns its value) is for settings; this is for a FORM —
 * the value and the validation live in the form, and this component's whole
 * job is the accessible plumbing: `htmlFor` → the control, `aria-describedby`
 * → the hint and the error, `aria-invalid` when there is one. `Input` and
 * `Textarea` read that `aria-invalid` and paint the danger border themselves,
 * so a form never sets `invalid` by hand.
 */
export function FormField({ label, hint, error, required = false, children, className = '' }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const hasError = typeof error === 'string' && error.length > 0;
  const hasHint = hint !== undefined && hint !== null;

  const describedBy = [hasHint ? hintId : null, hasError ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children({
        id,
        'aria-invalid': hasError ? true : undefined,
        'aria-describedby': describedBy === '' ? undefined : describedBy,
      })}
      {hasHint ? (
        <p id={hintId} className="text-xs text-text-faint">
          {hint}
        </p>
      ) : null}
      {hasError ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

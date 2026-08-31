import type { ReactNode } from 'react';

export interface LabelProps {
  htmlFor?: string;
  children: ReactNode;
  /** Renders the required marker and, more importantly, announces it. */
  required?: boolean;
  /** Secondary line under the label. */
  hint?: ReactNode;
  className?: string;
}

export function Label({ htmlFor, children, required = false, hint, className = '' }: LabelProps) {
  return (
    <span className={`block ${className}`}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-text-muted">
        {children}
        {required ? (
          <>
            {/* The asterisk is decorative; the word is what a screen reader
                needs, and visually-hidden text is the only way to have both. */}
            <span aria-hidden className="ml-0.5 text-danger">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </label>
      {hint !== undefined ? <span className="mt-0.5 block text-xs text-text-faint">{hint}</span> : null}
    </span>
  );
}

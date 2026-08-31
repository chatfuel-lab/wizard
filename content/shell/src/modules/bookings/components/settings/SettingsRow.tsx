import { useCallback, useState, type ReactNode } from 'react';
import { errorMessage } from '../../lib/errors';

export interface SettingsRowProps {
  label: string;
  description?: ReactNode;
  /** The control, right-aligned from `@compact:` up, below the text on a phone. */
  children: ReactNode;
  /** Under the row, danger tone. */
  error?: string | null;
  /** The row is being written; the control is the caller's to disable. */
  saving?: boolean;
  /** Renders the control under the label at every width (a wide control such as a select with long options). */
  stacked?: boolean;
  className?: string;
}

/**
 * One setting: label + description on the left, its control on the right,
 * an inline error underneath. Every settings section is a stack of these;
 * they save on change, so there is no form-level Save.
 */
export function SettingsRow({
  label,
  description,
  children,
  error,
  saving = false,
  stacked = false,
  className = '',
}: SettingsRowProps) {
  return (
    <div className={`flex flex-col gap-2 py-3 first:pt-0 last:pb-0 ${className}`} aria-busy={saving || undefined}>
      <div
        className={`flex flex-col gap-2 ${stacked ? '' : '@compact:flex-row @compact:items-start @compact:justify-between'}`}
      >
        <div className={`min-w-0 ${stacked ? '' : '@compact:max-w-72'}`}>
          <div className="text-sm font-medium text-text">{label}</div>
          {description ? <div className="text-xs text-text-muted">{description}</div> : null}
        </div>
        <div className={`flex min-w-0 shrink-0 flex-col items-start gap-1 ${stacked ? '' : '@compact:items-end'}`}>
          {children}
        </div>
      </div>
      {error ? (
        <div role="alert" className="text-xs text-danger">
          {error}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The per-row write: runs a setter, keeps its failure as the row's inline
 * error until the next attempt. The store already tracks `saving` per field;
 * this only holds the message, which the store deliberately does not.
 */
export function useRowWrite(): { error: string | null; run: (write: () => Promise<void>) => Promise<void> } {
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (write: () => Promise<void>) => {
    setError(null);
    try {
      await write();
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  return { error, run };
}

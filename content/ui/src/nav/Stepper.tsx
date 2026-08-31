import type { ReactNode } from 'react';
import { IconCheck, IconWarning } from '../icons';

export type StepStatus = 'complete' | 'current' | 'upcoming' | 'error';

export interface StepperStep {
  id: string;
  label: string;
  description?: ReactNode;
  /** Omit to derive from position relative to `current`. */
  status?: StepStatus;
}

export interface StepperProps {
  steps: readonly StepperStep[];
  /** The id of the current step. */
  current: string;
  orientation?: 'horizontal' | 'vertical';
  /** Presence makes completed steps buttons — "go back to Service". */
  onStepClick?: (id: string) => void;
  'aria-label': string;
  className?: string;
}

const MARK_CLASSES: Record<StepStatus, string> = {
  complete: 'bg-accent text-accent-fg',
  current: 'border-2 border-accent bg-surface-raised text-accent',
  upcoming: 'border border-border-strong bg-surface-raised text-text-faint',
  error: 'bg-danger text-accent-fg',
};

const LABEL_CLASSES: Record<StepStatus, string> = {
  complete: 'text-text',
  current: 'text-text font-semibold',
  upcoming: 'text-text-muted',
  error: 'text-danger',
};

/**
 * Wizard progress. `aria-current="step"` marks the current one; every step
 * is an `<li>` in an ordered list, so a screen reader hears "step 3 of 6".
 * Completed steps become buttons when `onStepClick` is given — the way back is
 * through the stepper, not a separate Back button per screen.
 */
export function Stepper({
  steps,
  current,
  orientation = 'horizontal',
  onStepClick,
  className = '',
  ...aria
}: StepperProps) {
  const currentIndex = steps.findIndex((step) => step.id === current);
  const horizontal = orientation === 'horizontal';

  return (
    <nav aria-label={aria['aria-label']} className={className}>
      <ol className={horizontal ? 'flex items-start' : 'flex flex-col'}>
        {steps.map((step, index) => {
          const status: StepStatus =
            step.status ?? (index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming');
          const clickable = onStepClick !== undefined && (status === 'complete' || status === 'error');
          const last = index === steps.length - 1;
          const mark = (
            <span
              aria-hidden
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-micro font-semibold tabular-nums ${MARK_CLASSES[status]}`}
            >
              {status === 'complete' ? (
                <IconCheck size={12} />
              ) : status === 'error' ? (
                <IconWarning size={12} />
              ) : (
                index + 1
              )}
            </span>
          );
          const text = (
            <span className="min-w-0">
              <span className={`block truncate text-label ${LABEL_CLASSES[status]}`}>{step.label}</span>
              {step.description !== undefined ? (
                <span className="block truncate text-micro text-text-faint">{step.description}</span>
              ) : null}
            </span>
          );
          const body = clickable ? (
            <button
              type="button"
              onClick={() => onStepClick?.(step.id)}
              className="flex min-w-0 items-center gap-2 rounded-control text-left focus-visible:focus-ring"
            >
              {mark}
              {text}
            </button>
          ) : (
            <span className="flex min-w-0 items-center gap-2">
              {mark}
              {text}
            </span>
          );
          return (
            <li
              key={step.id}
              aria-current={status === 'current' ? 'step' : undefined}
              className={
                horizontal
                  ? `flex min-w-0 items-center ${last ? '' : 'flex-1'}`
                  : `flex min-w-0 flex-col ${last ? '' : 'pb-4'}`
              }
            >
              {horizontal ? (
                <>
                  {body}
                  {last ? null : (
                    <span
                      aria-hidden
                      className={`mx-2 h-px min-w-4 flex-1 ${index < currentIndex ? 'bg-accent' : 'bg-border'}`}
                    />
                  )}
                </>
              ) : (
                <div className="relative flex gap-2">
                  {last ? null : (
                    <span
                      aria-hidden
                      className={`absolute left-3 top-6 -bottom-4 w-px ${index < currentIndex ? 'bg-accent' : 'bg-border'}`}
                    />
                  )}
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

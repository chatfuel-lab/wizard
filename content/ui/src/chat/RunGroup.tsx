import { Children, useEffect, useId, useRef, type ReactNode } from 'react';
import { useControllableState } from '../hooks/useControllableState';
import { IconChevronDown } from '../icons';
import { formatRunSummary, type RunState } from '../lib/chat/runStep';
import { Spinner } from '../primitives/Spinner';
import { RunGroupContext } from './internal/runGroupContext';

export interface RunGroupProps {
  /** Overrides the generated "4 steps · 6.2s" line. */
  title?: ReactNode;
  /** Total elapsed for the whole run: milliseconds, or preformatted. */
  duration?: number | string;
  /** Steps in the summary. Defaults to counting `children`. */
  count?: number;
  /** The run's own state. `rollUpRunState` computes it from the steps. */
  state?: RunState;
  /** Starts open. Ignored when `open` is passed. */
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** `RunStep` elements. */
  children: ReactNode;
  className?: string;
}

/* Only the two states worth a colour on a summary line. A run that finished is
   just a run that finished — colouring it green makes a thread of six answers
   look like a test report — and a skipped run is quiet by definition. */
const STATE_SUMMARY: Record<RunState, string> = {
  running: 'text-run-active',
  done: 'text-text-muted',
  failed: 'text-danger',
  skipped: 'text-text-muted',
};

/**
 * Consecutive tool calls, as one thing that can be folded away.
 *
 * ## Why the group exists at all
 *
 * A single answer in practice ran four tools before it said a word. As four
 * separate cards that is four borders, four hover targets and four times the
 * vertical space of the sentence they were in aid of — and the operator's
 * question was never "which tools ran", it was "is it done yet". So the run
 * collapses to one line, and the line says the two things that answer that:
 * how many steps, and how long.
 *
 * ## Why the steps lose their borders
 *
 * `RunStep` renders as a bordered card when it stands alone and as a plain row
 * when it is inside a group; the switch travels through a context, for the
 * reason written on that context. Four cards inside a fifth card is the "boxes
 * in boxes" look that makes a thread feel like a settings page.
 *
 * ## Open by default
 *
 * A group that has finished folds away, but one that is still running does not:
 * the whole reason to render tool activity is that something is happening and
 * the operator is waiting. `defaultOpen` is the caller's, though, because an
 * approval batch is a group that must be open whatever its state.
 */
export function RunGroup({
  title,
  duration,
  count,
  state = 'done',
  defaultOpen,
  open,
  onOpenChange,
  children,
  className = '',
}: RunGroupProps) {
  const [isOpen, setOpen] = useControllableState(open, defaultOpen ?? state === 'running', onOpenChange);
  const panelId = useId();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = contentRef.current;
    if (node) node.inert = !isOpen;
  }, [isOpen]);

  /* `Children.count` flattens the array a caller maps into, which is how every
     real call site passes its steps. It does not see through a fragment, which
     is why `count` exists as an override. */
  const steps = count ?? Children.count(children);

  return (
    <section
      className={`min-w-0 overflow-hidden rounded-card border bg-surface-raised ${
        state === 'failed' ? 'border-danger/30' : 'border-border'
      } ${className}`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring"
      >
        {state === 'running' ? (
          <Spinner size={12} className="shrink-0 border-run-active/30 border-t-run-active" />
        ) : null}
        <span className={`min-w-0 flex-1 truncate text-meta ${STATE_SUMMARY[state]}`}>
          {title ?? formatRunSummary(steps, duration)}
        </span>
        <IconChevronDown
          size={14}
          aria-hidden
          className={`shrink-0 text-text-faint transition-transform duration-fast ease-standard ${
            isOpen ? '' : '-rotate-90'
          }`}
        />
      </button>

      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-base ease-standard ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div ref={contentRef} className="overflow-hidden">
          <div className="min-w-0 divide-y divide-border-subtle border-t border-border-subtle">
            <RunGroupContext.Provider value>{children}</RunGroupContext.Provider>
          </div>
        </div>
      </div>
    </section>
  );
}

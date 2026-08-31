import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { Progress } from '../primitives/Progress';
import { bulkAnnouncement, bulkPercent, bulkSummary, bulkTone, type BulkRunStatus } from '../lib/app/bulkRun';
import { Collapsible } from '../nav/Collapsible';

export interface BulkFailure {
  /** Stable key — the record id the step was for. */
  id: string;
  /** What it was working on, in the user's words: a contact's name. */
  label: string;
  /** Why it failed. Already a sentence; the caller owns the wording. */
  reason: string;
}

export interface BulkProgressProps {
  /** What the run is doing: "Adding tag VIP", "Exporting". */
  label: string;
  /** Items attempted so far, successes and failures both. */
  done: number;
  total: number;
  failures?: readonly BulkFailure[];
  status?: BulkRunStatus;
  /** Present ⇒ a Stop button. Absent ⇒ the run cannot be interrupted. */
  onStop?: () => void;
  stopLabel?: string;
  /** Trailing slot: a Retry, a Close, a link to what was produced. */
  actions?: ReactNode;
  className?: string;
}

/**
 * A determinate strip for a long client-side run.
 *
 * It exists because this API has no bulk mutation. "Add a tag to 240 contacts"
 * is 240 sequential requests made from the browser, over a minute or more, with
 * a person watching — so the run needs a stop button, a real count, and a place
 * to put the eleven that failed. A spinner and a toast at the end would throw
 * away the only information anybody needs.
 *
 * Determinate, always. The total is known before the first request goes out
 * (it is the selection), so an indeterminate bar here would be a choice to
 * withhold it.
 *
 * The failure list is collapsed by default and never disappears: a run that
 * ends with failures still has them to show, and reopening the strip is the
 * only way back to which records were missed — nothing server-side recorded it.
 */
export function BulkProgress({
  label,
  done,
  total,
  failures = [],
  status = 'running',
  onStop,
  stopLabel = 'Stop',
  actions,
  className = '',
}: BulkProgressProps) {
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const state = { done, total, failed: failures.length, status };
  const summary = bulkSummary(state);
  const percent = bulkPercent(done, total);

  /* The live region is throttled in lib/app/bulkRun — see bulkAnnouncement for why
   * announcing every item is worse than announcing none. The ref keeps a
   * repeated identical sentence from being re-read on an unrelated re-render. */
  const spoken = useRef('');
  const next = bulkAnnouncement(state, label);
  useEffect(() => {
    if (next === null || next === spoken.current) return;
    spoken.current = next;
    setAnnouncement(next);
  }, [next]);

  return (
    <div className={`rounded-card border border-border bg-surface-raised p-3 ${className}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1 truncate text-label font-medium text-text">{label}</span>
        <span className="shrink-0 tabular-nums text-meta text-text-muted">{summary}</span>
        {onStop !== undefined && status === 'running' ? (
          <Button size="xs" variant="ghost" onClick={onStop}>
            {stopLabel}
          </Button>
        ) : null}
        {actions}
      </div>

      <div className="mt-2">
        <Progress value={percent} label={`${label} — ${summary}`} tone={bulkTone(state)} size="sm" />
      </div>

      {failures.length > 0 ? (
        <div className="mt-2">
          <Collapsible
            open={open}
            onOpenChange={setOpen}
            trigger={`${failures.length} ${failures.length === 1 ? 'failure' : 'failures'}`}
          >
            <ul className="mt-1 space-y-1">
              {failures.map((failure) => (
                <li
                  key={failure.id}
                  className="flex flex-wrap items-baseline gap-x-2 rounded-chip bg-danger-soft px-2 py-1 text-meta"
                >
                  <span className="min-w-0 truncate font-medium text-text">{failure.label}</span>
                  <span className="min-w-0 flex-1 text-danger">{failure.reason}</span>
                </li>
              ))}
            </ul>
          </Collapsible>
        </div>
      ) : null}

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

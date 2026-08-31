import { useCallback, useRef, useState } from 'react';
import { useToast } from '~ui';
import { useContactsUndo } from '../ContactsUndoContext';
import type { ContactRow } from '../types';
import {
  bulkToast,
  emptyReport,
  inverseAction,
  startProgress,
  undoCaveat,
  undoLabel,
  undoSteps,
  type BulkPlan,
  type BulkProgress,
  type BulkReport,
  type BulkStep,
} from '../lib/bulk';
import type { RowMutationsApi } from './useRowMutations';

/**
 * How often the progress bar is allowed to repaint.
 *
 * The run is sequential but the requests are fast, so committing progress on
 * every row would re-render a 500-row table twenty times a second for no extra
 * information. The final tick is always forced, so the bar still ends exactly
 * where the run did.
 */
const PROGRESS_TICK_MS = 120;

export interface UseBulkRunOptions {
  mutations: RowMutationsApi;
  /** The current row for an id, so an undo works against what is on screen now. */
  rowById: (id: string) => ContactRow | undefined;
  /** Called once, after a run that changed something, to drop the selection. */
  onFinished?: (report: BulkReport) => void;
}

export interface BulkRunApi {
  /** Null when nothing is running. */
  progress: BulkProgress | null;
  running: boolean;
  run: (plan: BulkPlan) => Promise<BulkReport>;
  /** Asks the loop to stop; the request in flight is allowed to finish. */
  stop: () => void;
}

/**
 * A bulk action, executed.
 *
 * There is no bulk mutation in this API, so this is the whole of "bulk": a
 * `for` loop over the plan's targets, one request at a time, with the
 * consequences owned rather than hidden.
 *
 * Four decisions worth the file:
 *
 * 1. **Optimism is batched, the network is sequential.** Every patch is applied
 *    before the first request goes out, so the table settles in one frame
 *    instead of rippling for thirty seconds. The requests are still one at a
 *    time, because firing 500 mutations at once is how a bot gets rate-limited
 *    and how the failures become unattributable.
 * 2. **Stop is a ref, not state.** The loop reads it between rows; routing it
 *    through a re-render would let a click land after the loop had already read
 *    a stale value.
 * 3. **The inverses are captured from the PLAN, before any optimism lands.**
 *    Reading them off the store afterwards would read back the value the run
 *    just wrote, and undo would be a no-op.
 * 4. **One toast, one undo entry, per run.** Not per row. A run of 120 that
 *    half-failed is one message naming the contacts that did not make it.
 */
export function useBulkRun({ mutations, rowById, onFinished }: UseBulkRunOptions): BulkRunApi {
  const toast = useToast();
  const undo = useContactsUndo();
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const stopRef = useRef(false);
  const runningRef = useRef(false);
  const paintedAt = useRef(0);

  const commit = useCallback((next: BulkProgress, force: boolean) => {
    const now = Date.now();
    if (!force && now - paintedAt.current < PROGRESS_TICK_MS) return;
    paintedAt.current = now;
    setProgress(next);
  }, []);

  const stop = useCallback(() => {
    if (!runningRef.current) return;
    stopRef.current = true;
    setProgress((current) => (current ? { ...current, stopping: true } : current));
  }, []);

  /**
   * The loop itself, shared by a run and by its undo.
   *
   * `rows` are the rows as they were when the plan was made; the undo pass
   * looks them up again, because a live batch may have replaced them since.
   */
  const walk = useCallback(
    async (steps: { row: ContactRow; action: BulkStep['action'] }[]): Promise<BulkProgress> => {
      let state = startProgress(steps.length);
      commit(state, true);

      for (const step of steps) {
        if (stopRef.current) {
          state = { ...state, stopping: true };
          break;
        }
        const result = await mutations.send(step.row, step.action);
        state = {
          ...state,
          done: state.done + 1,
          failures: result.ok
            ? state.failures
            : [...state.failures, { id: step.row.id, name: nameOf(step.row), message: result.message }],
        };
        commit(state, false);
      }

      const finished = { ...state, running: false };
      commit(finished, true);
      return finished;
    },
    [commit, mutations],
  );

  const run = useCallback(
    async (plan: BulkPlan): Promise<BulkReport> => {
      const report = emptyReport(plan.action);
      report.skipped = plan.skipped.length;
      report.dropped = plan.dropped;
      if (plan.targets.length === 0 || runningRef.current) {
        if (plan.targets.length === 0) {
          toast.show({ tone: 'info', title: 'Nothing to do', description: bulkToast(report).description });
        }
        return report;
      }

      runningRef.current = true;
      stopRef.current = false;

      /* Captured first, from the plan's own rows: after the optimistic patches
         land, every row reads back the value this run is about to write. */
      const inverses = new Map(plan.targets.map((row) => [row.id, inverseAction(plan.action, row)]));
      const names = new Map(plan.targets.map((row) => [row.id, nameOf(row)]));

      for (const row of plan.targets) mutations.beginOptimism(row, plan.action);

      const final = await walk(plan.targets.map((row) => ({ row, action: plan.action })));

      runningRef.current = false;
      stopRef.current = false;
      setProgress(null);

      const failed = new Set(final.failures.map((failure) => failure.id));
      /* Only the rows the loop actually reached: a stopped run leaves the rest
         untouched, and counting them as successes would offer an undo for
         changes that never happened. */
      const attempted = plan.targets.slice(0, final.done);
      report.stopped = final.stopping;
      report.failures = final.failures;
      report.succeeded = attempted
        .filter((row) => !failed.has(row.id))
        .map((row) => ({ id: row.id, name: names.get(row.id) ?? row.id, inverse: inverses.get(row.id) ?? null }));

      const label = undoLabel(report);
      const summary = bulkToast(report);
      const caveat = undoCaveat(report);

      if (label === null) {
        toast.show({ tone: summary.tone, title: summary.title, description: summary.description });
      } else {
        undo.push({
          label,
          run: async () => {
            const steps = undoSteps(report).flatMap((step) => {
              const row = rowById(step.id);
              return row ? [{ row, action: step.action }] : [];
            });
            if (steps.length === 0) {
              toast.show({
                tone: 'warning',
                title: 'Nothing left to undo',
                description: 'Those contacts are no longer in this list.',
              });
              return;
            }
            runningRef.current = true;
            stopRef.current = false;
            for (const step of steps) mutations.beginOptimism(step.row, step.action);
            const back = await walk(steps);
            runningRef.current = false;
            setProgress(null);
            toast.show({
              tone: back.failures.length > 0 ? 'warning' : 'success',
              title: `Undone on ${steps.length - back.failures.length} of ${steps.length}`,
              description:
                back.failures.length > 0 ? `${back.failures[0]?.name}: ${back.failures[0]?.message}` : undefined,
            });
          },
        });
        toast.show({
          tone: summary.tone,
          title: summary.title,
          description: [summary.description, caveat].filter(Boolean).join(' '),
          action: { label, onClick: undo.run },
        });
      }

      onFinished?.(report);
      return report;
    },
    [mutations, rowById, toast, undo, walk, onFinished],
  );

  return { progress, running: progress !== null, run, stop };
}

/** Never an id, never an empty string: a failure line has to name a person. */
const nameOf = (row: ContactRow): string => (row.name.trim() === '' ? 'Unnamed contact' : row.name);

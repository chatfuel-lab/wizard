import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DealsExportByIDsDocument,
  DealsExportBySegmentDocument,
  DealsExportCancelDocument,
  DealsExportRestoreDocument,
  DealsExportTaskDocument,
  DealsExportUpdatedDocument,
} from '~api/generated/deals/graphql';
import { useDeals } from '../DealsContext';
import { isActive, readExportTask, type ExportProgress, type ExportTaskLike } from '../lib/csvColumns';
import { ALL_PLATFORMS } from '../lib/platforms';

/**
 * A CSV export, from "start" to a file — with the three things that make it
 * survivable rather than a spinner that lies.
 *
 * 1. **Determinate progress.** `completedPoints` / `totalPoints` come off the
 *    task; the bar only goes indeterminate while the server has not published
 *    a total yet.
 * 2. **Cancel takes `task.data.id`.** `csvContactExportCancel(botID, id: String!)`
 *    wants `CSVContactsExport.id`, while `getTask(id: TaskID!)` wants `Task.id` —
 *    two different ids on one object. This tries the data id and falls back to
 *    the task id if the server rejects it.
 * 3. **An export survives a reload.** `bot.lastActiveCSVContactsExportTask` is
 *    read on mount and adopted *only while it is still running*: adopting a
 *    finished one would pop a download panel for an export the user started
 *    somewhere else entirely.
 *
 * Both channels run at once. The subscription is the fast path; the poll is
 * what keeps the bar moving when the socket is quiet or has been dropped, and
 * it is the only one that survives a backgrounded tab throttling timers.
 */

const POLL_MS = 2500;

export interface DealExportState {
  progress: ExportProgress | null;
  starting: boolean;
  cancelling: boolean;
  error: string | null;
  /** True when this export was picked up on mount rather than started here. */
  restored: boolean;
  startBySegment: (attributes: readonly string[]) => Promise<void>;
  startByIds: (contactIds: readonly string[], attributes: readonly string[]) => Promise<void>;
  cancel: () => Promise<void>;
  /** Forget a finished export so the panel can close. */
  clear: () => void;
}

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

export function useDealExport(): DealExportState {
  const { client, botId } = useDeals();
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  /* A cleared export must not be resurrected by an in-flight poll or a late
   * subscription frame. */
  const dismissedRef = useRef<string | null>(null);

  const adopt = useCallback((task: ExportTaskLike | null | undefined) => {
    if (!task) return;
    const next = readExportTask(task);
    if (dismissedRef.current === next.taskId) return;
    setProgress(next);
  }, []);

  // Mount: pick an export back up, but only one that is still running.
  useEffect(() => {
    let cancelled = false;
    client
      .query(DealsExportRestoreDocument, { botID: botId })
      .then((data) => {
        if (cancelled) return;
        const task = data.bot?.lastActiveCSVContactsExportTask;
        if (!task) return;
        const current = readExportTask(task);
        if (!isActive(current)) return;
        setProgress(current);
        setRestored(true);
      })
      .catch(() => {
        /* Nothing to restore is the common case; a failure here is not an error
         * the user needs to see before they have asked for anything. */
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId]);

  // Follow the task while it runs: subscription for latency, poll for truth.
  const taskId = progress?.taskId ?? null;
  const running = isActive(progress);

  useEffect(() => {
    if (taskId === null || !running) return;

    const unsubscribe = client.subscribe(
      DealsExportUpdatedDocument,
      { id: taskId },
      {
        next: (data) => adopt(data.taskUpdated),
        error: () => {
          /* The poll below is the fallback — a dead socket must not strand the bar. */
        },
      },
    );

    const timer = setInterval(() => {
      client
        .query(DealsExportTaskDocument, { id: taskId })
        .then((data) => adopt(data.getTask))
        .catch(() => {
          /* transient — the next tick tries again */
        });
    }, POLL_MS);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [client, taskId, running, adopt]);

  const start = useCallback(async (run: () => Promise<ExportTaskLike | null | undefined>) => {
    setStarting(true);
    setError(null);
    setRestored(false);
    try {
      const task = await run();
      if (!task) {
        setError('The export did not start.');
        return;
      }
      dismissedRef.current = null;
      setProgress(readExportTask(task));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setStarting(false);
    }
  }, []);

  const startBySegment = useCallback(
    (attributes: readonly string[]) =>
      start(async () => {
        const data = await client.mutate(DealsExportBySegmentDocument, {
          botID: botId,
          platforms: ALL_PLATFORMS,
          // No segment: `SegmentInput` has no sales-stage predicate, so a
          // segment cannot mean "the deals". This is every contact, and the
          // dialog says so.
          segment: null,
          attributes: [...attributes],
        });
        return data.csvContactExportStartBySegment;
      }),
    [start, client, botId],
  );

  const startByIds = useCallback(
    (contactIds: readonly string[], attributes: readonly string[]) =>
      start(async () => {
        const data = await client.mutate(DealsExportByIDsDocument, {
          botID: botId,
          contactIDs: [...contactIds],
          attributes: [...attributes],
        });
        return data.csvContactExportStartByIDsList;
      }),
    [start, client, botId],
  );

  const cancel = useCallback(async () => {
    if (!progress) return;
    setCancelling(true);
    setError(null);
    const attempt = (id: string) => client.mutate(DealsExportCancelDocument, { botID: botId, id });
    try {
      let answer;
      try {
        // `task.data.id` first: that is what the mutation documents.
        answer = await attempt(progress.cancelId ?? progress.taskId);
      } catch (err) {
        if (progress.cancelId === null || progress.cancelId === progress.taskId) throw err;
        answer = await attempt(progress.taskId);
      }
      const task = answer.csvContactExportCancel?.lastActiveCSVContactsExportTask;
      // The bot may answer with no active task at all, which is the cancel
      // landing rather than a missing response.
      setProgress(task ? readExportTask(task) : { ...progress, phase: 'cancelled' });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setCancelling(false);
    }
  }, [client, botId, progress]);

  const clear = useCallback(() => {
    dismissedRef.current = progress?.taskId ?? null;
    setProgress(null);
    setRestored(false);
    setError(null);
  }, [progress]);

  return { progress, starting, cancelling, error, restored, startBySegment, startByIds, cancel, clear };
}

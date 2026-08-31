import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookingGoogleCalendarSyncStartDocument,
  BookingTaskDocument,
  BookingTaskUpdatedDocument,
} from '~api/generated/bookings/graphql';
import { useCatalog } from '../BookingsCatalogContext';
import { useBookings } from '../BookingsContext';
import { errorMessage } from '../lib/errors';
import { canStartSync, taskView, type TaskView } from '../lib/taskState';
import type { SpecialistRecord, SyncTask } from '../types';

export interface GoogleCalendarSync {
  task: SyncTask | null;
  view: TaskView | null;
  /** True when "Sync now" may fire: no sync running. (Not connected → the API answers `GoogleCalendarNotConnected`, mapped into `error`.) */
  canStart: boolean;
  starting: boolean;
  /** The last start's failure, mapped (in-progress / not-connected / rate-limited …); cleared on the next start. */
  error: string | null;
  start: () => Promise<void>;
}

/**
 * The Google Calendar sync task of one specialist, live.
 *
 * The task lives on the record (`latestGoogleCalendarSyncTask`) in the
 * catalog, and every update — the start's payload, the `taskUpdated` pushes,
 * a catch-up read — is written back there through `specialistTask`, so a
 * second mount (the list's dot, another tab of the same section) reads the
 * same state. While the task is running the hook subscribes to
 * `BookingTaskUpdated(taskID)`; a task found running at mount (page reloaded
 * mid-sync) is read once through `BookingTask` first, because the
 * subscription only carries changes from now on.
 */
export function useGoogleCalendarSync(record: SpecialistRecord): GoogleCalendarSync {
  const { client, botId } = useBookings();
  const catalog = useCatalog();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const task = record.latestGoogleCalendarSyncTask ?? null;
  const view = useMemo(() => taskView(task), [task]);
  const specialistId = record.id;
  const connected = Boolean(record.connectedGoogleCalendar);
  const runningTaskId = view?.running ? (task?.id ?? null) : null;

  // Catch up once, then follow.
  useEffect(() => {
    if (!runningTaskId) return;
    let cancelled = false;
    client
      .query(BookingTaskDocument, { taskID: runningTaskId })
      .then((data) => {
        if (!cancelled && data.getTask) catalog.dispatch({ type: 'specialistTask', specialistId, task: data.getTask });
      })
      .catch(() => {
        /* the subscription below is the primary channel; a failed catch-up is not an error to show */
      });
    const off = client.subscribe(
      BookingTaskUpdatedDocument,
      { taskID: runningTaskId },
      {
        next: (data) => {
          if (!cancelled && data.taskUpdated)
            catalog.dispatch({ type: 'specialistTask', specialistId, task: data.taskUpdated });
        },
        error: () => {
          /* a dropped stream leaves the last state on screen; the record refetch on reconnect catches up */
        },
      },
    );
    return () => {
      cancelled = true;
      off();
    };
  }, [client, catalog, specialistId, runningTaskId]);

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const data = await client.mutate(BookingGoogleCalendarSyncStartDocument, {
        botID: botId,
        specialistID: specialistId,
      });
      catalog.dispatch({ type: 'specialistTask', specialistId, task: data.specialistStartGoogleCalendarSync });
      // A start that succeeds on a record that still shows no calendar means the specialist finished
      // connecting since the last read (there is no specialist subscription) — reload the catalog.
      if (!connected) catalog.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  }, [client, botId, catalog, specialistId, connected]);

  const canStart = !starting && canStartSync(task);

  return useMemo(
    () => ({ task, view, canStart, starting, error, start }),
    [task, view, canStart, starting, error, start],
  );
}

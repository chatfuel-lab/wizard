/**
 * A Google Calendar sync `Task`, read into what the staff section shows.
 *
 * The API models a task as a LOG of statuses (`statuses[]`, each with a
 * `startedAt`), not a single field — the current state is the newest entry,
 * and "newest" is by `startedAt`, not by array position (a server may append
 * in any order). `completedPoints / totalPoints` is the bar;
 * `data.syncedEventsCount` is what the finished line counts. `Failed` and
 * `Cancelled` are terminal like `Finished`; `Paused` is not.
 *
 * Every function is pure over the fragment shape so the section can render
 * from `latestGoogleCalendarSyncTask` on the record, from a fresh
 * `specialistStartGoogleCalendarSync` payload, or from a `taskUpdated` push
 * without caring which.
 */
import { TaskStatusType } from '~api/generated/bookings/graphql';
import type { SyncTask } from '../types';

export type TaskStatus = TaskStatusType;

const TERMINAL: ReadonlySet<TaskStatusType> = new Set([
  TaskStatusType.Finished,
  TaskStatusType.Failed,
  TaskStatusType.Cancelled,
]);

/** The newest status entry by `startedAt` (ties → the later array entry), or null for an empty log. */
export function currentStatus(
  statuses: readonly { type: TaskStatusType; startedAt: string }[] | null | undefined,
): TaskStatusType | null {
  if (!statuses || statuses.length === 0) return null;
  let best = statuses[0]!;
  let bestAt = Date.parse(best.startedAt);
  for (let i = 1; i < statuses.length; i += 1) {
    const entry = statuses[i]!;
    const at = Date.parse(entry.startedAt);
    // A readable timestamp always beats an unreadable one — one bad `startedAt`
    // from the server must not pin the whole log to whatever came before it.
    // Between two unreadable ones there is nothing to compare, so array order wins.
    const wins = Number.isNaN(at) ? Number.isNaN(bestAt) : Number.isNaN(bestAt) || at >= bestAt;
    if (wins) {
      best = entry;
      bestAt = at;
    }
  }
  return best.type;
}

export function isTerminalStatus(status: TaskStatusType | null): boolean {
  return status !== null && TERMINAL.has(status);
}

/** 0..100, from the points; a task with no total is 0 until it finishes (then 100). */
export function taskPercent(task: Pick<SyncTask, 'completedPoints' | 'totalPoints' | 'statuses'>): number {
  const status = currentStatus(task.statuses);
  if (status === TaskStatusType.Finished) return 100;
  if (!task.totalPoints || task.totalPoints <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((task.completedPoints / task.totalPoints) * 100)));
}

export interface TaskView {
  status: TaskStatusType | null;
  /** True while the task is still going (Created / InProgress / Paused). */
  running: boolean;
  terminal: boolean;
  failed: boolean;
  percent: number;
  /** Events synced so far, when the task carries a sync payload. */
  synced: number | null;
  /** The connected calendar's summary from the payload, when present. */
  calendar: string | null;
  /** RFC3339 of when it finished, or null. */
  finishedAt: string | null;
  /** The one-line human state: "Syncing… 30 %", "Synced 12 events", "Sync failed", … */
  label: string;
}

/** Everything the Google Calendar section renders about a task, or null for "never synced". */
export function taskView(task: SyncTask | null | undefined): TaskView | null {
  if (!task) return null;
  const status = currentStatus(task.statuses);
  const sync = task.data.__typename === 'BookingGoogleCalendarSync' ? task.data : null;
  const failed = status === TaskStatusType.Failed || Boolean(sync?.isFailed);
  const terminal = isTerminalStatus(status) || failed;
  const percent = taskPercent(task);
  const synced = sync ? sync.syncedEventsCount : null;
  const calendar = sync?.calendar.summary ?? null;
  const finishedAt = sync?.finishedAt ?? null;
  return {
    status,
    running: !terminal,
    terminal,
    failed,
    percent,
    synced,
    calendar,
    finishedAt,
    label: taskLabel(status, failed, percent, synced),
  };
}

/** The sentence for a status. Exported for the tests; `taskView` is what components call. */
export function taskLabel(
  status: TaskStatusType | null,
  failed: boolean,
  percent: number,
  synced: number | null,
): string {
  if (failed) return 'Sync failed';
  switch (status) {
    case TaskStatusType.Finished:
      return synced === null ? 'Synced' : synced === 1 ? 'Synced 1 event' : `Synced ${synced} events`;
    case TaskStatusType.Cancelled:
      return 'Sync cancelled';
    case TaskStatusType.Paused:
      return `Sync paused at ${percent} %`;
    case TaskStatusType.InProgress:
      return `Syncing… ${percent} %`;
    case TaskStatusType.Created:
      return 'Sync queued';
    case null:
      return 'Never synced';
    default:
      return 'Syncing…';
  }
}

/** True when a new sync may be started: no task, or the last one is over. */
export function canStartSync(task: SyncTask | null | undefined): boolean {
  const view = taskView(task);
  return view === null || view.terminal;
}

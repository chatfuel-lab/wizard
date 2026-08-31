import { describe, expect, it } from 'vitest';
import { TaskStatusType } from '~api/generated/bookings/graphql';
import type { SyncTask } from '../types';
import { canStartSync, currentStatus, isTerminalStatus, taskLabel, taskPercent, taskView } from './taskState';

const status = (type: TaskStatusType, startedAt: string) => ({ type, startedAt });

function task(over: Partial<SyncTask> & { statuses?: SyncTask['statuses'] } = {}): SyncTask {
  return {
    id: 'task-1',
    completedPoints: 3,
    totalPoints: 10,
    deadline: '2026-08-18T10:00:00+02:00',
    statuses: [
      status(TaskStatusType.Created, '2026-08-17T10:00:00+02:00'),
      status(TaskStatusType.InProgress, '2026-08-17T10:00:05+02:00'),
    ],
    data: {
      __typename: 'BookingGoogleCalendarSync',
      id: 'task-1',
      startedAt: '2026-08-17T10:00:00+02:00',
      finishedAt: null,
      isFailed: false,
      syncedEventsCount: 4,
      calendar: { id: 'gcal-1', summary: 'alex@example.com' },
    },
    ...over,
  };
}

describe('currentStatus', () => {
  it('is null for an empty log', () => {
    expect(currentStatus([])).toBeNull();
    expect(currentStatus(null)).toBeNull();
  });
  it('picks the newest by startedAt, not by position', () => {
    const log = [
      status(TaskStatusType.Finished, '2026-08-17T10:00:09+02:00'),
      status(TaskStatusType.Created, '2026-08-17T10:00:00+02:00'),
    ];
    expect(currentStatus(log)).toBe(TaskStatusType.Finished);
  });
  it('breaks ties toward the later entry', () => {
    const log = [
      status(TaskStatusType.Created, '2026-08-17T10:00:00+02:00'),
      status(TaskStatusType.InProgress, '2026-08-17T10:00:00+02:00'),
    ];
    expect(currentStatus(log)).toBe(TaskStatusType.InProgress);
  });
  it('falls back to array order for unparseable timestamps', () => {
    const log = [status(TaskStatusType.Created, 'nope'), status(TaskStatusType.InProgress, 'nope')];
    expect(currentStatus(log)).toBe(TaskStatusType.InProgress);
  });
  it('a readable timestamp beats an unreadable one, wherever it sits', () => {
    const first = [status(TaskStatusType.Created, 'nope'), status(TaskStatusType.Finished, '2026-08-17T10:00:00Z')];
    expect(currentStatus(first)).toBe(TaskStatusType.Finished);
    const last = [status(TaskStatusType.Finished, '2026-08-17T10:00:00Z'), status(TaskStatusType.Created, 'nope')];
    expect(currentStatus(last)).toBe(TaskStatusType.Finished);
    // A bad entry in the middle must not hide the entries after it either.
    const middle = [
      status(TaskStatusType.Created, '2026-08-17T10:00:00Z'),
      status(TaskStatusType.Paused, 'nope'),
      status(TaskStatusType.Finished, '2026-08-17T10:00:09Z'),
    ];
    expect(currentStatus(middle)).toBe(TaskStatusType.Finished);
  });
});

describe('isTerminalStatus', () => {
  it('finished, failed and cancelled are terminal; the rest are not', () => {
    expect(isTerminalStatus(TaskStatusType.Finished)).toBe(true);
    expect(isTerminalStatus(TaskStatusType.Failed)).toBe(true);
    expect(isTerminalStatus(TaskStatusType.Cancelled)).toBe(true);
    expect(isTerminalStatus(TaskStatusType.Paused)).toBe(false);
    expect(isTerminalStatus(TaskStatusType.InProgress)).toBe(false);
    expect(isTerminalStatus(TaskStatusType.Created)).toBe(false);
    expect(isTerminalStatus(null)).toBe(false);
  });
});

describe('taskPercent', () => {
  it('is points over total, rounded and clamped', () => {
    expect(taskPercent(task())).toBe(30);
    expect(taskPercent(task({ completedPoints: 12 }))).toBe(100);
    expect(taskPercent(task({ completedPoints: -1 }))).toBe(0);
    expect(taskPercent(task({ completedPoints: 1, totalPoints: 3 }))).toBe(33);
  });
  it('is 0 without a total, and 100 once finished regardless of points', () => {
    expect(taskPercent(task({ totalPoints: 0 }))).toBe(0);
    expect(
      taskPercent(
        task({ completedPoints: 0, statuses: [status(TaskStatusType.Finished, '2026-08-17T10:00:09+02:00')] }),
      ),
    ).toBe(100);
  });
});

describe('taskView', () => {
  it('is null for no task', () => {
    expect(taskView(null)).toBeNull();
    expect(taskView(undefined)).toBeNull();
  });
  it('reads a running task', () => {
    const view = taskView(task())!;
    expect(view.status).toBe(TaskStatusType.InProgress);
    expect(view.running).toBe(true);
    expect(view.terminal).toBe(false);
    expect(view.failed).toBe(false);
    expect(view.percent).toBe(30);
    expect(view.synced).toBe(4);
    expect(view.calendar).toBe('alex@example.com');
    expect(view.label).toBe('Syncing… 30 %');
  });
  it('reads a finished task', () => {
    const t = task({
      completedPoints: 10,
      statuses: [
        status(TaskStatusType.Created, '2026-08-17T10:00:00+02:00'),
        status(TaskStatusType.Finished, '2026-08-17T10:00:09+02:00'),
      ],
      data: { ...task().data, syncedEventsCount: 12, finishedAt: '2026-08-17T10:00:09+02:00' } as SyncTask['data'],
    });
    const view = taskView(t)!;
    expect(view.running).toBe(false);
    expect(view.terminal).toBe(true);
    expect(view.percent).toBe(100);
    expect(view.finishedAt).toBe('2026-08-17T10:00:09+02:00');
    expect(view.label).toBe('Synced 12 events');
  });
  it('treats isFailed on the payload as failed even if the status log lags', () => {
    const t = task({ data: { ...task().data, isFailed: true } as SyncTask['data'] });
    const view = taskView(t)!;
    expect(view.failed).toBe(true);
    expect(view.terminal).toBe(true);
    expect(view.running).toBe(false);
    expect(view.label).toBe('Sync failed');
  });
  it('copes with a task whose data is not a sync payload', () => {
    const t = task({ data: { __typename: 'UnavailableTaskData' } as SyncTask['data'] });
    const view = taskView(t)!;
    expect(view.synced).toBeNull();
    expect(view.calendar).toBeNull();
    expect(view.running).toBe(true);
  });
});

describe('taskLabel', () => {
  it('speaks each state', () => {
    expect(taskLabel(null, false, 0, null)).toBe('Never synced');
    expect(taskLabel(TaskStatusType.Created, false, 0, 0)).toBe('Sync queued');
    expect(taskLabel(TaskStatusType.InProgress, false, 80, 9)).toBe('Syncing… 80 %');
    expect(taskLabel(TaskStatusType.Paused, false, 50, 5)).toBe('Sync paused at 50 %');
    expect(taskLabel(TaskStatusType.Finished, false, 100, 1)).toBe('Synced 1 event');
    expect(taskLabel(TaskStatusType.Finished, false, 100, null)).toBe('Synced');
    expect(taskLabel(TaskStatusType.Cancelled, false, 40, 3)).toBe('Sync cancelled');
    expect(taskLabel(TaskStatusType.InProgress, true, 40, 3)).toBe('Sync failed');
  });
});

describe('canStartSync', () => {
  it('allows a start with no task or a finished one, refuses while running', () => {
    expect(canStartSync(null)).toBe(true);
    expect(canStartSync(task())).toBe(false);
    expect(canStartSync(task({ statuses: [status(TaskStatusType.Failed, '2026-08-17T10:00:09+02:00')] }))).toBe(true);
    expect(canStartSync(task({ statuses: [status(TaskStatusType.Finished, '2026-08-17T10:00:09+02:00')] }))).toBe(true);
  });
});

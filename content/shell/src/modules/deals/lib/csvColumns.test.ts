import { describe, expect, it } from 'vitest';
import { bindDealFields } from './dealFieldBinding';
import {
  canExport,
  columnsLabel,
  csvColumnOptions,
  defaultCsvSelection,
  exportAttributes,
  exportStatusLabel,
  isActive,
  isTerminal,
  readExportTask,
  toggleCsvColumn,
  type ExportTaskLike,
} from './csvColumns';

const bindings = bindDealFields([{ name: 'Deal Amount' }, { name: 'deal currency' }]);
const options = csvColumnOptions(bindings);

const task = (over: Partial<ExportTaskLike> = {}): ExportTaskLike => ({
  id: 'task-1',
  completedPoints: 0,
  totalPoints: 0,
  statuses: [{ startedAt: '2026-05-20T10:00:00.000Z', type: 'Created' }],
  data: { __typename: 'CSVContactsExport', id: 'export-9', file: null },
  ...over,
});

describe('csvColumnOptions', () => {
  it('exports the name this bot really has, not the configured one', () => {
    const amount = options.find((option) => option.label === 'Amount')!;
    expect(amount.name).toBe('Deal Amount'); // bound case-insensitively
    expect(amount.bound).toBe(true);
  });

  it('still offers an unbound field, flagged', () => {
    const company = options.find((option) => option.label === 'Company')!;
    expect(company.bound).toBe(false);
    expect(company.name).toBe('deal company');
  });

  it('defaults to every deal field', () => {
    expect(defaultCsvSelection(bindings)).toHaveLength(options.length);
  });
});

describe('exportAttributes', () => {
  it('sends the EMPTY list for "all" — that is what the API means by all', () => {
    expect(exportAttributes('all', ['Deal Amount'], options)).toEqual([]);
  });

  it('dedupes, trims and drops names that are not columns', () => {
    expect(exportAttributes('selected', ['Deal Amount', ' Deal Amount ', '', 'not a column'], options)).toEqual([
      'Deal Amount',
    ]);
  });

  it('refuses to send an empty selection, because empty means "everything"', () => {
    const attributes = exportAttributes('selected', [], options);
    expect(attributes).toEqual([]);
    expect(canExport('selected', attributes)).toBe(false);
    expect(canExport('all', attributes)).toBe(true);
  });

  it('toggles one column at a time', () => {
    expect(toggleCsvColumn(['a', 'b'], 'b')).toEqual(['a']);
    expect(toggleCsvColumn(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('labels the selection honestly', () => {
    expect(columnsLabel('all', [])).toBe('Every attribute on the contact');
    expect(columnsLabel('selected', ['a'])).toBe('1 deal field');
    expect(columnsLabel('selected', ['a', 'b'])).toBe('2 deal fields');
    expect(columnsLabel('selected', [])).toBe('No columns selected');
  });
});

describe('readExportTask', () => {
  it('takes the phase from the LATEST status, not the first', () => {
    const progress = readExportTask(
      task({
        statuses: [
          { startedAt: '2026-05-20T10:00:00.000Z', type: 'Created' },
          { startedAt: '2026-05-20T10:00:05.000Z', type: 'InProgress' },
        ],
      }),
    );
    expect(progress.phase).toBe('running');
  });

  it('ignores an unparseable or unknown status rather than falling over', () => {
    const progress = readExportTask(
      task({
        statuses: [
          { startedAt: null, type: 'Nonsense' },
          { startedAt: 'x', type: 'InProgress' },
        ],
      }),
    );
    expect(progress.phase).toBe('running');
    expect(readExportTask(task({ statuses: null })).phase).toBe('queued');
  });

  it('surfaces the CANCEL id separately from the task id — they are different ids', () => {
    const progress = readExportTask(task());
    expect(progress.taskId).toBe('task-1');
    expect(progress.cancelId).toBe('export-9');
  });

  it('has no cancel id for a task that is not a CSV export', () => {
    expect(readExportTask(task({ data: { __typename: 'BookingGoogleCalendarSync' } })).cancelId).toBeNull();
  });

  it('is indeterminate until the server publishes a total', () => {
    expect(readExportTask(task({ completedPoints: 3, totalPoints: 0 })).percent).toBeNull();
    expect(readExportTask(task({ completedPoints: 3, totalPoints: 12 })).percent).toBe(25);
    expect(readExportTask(task({ completedPoints: 99, totalPoints: 12 })).percent).toBe(100);
  });

  it('counts a delivered file as done even if the status log lags', () => {
    const progress = readExportTask(
      task({
        data: {
          __typename: 'CSVContactsExport',
          id: 'export-9',
          file: { url: 'https://files.example/deals.csv', status: 'Downloaded' },
        },
      }),
    );
    expect(progress.phase).toBe('done');
    expect(progress.fileUrl).toBe('https://files.example/deals.csv');
  });

  it('knows which phases are worth polling', () => {
    expect(isTerminal('running')).toBe(false);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isActive(readExportTask(task()))).toBe(true);
    expect(isActive(null)).toBe(false);
    expect(
      isActive(readExportTask(task({ statuses: [{ startedAt: '2026-05-20T11:00:00.000Z', type: 'Failed' }] }))),
    ).toBe(false);
  });

  it('says what is happening in words', () => {
    expect(exportStatusLabel(readExportTask(task()))).toBe('Queued');
    expect(
      exportStatusLabel(
        readExportTask(
          task({
            completedPoints: 40,
            totalPoints: 128,
            statuses: [{ startedAt: '2026-05-20T10:00:05.000Z', type: 'InProgress' }],
          }),
        ),
      ),
    ).toBe('Exporting… 40 of 128');
    expect(
      exportStatusLabel(
        readExportTask(task({ statuses: [{ startedAt: '2026-05-20T11:00:00.000Z', type: 'Finished' }] })),
      ),
    ).toBe('Finished — the file is not available');
  });
});

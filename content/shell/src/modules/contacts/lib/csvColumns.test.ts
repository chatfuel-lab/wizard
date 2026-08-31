import { describe, expect, it } from 'vitest';
import {
  MAX_EXPORT_IDS,
  canExport,
  cancelNote,
  chunkIds,
  columnsLabel,
  csvColumnOptions,
  defaultCsvSelection,
  effectiveExportScope,
  exportAttributes,
  exportErrorSentence,
  exportStatusLabel,
  isActive,
  isTerminal,
  readExportTask,
  scopeDescription,
  toggleCsvColumn,
  type CatalogEntryLike,
  type ExportTaskLike,
} from './csvColumns';

const entry = (name: string, usersCount: number | null = 3, type = 'custom'): CatalogEntryLike => ({
  name,
  type,
  usersCount,
});

const CATALOG = [entry('company'), entry('city'), entry('plan', 0), entry('contact name', 40, 'system')];
const OPTIONS = csvColumnOptions(CATALOG);

describe('csvColumnOptions', () => {
  it('keeps the catalog order and drops repeats', () => {
    const options = csvColumnOptions([entry('a'), entry('b'), entry('a'), entry('  ')]);
    expect(options.map((option) => option.name)).toEqual(['a', 'b']);
  });
});

describe('defaultCsvSelection', () => {
  it('ticks only the attributes some contact carries', () => {
    expect(defaultCsvSelection(OPTIONS)).toEqual(['company', 'city', 'contact name']);
  });

  it('falls back to everything when the catalog reports no counts at all', () => {
    const options = csvColumnOptions([entry('a', 0), entry('b', null)]);
    expect(defaultCsvSelection(options)).toEqual(['a', 'b']);
  });
});

describe('exportAttributes', () => {
  it('sends the EMPTY array for "everything" — that is what means all', () => {
    expect(exportAttributes('all', ['company'], OPTIONS)).toEqual({ names: [], dropped: [] });
  });

  it('drops names the catalog no longer knows and reports them', () => {
    const request = exportAttributes('selected', ['company', 'retired field', 'city'], OPTIONS);
    expect(request.names).toEqual(['company', 'city']);
    expect(request.dropped).toEqual(['retired field']);
  });

  it('de-duplicates and trims without reordering', () => {
    const request = exportAttributes('selected', [' city ', 'city', 'company'], OPTIONS);
    expect(request.names).toEqual(['city', 'company']);
  });

  it('refuses to send "selected" with nothing left', () => {
    const request = exportAttributes('selected', ['gone'], OPTIONS);
    expect(canExport('selected', request)).toBe(false);
    expect(canExport('all', request)).toBe(true);
    expect(columnsLabel('selected', request)).toBe('No columns picked');
  });
});

describe('toggleCsvColumn', () => {
  it('adds and removes', () => {
    expect(toggleCsvColumn(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleCsvColumn(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('chunkIds', () => {
  it('splits at the API cap and de-duplicates first', () => {
    const ids = Array.from({ length: 250 }, (_, i) => `c${i}`);
    const chunks = chunkIds([...ids, 'c0']);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(MAX_EXPORT_IDS);
    expect(chunks[2]).toHaveLength(50);
  });

  it('is empty for an empty selection', () => {
    expect(chunkIds([])).toEqual([]);
  });
});

describe('scopeDescription', () => {
  it('says how many files a big selection becomes', () => {
    expect(scopeDescription('ids', 250, true)).toContain('3 exports');
  });

  it('says nothing about files for a selection that fits', () => {
    expect(scopeDescription('ids', 12, true)).not.toContain('exports and you get');
  });

  it('separates "the filter" from "the whole bot"', () => {
    expect(scopeDescription('segment', 0, true)).toContain('this filter matches on the server');
    expect(scopeDescription('segment', 0, false)).toContain('Every contact on this bot');
  });
});

describe('effectiveExportScope', () => {
  /* The regression these three guard: the dialog is mounted with the toolbar,
     so a scope seeded from the selection is seeded while nothing is selected.
     Every one of them describes a person about to press Export. */
  it('defaults to the selection as soon as rows are ticked, however long the dialog has been open', () => {
    expect(effectiveExportScope(null, 5)).toBe('ids');
  });

  it('falls back to the segment when nothing is selected — there are no ids to send', () => {
    expect(effectiveExportScope(null, 0)).toBe('segment');
    expect(effectiveExportScope('ids', 0)).toBe('segment');
  });

  it('never overrides a choice the user actually made', () => {
    expect(effectiveExportScope('segment', 5)).toBe('segment');
    expect(effectiveExportScope('ids', 5)).toBe('ids');
  });
});

describe('readExportTask', () => {
  const task = (
    statuses: { type: string; startedAt: string }[],
    extra: Partial<ExportTaskLike> = {},
  ): ExportTaskLike => ({
    id: 'task-1',
    completedPoints: 0,
    totalPoints: 0,
    statuses,
    data: { __typename: 'CSVContactsExport', id: 'export-1', file: null },
    ...extra,
  });

  it('takes the LATEST status, not the last array entry', () => {
    const progress = readExportTask(
      task([
        { type: 'InProgress', startedAt: '2026-08-18T10:00:02.000Z' },
        { type: 'Created', startedAt: '2026-08-18T10:00:00.000Z' },
      ]),
    );
    expect(progress.phase).toBe('running');
  });

  it('surfaces the cancel id separately from the task id', () => {
    const progress = readExportTask(task([{ type: 'Created', startedAt: '2026-08-18T10:00:00.000Z' }]));
    expect(progress.taskId).toBe('task-1');
    expect(progress.cancelId).toBe('export-1');
  });

  it('has no cancel id when the task is not a CSV export', () => {
    const progress = readExportTask(task([], { data: { __typename: 'BookingGoogleCalendarSync' } }));
    expect(progress.cancelId).toBeNull();
    expect(progress.fileUrl).toBeNull();
  });

  it('calls a task with a file done even when the log says Cancelled — the lost race', () => {
    const progress = readExportTask(
      task([{ type: 'Cancelled', startedAt: '2026-08-18T10:00:01.000Z' }], {
        data: { __typename: 'CSVContactsExport', id: 'export-1', file: { url: 'https://files/x.csv' } },
      }),
    );
    expect(progress.phase).toBe('done');
    expect(progress.fileUrl).toBe('https://files/x.csv');
  });

  it('is indeterminate until the server publishes a total', () => {
    const queued = readExportTask(task([{ type: 'InProgress', startedAt: '2026-08-18T10:00:00.000Z' }]));
    expect(queued.percent).toBeNull();
    expect(exportStatusLabel(queued)).toBe('Exporting…');

    const half = readExportTask(
      task([{ type: 'InProgress', startedAt: '2026-08-18T10:00:00.000Z' }], {
        completedPoints: 30,
        totalPoints: 60,
      }),
    );
    expect(half.percent).toBe(50);
    expect(exportStatusLabel(half)).toContain('30 of 60');
  });

  it('clamps a percentage the server overshoots', () => {
    const progress = readExportTask(
      task([{ type: 'InProgress', startedAt: '2026-08-18T10:00:00.000Z' }], {
        completedPoints: 70,
        totalPoints: 50,
      }),
    );
    expect(progress.percent).toBe(100);
  });

  it('calls a task past its deadline failed, whatever the log says', () => {
    const overdue = task([{ type: 'InProgress', startedAt: '2026-08-18T10:00:00.000Z' }], {
      deadline: '2026-08-18T10:05:00.000Z',
    });
    expect(readExportTask(overdue, Date.parse('2026-08-18T10:04:00.000Z')).phase).toBe('running');
    expect(readExportTask(overdue, Date.parse('2026-08-18T10:06:00.000Z')).phase).toBe('failed');
  });

  it('does not retire a finished task just because its deadline passed', () => {
    const done = task([{ type: 'Finished', startedAt: '2026-08-18T10:00:00.000Z' }], {
      deadline: '2026-08-18T10:05:00.000Z',
      data: { __typename: 'CSVContactsExport', id: 'e', file: { url: 'https://f/x.csv' } },
    });
    expect(readExportTask(done, Date.parse('2026-08-19T00:00:00.000Z')).phase).toBe('done');
  });

  it('never reports a negative or NaN count', () => {
    const progress = readExportTask(task([], { completedPoints: -5, totalPoints: Number.NaN as unknown as number }));
    expect(progress.completed).toBe(0);
    expect(progress.total).toBe(0);
    expect(progress.percent).toBeNull();
  });

  it('knows which phases are worth polling', () => {
    expect(isTerminal('done')).toBe(true);
    expect(isTerminal('running')).toBe(false);
    expect(isActive(null)).toBe(false);
    expect(isActive(readExportTask(task([{ type: 'Created', startedAt: '2026-08-18T10:00:00.000Z' }])))).toBe(true);
  });
});

describe('cancelNote', () => {
  const progress = (phase: string, fileUrl: string | null = null) =>
    readExportTask({
      id: 't',
      statuses: [{ type: phase, startedAt: '2026-08-18T10:00:00.000Z' }],
      data: { __typename: 'CSVContactsExport', id: 'e', file: fileUrl ? { url: fileUrl } : null },
    });

  it('says nothing when no cancel was asked for', () => {
    expect(cancelNote(progress('Finished', 'https://f/x.csv'), false)).toBeNull();
  });

  it('admits the export finished anyway rather than claiming it was cancelled', () => {
    expect(cancelNote(progress('Finished', 'https://f/x.csv'), true)).toContain('finished before the cancel');
  });

  it('confirms a cancel that actually landed', () => {
    expect(cancelNote(progress('Cancelled'), true)).toContain('Cancelled before the file');
  });

  it('warns while the answer is still unknown', () => {
    expect(cancelNote(progress('InProgress'), true)).toContain('often finishes anyway');
  });
});

describe('exportErrorSentence', () => {
  it('turns each documented code into something to do next', () => {
    expect(exportErrorSentence('CSVContactExportAlreadyInProgress', 'x')).toContain('already has an export running');
    expect(exportErrorSentence('SegmentIsInvalid', 'x')).toContain('rejected the filter');
    expect(exportErrorSentence('CSVContactExportInvalidContactIDsCount', 'x')).toContain(String(MAX_EXPORT_IDS));
    expect(exportErrorSentence('NotEnoughPermissions', 'x')).toContain('People: View');
  });

  it('keeps the server’s own message when the code is unknown', () => {
    expect(exportErrorSentence(null, 'boom')).toBe('boom');
  });
});

import { describe, expect, it } from 'vitest';
import {
  SAMPLE_CSV,
  columnErrorSentence,
  columnsFingerprint,
  columnsRequest,
  commonErrorSentence,
  draftsFrom,
  duplicateColumnIndexes,
  errorsFileSentence,
  importErrorSentence,
  importOutcome,
  importedContactsCaveat,
  isFinished,
  isRunning,
  mappedCount,
  mappingIssues,
  missingPhoneColumn,
  progressLabel,
  setColumnAttribute,
  stepFor,
  type ColumnDraft,
  type ImportLike,
} from './importPlan';

const IMPORT: ImportLike = {
  id: 'imp-1',
  columns: [
    { columnIndex: 1, columnPreview: 'Dana Ray', attribute: { name: 'contact name' } },
    { columnIndex: 0, columnPreview: '+15555550101', attribute: { name: 'whatsapp phone' } },
    { columnIndex: 2, columnPreview: 'Northwind Trading', attribute: null },
  ],
  validationErrors: [],
  partialContactsErrors: [],
  declinedContactsErrors: [],
  createdContacts: 0,
  updatedContacts: 0,
  declinedContacts: 0,
  startedAt: null,
  finishedAt: null,
};

const PHONE_NAMES = ['whatsapp phone'];

describe('draftsFrom', () => {
  it('sorts by column index and keeps the backend guess', () => {
    const drafts = draftsFrom(IMPORT);
    expect(drafts.map((draft) => draft.index)).toEqual([0, 1, 2]);
    expect(drafts[0].attributeName).toBe('whatsapp phone');
    expect(drafts[2].attributeName).toBeNull();
  });
});

describe('columnsFingerprint', () => {
  it('is stable across the counter ticks a subscription delivers', () => {
    expect(columnsFingerprint({ ...IMPORT, createdContacts: 12, updatedContacts: 3 })).toBe(columnsFingerprint(IMPORT));
  });

  /* The swap case: `csvContactImportUpdateFile` keeps the import id, so a file
     re-picked over one with the same header row differs in the previews and in
     nothing else. Miss that and the mapping screen shows sample values from the
     file that was just replaced. */
  it('changes when a swapped file brings new previews under identical guesses', () => {
    const swapped: ImportLike = {
      ...IMPORT,
      columns: IMPORT.columns.map((column) => ({ ...column, columnPreview: `feb ${column.columnPreview}` })),
    };
    expect(columnsFingerprint(swapped)).not.toBe(columnsFingerprint(IMPORT));
  });

  it('changes when the backend re-guesses a column', () => {
    const reguessed: ImportLike = {
      ...IMPORT,
      columns: IMPORT.columns.map((column) =>
        column.columnIndex === 2 ? { ...column, attribute: { name: 'company' } } : column,
      ),
    };
    expect(columnsFingerprint(reguessed)).not.toBe(columnsFingerprint(IMPORT));
  });

  it('is empty when there is no import yet', () => {
    expect(columnsFingerprint(null)).toBe('');
  });
});

describe('columnsRequest', () => {
  it('leaves unmapped columns out entirely rather than sending an empty name', () => {
    const request = columnsRequest(draftsFrom(IMPORT));
    expect(request.columns).toEqual([
      { columnIndex: 0, attributeName: 'whatsapp phone' },
      { columnIndex: 1, attributeName: 'contact name' },
    ]);
    expect(mappedCount(draftsFrom(IMPORT))).toBe(2);
  });

  it('treats a whitespace-only name as unmapped', () => {
    const drafts: ColumnDraft[] = [{ index: 0, preview: 'x', attributeName: '   ' }];
    expect(columnsRequest(drafts).columns).toEqual([]);
  });
});

describe('setColumnAttribute', () => {
  it('normalises an empty pick back to null', () => {
    const drafts = setColumnAttribute(draftsFrom(IMPORT), 1, '');
    expect(drafts[1].attributeName).toBeNull();
  });
});

describe('duplicateColumnIndexes', () => {
  it('names every column in the clash, sorted', () => {
    const drafts = setColumnAttribute(draftsFrom(IMPORT), 2, 'contact name');
    expect(duplicateColumnIndexes(drafts)).toEqual([1, 2]);
  });

  it('is empty when each attribute is used once', () => {
    expect(duplicateColumnIndexes(draftsFrom(IMPORT))).toEqual([]);
  });
});

describe('missingPhoneColumn', () => {
  it('only applies to WhatsApp', () => {
    const drafts = setColumnAttribute(draftsFrom(IMPORT), 0, null);
    expect(missingPhoneColumn('whatsapp', drafts, PHONE_NAMES)).toBe(true);
    expect(missingPhoneColumn('instagram', drafts, PHONE_NAMES)).toBe(false);
  });

  it('accepts a phone attribute the catalog never listed', () => {
    const drafts = setColumnAttribute(setColumnAttribute(draftsFrom(IMPORT), 0, null), 2, 'mobile phone');
    expect(missingPhoneColumn('whatsapp', drafts, PHONE_NAMES)).toBe(false);
  });

  it('is satisfied by the backend’s own guess', () => {
    expect(missingPhoneColumn('whatsapp', draftsFrom(IMPORT), PHONE_NAMES)).toBe(false);
  });
});

describe('mappingIssues', () => {
  it('is empty for the mapping the backend guessed', () => {
    expect(mappingIssues(IMPORT, draftsFrom(IMPORT), 'whatsapp', PHONE_NAMES)).toEqual([]);
  });

  it('files a column error against its own column and a common one against none', () => {
    const withErrors: ImportLike = {
      ...IMPORT,
      validationErrors: [
        { __typename: 'CSVContactImportColumnError', columnErrCode: 'SystemAttrNotAllowed', columnIndex: 1 },
        { __typename: 'CSVContactImportCommonError', commonErrCode: 'FileSizeTooBig' },
      ],
    };
    const issues = mappingIssues(withErrors, draftsFrom(withErrors), 'whatsapp', PHONE_NAMES);
    expect(issues[0].columnIndex).toBe(1);
    expect(issues[0].text).toContain('system attribute');
    expect(issues[1].columnIndex).toBeNull();
    expect(issues[1].text).toContain('too large');
  });

  it('warns about the missing phone column BEFORE the server does', () => {
    const drafts = setColumnAttribute(draftsFrom(IMPORT), 0, null);
    const issues = mappingIssues(IMPORT, drafts, 'whatsapp', PHONE_NAMES);
    expect(issues.some((issue) => issue.text.includes('needs a phone column'))).toBe(true);
  });

  it('refuses an import that maps nothing', () => {
    const drafts = draftsFrom(IMPORT).map((draft) => ({ ...draft, attributeName: null }));
    const issues = mappingIssues(IMPORT, drafts, 'instagram', PHONE_NAMES);
    expect(issues.some((issue) => issue.text.includes('Nothing is mapped'))).toBe(true);
  });

  it('says nothing at all before a file exists', () => {
    expect(mappingIssues(null, [], 'whatsapp', PHONE_NAMES)).toEqual([]);
  });
});

describe('error sentences', () => {
  it('covers every documented file-level code', () => {
    for (const code of ['FileIsEmpty', 'FileSizeTooBig', 'FileInvalidFormat', 'WaPhoneRequired']) {
      expect(commonErrorSentence(code)).not.toContain(code);
    }
    expect(commonErrorSentence('Unheard')).toContain('Unheard');
  });

  it('covers every documented column code', () => {
    for (const code of ['ColumnDuplicated', 'SystemAttrNotAllowed', 'AttrIsInvalid']) {
      expect(columnErrorSentence(code)).not.toContain(code);
    }
  });

  it('covers every documented mutation code', () => {
    const codes = [
      'ContactImportPlatformNotAllowed',
      'ContactScopeNotConnected',
      'CSVContactImportFileDoesNotExist',
      'CSVContactImportDoesNotExist',
      'CSVContactImportAlreadyStarted',
      'CSVContactImportAlreadyFinished',
      'CSVContactImportAtLeastOneColumnRequired',
      'CSVContactImportInvalidColumnIndex',
      'NotEnoughPermissions',
    ];
    for (const code of codes) expect(importErrorSentence(code, 'fallback')).not.toBe('fallback');
    expect(importErrorSentence(null, 'fallback')).toBe('fallback');
  });

  it('stays silent about the two ordinary errorsFile failures', () => {
    expect(errorsFileSentence('CSVContactImportErrorsEmpty')).toBeNull();
    expect(errorsFileSentence('CSVContactImportNotFinishedYet')).toBeNull();
    expect(errorsFileSentence('CSVContactImportErrorsExpired')).toContain('expired');
    expect(errorsFileSentence(null)).toBeNull();
  });
});

describe('stepFor', () => {
  it('walks file → map → run → done', () => {
    expect(stepFor(null)).toBe('file');
    expect(stepFor(IMPORT)).toBe('map');
    expect(stepFor({ ...IMPORT, startedAt: '2026-08-18T10:00:00.000Z' })).toBe('run');
    expect(stepFor({ ...IMPORT, startedAt: '2026-08-18T10:00:00.000Z', finishedAt: '2026-08-18T10:00:09.000Z' })).toBe(
      'done',
    );
  });

  it('reads running and finished consistently', () => {
    expect(isRunning(IMPORT)).toBe(false);
    expect(isRunning({ ...IMPORT, startedAt: 'x' })).toBe(true);
    expect(isFinished({ ...IMPORT, startedAt: 'x', finishedAt: 'y' })).toBe(true);
  });
});

describe('importOutcome', () => {
  it('names only the outcomes that happened', () => {
    const outcome = importOutcome({ ...IMPORT, createdContacts: 8, updatedContacts: 0, declinedContacts: 0 });
    expect(outcome.headline).toBe('8 contacts created.');
    expect(outcome.imported).toBe(8);
  });

  it('singularises', () => {
    const outcome = importOutcome({ ...IMPORT, createdContacts: 1, declinedContacts: 1 });
    expect(outcome.headline).toBe('1 contact created, 1 row rejected.');
  });

  it('says so when an import changed nothing rather than printing three zeros', () => {
    expect(importOutcome(IMPORT).headline).toContain('without changing anything');
  });

  it('never renders NaN or a negative count', () => {
    const outcome = importOutcome({
      ...IMPORT,
      createdContacts: Number.NaN as unknown as number,
      updatedContacts: -3,
      declinedContacts: 2.7,
    });
    expect(outcome.created).toBe(0);
    expect(outcome.updated).toBe(0);
    expect(outcome.declined).toBe(2);
    expect(progressLabel({ ...IMPORT, createdContacts: Number.NaN as unknown as number })).toContain('0 created');
  });
});

describe('importedContactsCaveat', () => {
  it('is emitted only when contacts were actually created', () => {
    expect(importedContactsCaveat(importOutcome({ ...IMPORT, createdContacts: 3 }))).toContain('no conversation yet');
    expect(importedContactsCaveat(importOutcome({ ...IMPORT, updatedContacts: 3 }))).toBeNull();
  });
});

describe('SAMPLE_CSV', () => {
  it('is a header plus eight rows of five columns', () => {
    const lines = SAMPLE_CSV.trim().split('\n');
    expect(lines).toHaveLength(9);
    expect(lines[0]).toBe('phone,name,company,city,plan');
    for (const line of lines) expect(line.split(',')).toHaveLength(5);
  });

  it('only carries numbers from the range reserved for fiction', () => {
    for (const line of SAMPLE_CSV.trim().split('\n').slice(1)) {
      expect(line).toMatch(/^\+1555555010\d,/);
    }
  });

  /* The twin of this file — `modules/contacts/skill/assets/contacts-sample.csv`,
     what a scaffolded install hands a client — cannot be asserted from here:
     module code may not import `node:fs` (the import boundaries), and
     a shell test that reached into `modules/` would fail in a scaffolded app,
     where that tree does not exist. The two copies are kept in step by the
     sentence in this file's header and by `references/import-export.md`. */
});

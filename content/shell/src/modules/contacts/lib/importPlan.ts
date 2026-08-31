/**
 * The CSV import wizard's judgement: the column mapping, every error the API
 * can answer with turned into a sentence a person can act on, and the
 * pre-flight checks that stop a run which is already known to fail.
 *
 * The import is a five-call flow (REST upload → `csvContactImportCreate` →
 * `csvContactImportUpdateColumns` → `csvContactImportStart` → the
 * `csvContactImportUpdated` subscription), and almost everything that can go
 * wrong is reported as a code rather than as prose. Three properties of the
 * API decide the shape of this file:
 *
 * 1. **The API maps the columns itself, first.** `csvContactImportCreate`
 *    comes back with `columns[].attribute` already guessed — for WhatsApp it
 *    has to, because the phone column is required. So the wizard's job is to
 *    *show and correct* a mapping, never to build one from nothing, and an
 *    unmapped column is a deliberate "skip this one" rather than a gap.
 * 2. **Validation is a union, and half of it belongs to a column.**
 *    `CSVContactImportCommonError` is about the file; `CSVContactImportColumnError`
 *    carries a `columnIndex`, and a message that does not render next to that
 *    column is a message nobody can act on.
 * 3. **The import never says how many rows the file has.** There is no total,
 *    no percentage and no points — only `createdContacts` / `updatedContacts` /
 *    `declinedContacts` counting up. A progress bar here would be an invented
 *    number, so the UI counts rather than fills.
 */

export type ImportStep = 'file' | 'map' | 'run' | 'done';

/** One column of the uploaded file, with the attribute it will be written to. */
export interface ColumnDraft {
  index: number;
  /** The first row's value, straight from `columnPreview`. */
  preview: string;
  /** Null = do not import this column. */
  attributeName: string | null;
}

/** The subset of `CSVContactImport` this file reasons about. */
export interface ImportLike {
  id: string;
  columns: readonly {
    columnIndex: number;
    columnPreview: string;
    attribute?: { name: string } | null;
  }[];
  validationErrors: readonly (
    | { __typename: 'CSVContactImportCommonError'; commonErrCode: string }
    | { __typename: 'CSVContactImportColumnError'; columnErrCode: string; columnIndex: number }
  )[];
  partialContactsErrors: readonly { id: string; count: number; description: string }[];
  declinedContactsErrors: readonly { id: string; count: number; description: string }[];
  createdContacts: number;
  updatedContacts: number;
  declinedContacts: number;
  startedAt?: string | null;
  finishedAt?: string | null;
}

/* ── the mapping ────────────────────────────────────────────────────────── */

/**
 * The API's guess, as an editable draft. Its order is the file's column
 * order rather than `columns[]`'s, so a header the user is looking for is
 * where they expect it even if the API answered out of order.
 */
export function draftsFrom(imported: ImportLike): ColumnDraft[] {
  return [...imported.columns]
    .sort((a, b) => a.columnIndex - b.columnIndex)
    .map((column) => ({
      index: column.columnIndex,
      preview: column.columnPreview,
      attributeName: column.attribute?.name ?? null,
    }));
}

/**
 * The identity of a mapping — what has to change for the editable drafts to be
 * rebuilt from the server's answer.
 *
 * The wizard cannot simply watch the import object: `csvContactImportUpdated`
 * delivers a fresh one on every counter tick, and re-deriving on each would
 * discard whatever the user had just picked. So it watches this string.
 *
 * **`columnPreview` is in it, and that is the whole reason it exists.**
 * `csvContactImportUpdateFile` keeps the import id — that is the point of the
 * swap — so re-picking "contacts-feb.csv" over "contacts-jan.csv" changes
 * neither the id, nor the column count, nor the attributes the API guesses
 * from the same header row. Only the previews change. Fingerprint the indexes
 * and the guesses alone and the swap looks like nothing happened: the mapping
 * screen keeps showing sample values out of the file that was just thrown away,
 * which is the one thing a person maps columns against.
 */
export function columnsFingerprint(imported: ImportLike | null): string {
  if (!imported) return '';
  return [
    imported.id,
    ...imported.columns.map(
      (column) => `${column.columnIndex}:${column.attribute?.name ?? ''}:${column.columnPreview}`,
    ),
  ].join('|');
}

export function setColumnAttribute(
  drafts: readonly ColumnDraft[],
  index: number,
  attributeName: string | null,
): ColumnDraft[] {
  return drafts.map((draft) => (draft.index === index ? { ...draft, attributeName: attributeName || null } : draft));
}

/**
 * The `CSVContactImportColumnsUpdate` request: only the mapped columns.
 *
 * An unmapped column is left out entirely rather than sent with an empty name
 * — `attributeName` is a non-null `AttributeName`, so "" would be a value, and
 * the API would take it as an attribute called nothing.
 */
export function columnsRequest(drafts: readonly ColumnDraft[]): {
  columns: { columnIndex: number; attributeName: string }[];
} {
  return {
    columns: drafts
      .filter((draft): draft is ColumnDraft & { attributeName: string } => {
        return typeof draft.attributeName === 'string' && draft.attributeName.trim() !== '';
      })
      .map((draft) => ({ columnIndex: draft.index, attributeName: draft.attributeName.trim() })),
  };
}

export const mappedCount = (drafts: readonly ColumnDraft[]): number => columnsRequest(drafts).columns.length;

/**
 * Columns pointed at the same attribute — the client-side twin of
 * `ColumnDuplicated`. Caught here so the user sees it while they are still
 * looking at the two columns, instead of after a round trip that names one
 * index out of context.
 */
export function duplicateColumnIndexes(drafts: readonly ColumnDraft[]): number[] {
  const byName = new Map<string, number[]>();
  for (const draft of drafts) {
    const name = draft.attributeName?.trim();
    if (!name) continue;
    byName.set(name, [...(byName.get(name) ?? []), draft.index]);
  }
  const duplicates: number[] = [];
  for (const indexes of byName.values()) {
    if (indexes.length > 1) duplicates.push(...indexes);
  }
  return duplicates.sort((a, b) => a - b);
}

/** Heuristic used only to *warn*; the API is the authority on what a phone is. */
export const looksLikePhone = (name: string): boolean => name.toLowerCase().includes('phone');

/**
 * The pre-flight the SDL forces: "For WhatsApp, for example, the required
 * attribute is WhatsAppPhone." Unmap it and the import comes back
 * `WaPhoneRequired` — after the upload, after the mapping, at the one moment
 * the user has stopped thinking about columns. So it is said before Start,
 * next to the mapping that caused it.
 */
export function missingPhoneColumn(
  platform: string,
  drafts: readonly ColumnDraft[],
  phoneNames: readonly string[],
): boolean {
  if (platform.toLowerCase() !== 'whatsapp') return false;
  const known = new Set(phoneNames);
  return !drafts.some((draft) => {
    const name = draft.attributeName;
    return name !== null && (known.has(name) || looksLikePhone(name));
  });
}

export interface MappingIssue {
  /** Null for a file-level problem; a column index otherwise. */
  columnIndex: number | null;
  text: string;
}

/**
 * Everything wrong with the import right now, as sentences.
 *
 * Server validation and the client's own duplicate check are merged into one
 * list on purpose: to the person mapping columns they are the same kind of
 * problem, and showing them in two places would mean reading two places.
 */
export function mappingIssues(
  imported: ImportLike | null,
  drafts: readonly ColumnDraft[],
  platform: string,
  phoneNames: readonly string[],
): MappingIssue[] {
  const issues: MappingIssue[] = [];
  /* Nothing is wrong with a wizard that has no file yet — every check below
     is about a mapping, and there is no mapping to be wrong. */
  if (!imported) return issues;

  for (const error of imported.validationErrors) {
    if (error.__typename === 'CSVContactImportCommonError') {
      issues.push({ columnIndex: null, text: commonErrorSentence(error.commonErrCode) });
    } else {
      issues.push({
        columnIndex: error.columnIndex,
        text: columnErrorSentence(error.columnErrCode),
      });
    }
  }

  for (const index of duplicateColumnIndexes(drafts)) {
    issues.push({
      columnIndex: index,
      text: 'Two columns are mapped to this attribute. The import rejects duplicates — pick a different attribute or skip one of them.',
    });
  }

  if (missingPhoneColumn(platform, drafts, phoneNames)) {
    issues.push({
      columnIndex: null,
      text: 'A WhatsApp import needs a phone column: that is the field the contact is created from. Map one column to the WhatsApp phone attribute before starting.',
    });
  }

  if (mappedCount(drafts) === 0) {
    issues.push({
      columnIndex: null,
      text: 'Nothing is mapped yet. At least one column has to be written somewhere for the import to run.',
    });
  }

  return issues;
}

/** File-level validation codes — every one of the four the SDL declares. */
export function commonErrorSentence(code: string): string {
  switch (code) {
    case 'FileIsEmpty':
      return 'This file has no rows. Export a sample, fill it in and upload it again.';
    case 'FileSizeTooBig':
      return 'This file is too large for one import. Split it into smaller files and import them one after another.';
    case 'FileInvalidFormat':
      return 'This is not a CSV the importer can read. Save it as comma-separated UTF-8 text — a spreadsheet’s native format will not do.';
    case 'WaPhoneRequired':
      return 'A WhatsApp import needs a phone column. Map one of the columns to the WhatsApp phone attribute.';
    default:
      return `The file was rejected (${code}).`;
  }
}

/** Column validation codes — all three, each against its own column. */
export function columnErrorSentence(code: string): string {
  switch (code) {
    case 'ColumnDuplicated':
      return 'Another column is already mapped to this attribute. Two columns cannot write the same field.';
    case 'SystemAttrNotAllowed':
      return 'This is a system attribute the platform maintains itself, so an import may not write it. Map the column to a custom field instead.';
    case 'AttrIsInvalid':
      return 'This attribute name is not one the API accepts. Pick a name from the field list, or type a plain name with no punctuation.';
    default:
      return `This column was rejected (${code}).`;
  }
}

/** The codes the four import mutations can answer with. */
export function importErrorSentence(code: string | null, fallback: string): string {
  switch (code) {
    case 'ContactImportPlatformNotAllowed':
      return 'This bot cannot import contacts on that channel. WhatsApp is the channel that supports creating contacts; on the others a contact appears when the person writes in.';
    case 'ContactScopeNotConnected':
      return 'No WhatsApp phone number is connected to this bot, so imported contacts would have nowhere to live. Connect a number in Chatfuel and start the import again.';
    case 'CSVContactImportFileDoesNotExist':
      return 'The uploaded file is no longer on the server. Upload it again.';
    case 'CSVContactImportDoesNotExist':
      return 'This import no longer exists — it expired or was replaced. Start again from the file.';
    case 'CSVContactImportAlreadyStarted':
      return 'This import is already running. Watch it here rather than starting it twice.';
    case 'CSVContactImportAlreadyFinished':
      return 'This import has already finished. Start a new one to import another file.';
    case 'CSVContactImportAtLeastOneColumnRequired':
      return 'Map at least one column to an attribute before starting.';
    case 'CSVContactImportInvalidColumnIndex':
      return 'The mapping refers to a column this file does not have. Re-upload the file and map it again.';
    case 'NotEnoughPermissions':
      return 'Importing contacts needs the People: Edit permission on this bot.';
    default:
      return fallback;
  }
}

/**
 * `errorsFile` is documented to fail three ways, and two of them are ordinary:
 * asking too early, and there being nothing to report. Neither is worth an
 * error banner — the rejected-rows link simply is not offered.
 */
export function errorsFileSentence(code: string | null): string | null {
  switch (code) {
    case 'CSVContactImportErrorsEmpty':
    case 'CSVContactImportNotFinishedYet':
      return null;
    case 'CSVContactImportErrorsExpired':
      return 'The rejected-rows file has expired — the server keeps it only for a while after an import.';
    default:
      return code === null ? null : 'The rejected-rows file could not be fetched.';
  }
}

/* ── where the wizard is ────────────────────────────────────────────────── */

export const isRunning = (imported: ImportLike | null): boolean =>
  imported !== null && imported.startedAt !== null && imported.startedAt !== undefined && !imported.finishedAt;

export const isFinished = (imported: ImportLike | null): boolean => imported !== null && Boolean(imported.finishedAt);

/**
 * The step to show for an import restored from `latestCSVContactsImport`.
 *
 * A finished import is *not* dropped: it is the only place the counters and
 * the rejected-rows file live, and a user who reloaded mid-import is exactly
 * the one who needs to see how it ended.
 */
export function stepFor(imported: ImportLike | null): ImportStep {
  if (!imported) return 'file';
  if (isFinished(imported)) return 'done';
  if (isRunning(imported)) return 'run';
  return 'map';
}

export const WIZARD_STEPS: readonly { id: ImportStep; label: string }[] = [
  { id: 'file', label: 'File' },
  { id: 'map', label: 'Columns' },
  { id: 'run', label: 'Import' },
  { id: 'done', label: 'Result' },
];

/* ── the outcome ────────────────────────────────────────────────────────── */

export interface ImportOutcome {
  created: number;
  updated: number;
  declined: number;
  /** Rows that landed — created plus updated. */
  imported: number;
  /** A sentence covering only what actually happened. */
  headline: string;
  /** Named only when the API reported some; each already carries a description. */
  partial: readonly { id: string; count: number; description: string }[];
  declinedReasons: readonly { id: string; count: number; description: string }[];
}

const plural = (n: number, one: string, many: string): string => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/**
 * What the import did, with nothing invented.
 *
 * Counts are floored at zero and coerced from whatever arrives, because a
 * missing counter rendering as `NaN contacts` is the classic way a summary
 * lies. The headline names only the outcomes that are non-zero: an import that
 * created nothing does not get a sentence about the nothing it created.
 */
export function importOutcome(imported: ImportLike): ImportOutcome {
  const count = (value: number): number => (Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0);
  const created = count(imported.createdContacts);
  const updated = count(imported.updatedContacts);
  const declined = count(imported.declinedContacts);

  const parts: string[] = [];
  if (created > 0) parts.push(`${plural(created, 'contact', 'contacts')} created`);
  if (updated > 0) parts.push(`${plural(updated, 'contact', 'contacts')} updated`);
  if (declined > 0) parts.push(`${plural(declined, 'row', 'rows')} rejected`);

  const headline =
    parts.length === 0
      ? 'The import finished without changing anything — every row was already up to date, or the file held no usable rows.'
      : `${parts.join(', ')}.`;

  return {
    created,
    updated,
    declined,
    imported: created + updated,
    headline,
    partial: imported.partialContactsErrors,
    declinedReasons: imported.declinedContactsErrors,
  };
}

/**
 * The running counters. No percentage: the API never publishes a row total for
 * an import (unlike an export's `totalPoints`), so a bar would be a number the
 * server never gave.
 */
export function progressLabel(imported: ImportLike): string {
  const outcome = importOutcome(imported);
  return `${outcome.created.toLocaleString()} created · ${outcome.updated.toLocaleString()} updated · ${outcome.declined.toLocaleString()} rejected`;
}

/**
 * The caveat that belongs on every finished import, and only when it is true:
 * a contact created here has no conversation, so the live/chat engine cannot
 * see it.
 */
export function importedContactsCaveat(outcome: ImportOutcome): string | null {
  if (outcome.created === 0) return null;
  return 'Imported contacts have no conversation yet, so filters that ask about chats (unread, owner, stage) will not list them until they write in. The unfiltered list shows them straight away.';
}

/* ── the sample file ────────────────────────────────────────────────────── */

/**
 * A file to import when there is nothing to import yet.
 *
 * The same eight rows ship in the skill package as `assets/contacts-sample.csv`
 * — change one and change the other. Numbers are in the +1 555 01xx range that
 * is reserved for fiction, so a demo import can never reach a real person.
 */
export const SAMPLE_CSV_NAME = 'contacts-sample.csv';

export const SAMPLE_CSV = `phone,name,company,city,plan
+15555550101,Dana Ray,Northwind Trading,Berlin,Pro
+15555550102,Luis Ferreira,Kaya Textil,Lisbon,Starter
+15555550103,Amara Okafor,Beluga Studio,Lagos,Pro
+15555550104,Jonas Weber,Alpine Rentals,Zurich,Trial
+15555550105,Sofia Marchetti,Marchetti & Co,Milan,Starter
+15555550106,Wei Chen,Harbour Foods,Singapore,Pro
+15555550107,Priya Nair,Vellum Books,Bengaluru,Trial
+15555550108,Tomas Novak,Studio Kolo,Prague,Starter
`;

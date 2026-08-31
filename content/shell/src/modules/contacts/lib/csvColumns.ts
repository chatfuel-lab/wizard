/**
 * CSV export, in the parts the React files must not hold: which attributes go
 * into the file, which set of contacts the request covers, and what a `Task`
 * currently means.
 *
 * Five API facts shape everything here:
 *
 * 1. **An empty `attributes` list exports EVERY attribute** (the SDL says so
 *    and the live run confirmed it). So "everything" is not "every box
 *    ticked" — it is the empty array, and the two are different requests. A
 *    picker with nothing ticked therefore cannot be sent at all.
 * 2. **An unknown attribute name errors the whole export.** Not "one empty
 *    column" — the mutation fails. So a saved selection is filtered against
 *    the catalog before it goes out, and the names that were dropped are
 *    reported rather than silently removed: deleting the last contact's value
 *    for a field removes it from the catalog, so a selection can rot.
 * 3. **The cancel id is not the task id.** `csvContactExportCancel(botID, id: String!)`
 *    wants `CSVContactsExport.id` — `task.data.id` — while `getTask(id: TaskID!)`
 *    wants `Task.id`. `readExportTask` surfaces both.
 * 4. **Cancel loses the race on a small export.** The probe went
 *    Created → Cancelled → InProgress → Finished and produced a file anyway.
 *    So "Cancelled" is a request, not an outcome, and the UI says which.
 * 5. **The by-ids export is capped.** `csvContactExportStartByIDsList`
 *    documents `CSVContactExportInvalidContactIDsCount`; the cap is 100 ids.
 *    A bigger selection is split into chunks — one task and one file each —
 *    because the alternative (fall back to the segment) exports a different
 *    set of contacts than the one the user selected.
 */

/** The by-ids export takes at most this many contact ids per task. */
export const MAX_EXPORT_IDS = 100;

export type ColumnMode = 'all' | 'selected';

/** What the request covers. `ids` exports exactly the selection. */
export type ExportScope = 'segment' | 'ids';

export interface CsvColumnOption {
  /** The attribute name that goes on the wire. */
  name: string;
  /** `custom` or `system`, straight off the catalog. */
  kind: string;
  /** Contacts that carry a value, or null when the API declined to count. */
  usersCount: number | null;
}

/** The shape this file needs from `useAttributeCatalog` — nothing generated. */
export interface CatalogEntryLike {
  name: string;
  type: string;
  usersCount: number | null;
}

/**
 * The column picker's list: the whole catalog, most-used first, because that
 * is the order the catalog query already asks for and re-sorting it
 * alphabetically would bury the fields a person actually fills in.
 */
export function csvColumnOptions(entries: readonly CatalogEntryLike[]): CsvColumnOption[] {
  const seen = new Set<string>();
  const options: CsvColumnOption[] = [];
  for (const entry of entries) {
    if (entry.name.trim() === '' || seen.has(entry.name)) continue;
    seen.add(entry.name);
    options.push({ name: entry.name, kind: entry.type, usersCount: entry.usersCount });
  }
  return options;
}

/**
 * The default ticked set: the fields that at least one contact carries.
 *
 * An attribute nobody has a value for is a column of blanks, and the catalog
 * has plenty of them — flows create attributes that no contact ever gets.
 */
export function defaultCsvSelection(options: readonly CsvColumnOption[]): string[] {
  const used = options.filter((option) => (option.usersCount ?? 0) > 0);
  return (used.length > 0 ? used : options).map((option) => option.name);
}

export function toggleCsvColumn(selected: readonly string[], name: string): string[] {
  return selected.includes(name) ? selected.filter((entry) => entry !== name) : [...selected, name];
}

export interface AttributesRequest {
  /** What goes into `attributes`. Empty array = every attribute (fact 1). */
  names: string[];
  /**
   * Names the picker still held but the catalog no longer knows. Sending one
   * fails the whole export (fact 2), so they are dropped — and named, because
   * a column silently missing from a file is worse than a sentence.
   */
  dropped: string[];
}

/**
 * The `attributes` argument, resolved against the live catalog.
 *
 * `all` is the empty array and nothing else — never "tick every box", which
 * would send a hundred names and export a narrower file than the user asked
 * for the moment the catalog grew.
 */
export function exportAttributes(
  mode: ColumnMode,
  selected: readonly string[],
  options: readonly CsvColumnOption[],
): AttributesRequest {
  if (mode === 'all') return { names: [], dropped: [] };
  const known = new Set(options.map((option) => option.name));
  const seen = new Set<string>();
  const names: string[] = [];
  const dropped: string[] = [];
  for (const raw of selected) {
    const name = raw.trim();
    if (name === '' || seen.has(name)) continue;
    seen.add(name);
    if (known.has(name)) names.push(name);
    else dropped.push(name);
  }
  return { names, dropped };
}

/** Whether the request is sendable at all — "selected, none ticked" is not. */
export function canExport(mode: ColumnMode, request: AttributesRequest): boolean {
  return mode === 'all' || request.names.length > 0;
}

export function columnsLabel(mode: ColumnMode, request: AttributesRequest): string {
  if (mode === 'all') return 'Every attribute each contact carries';
  if (request.names.length === 0) return 'No columns picked';
  return `${request.names.length} attribute${request.names.length === 1 ? '' : 's'}`;
}

/* ── which contacts ─────────────────────────────────────────────────────── */

/**
 * Which set the dialog is about to export, given what the user has picked so
 * far and what is selected right now.
 *
 * This is derived on every render rather than seeded into a `useState`, and
 * that is the whole point of the function. The export dialog is mounted with
 * the toolbar and outlives every opening of it — so an initial value read from
 * the selection is read once, while nothing is selected, and stays `segment`
 * for the rest of the session. Somebody who ticks five rows, opens Export and
 * presses the button would then get the entire address book, which is the one
 * mistake in this dialog nobody can undo: the file is already built.
 *
 * So: a selection defaults to the selection, no selection is the segment (the
 * by-ids mutation has nothing to send), and an explicit choice always wins.
 */
export function effectiveExportScope(chosen: ExportScope | null, selectedCount: number): ExportScope {
  if (selectedCount === 0) return 'segment';
  return chosen ?? 'ids';
}

/**
 * The selection, split into requests the API will accept (fact 5).
 * Duplicates are removed first: two rows of the same contact would be two
 * lines in the file and could push the chunk over the cap for nothing.
 */
export function chunkIds(ids: readonly string[], size = MAX_EXPORT_IDS): string[][] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (id === '' || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += Math.max(1, size)) {
    chunks.push(unique.slice(i, i + Math.max(1, size)));
  }
  return chunks;
}

/**
 * What the user is about to get, said in full before they press the button.
 *
 * The two scopes are not two ways of saying the same thing: `ids` covers the
 * selection exactly, `segment` covers everything the *server-side* half of the
 * filter matches — which is a different set whenever the list is narrowing
 * rows itself, and a much larger one when there is no segment at all.
 */
export function scopeDescription(scope: ExportScope, selectedCount: number, hasSegment: boolean): string {
  if (scope === 'ids') {
    if (selectedCount === 0) return 'Nothing is selected.';
    const chunks = Math.ceil(selectedCount / MAX_EXPORT_IDS);
    const base = `Exactly the ${selectedCount.toLocaleString()} selected contact${selectedCount === 1 ? '' : 's'}.`;
    return chunks > 1
      ? `${base} The API takes ${MAX_EXPORT_IDS} ids per export, so this runs as ${chunks} exports and you get ${chunks} files.`
      : base;
  }
  return hasSegment
    ? 'Every contact this filter matches on the server — not only the rows loaded so far. Filters the list applies to loaded rows (search under a conversation filter, stage, owner, unread) are not part of a segment and cannot narrow an export.'
    : 'Every contact on this bot. The current view has no server-side filter to narrow it with.';
}

/* ── the task ───────────────────────────────────────────────────────────── */

export type ExportPhase = 'queued' | 'running' | 'paused' | 'done' | 'failed' | 'cancelled';

/** Loosely typed so this file stays free of generated types. */
export interface ExportTaskLike {
  id: string;
  completedPoints?: number | null;
  totalPoints?: number | null;
  statuses?: readonly { startedAt?: string | null; type?: string | null }[] | null;
  /** After this instant the task is failed, whatever the status log says. */
  deadline?: string | null;
  data?: {
    __typename?: string;
    id?: string | null;
    file?: { url?: string | null; status?: string | null } | null;
  } | null;
}

export interface ExportProgress {
  taskId: string;
  /** `task.data.id` — what cancel wants. Null when the task is not a CSV export. */
  cancelId: string | null;
  phase: ExportPhase;
  completed: number;
  total: number;
  /** 0..100, or null while the server has published no total (indeterminate). */
  percent: number | null;
  fileUrl: string | null;
}

const PHASE_BY_STATUS: Record<string, ExportPhase> = {
  Created: 'queued',
  InProgress: 'running',
  Paused: 'paused',
  Finished: 'done',
  Failed: 'failed',
  Cancelled: 'cancelled',
};

/**
 * `statuses` is a log, not a state: the phase is its latest entry.
 *
 * Ordering is by `startedAt` with array order as the tiebreak — the live probe
 * came back Created, Cancelled, InProgress, Finished with timestamps a
 * millisecond apart, and reading "the first status" or "the last one that
 * looks terminal" would have reported a cancelled export that had in fact
 * produced a file.
 *
 * `now` is a parameter rather than a call to the clock, because the deadline
 * rule below depends on it and a rule that reads the clock cannot be asserted.
 */
export function readExportTask(task: ExportTaskLike, now = Date.now()): ExportProgress {
  let phase: ExportPhase = 'queued';
  let latest = Number.NEGATIVE_INFINITY;
  for (const status of task.statuses ?? []) {
    const mapped = status.type ? PHASE_BY_STATUS[status.type] : undefined;
    if (!mapped) continue;
    const at = status.startedAt ? Date.parse(status.startedAt) : Number.NaN;
    const rank = Number.isFinite(at) ? at : latest;
    if (rank >= latest) {
      latest = rank;
      phase = mapped;
    }
  }

  /* Floored and finiteness-checked: a missing or malformed counter rendering
     as `NaN of NaN` is the classic way a progress bar lies. */
  const points = (value: number | null | undefined): number =>
    typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
  const completed = points(task.completedPoints);
  const total = points(task.totalPoints);
  const data = task.data;
  const isCsv = data?.__typename === 'CSVContactsExport';
  const fileUrl = isCsv ? (data?.file?.url ?? null) : null;

  /* A file means the work landed even if the status log has not caught up —
     and, after a lost cancel, even though the log says Cancelled. */
  let resolved: ExportPhase = phase !== 'done' && fileUrl ? 'done' : phase;

  /* Past its `deadline` a task is failed even with no `Failed` status: the
     platform's own rule for every async task, and the only thing that stops a
     server that stopped answering from leaving a bar spinning for ever. */
  const deadline = task.deadline ? Date.parse(task.deadline) : Number.NaN;
  if (!isTerminal(resolved) && Number.isFinite(deadline) && now > deadline) resolved = 'failed';

  return {
    taskId: task.id,
    cancelId: isCsv ? (data?.id ?? null) : null,
    phase: resolved,
    completed,
    total,
    /* Clamped: `completedPoints` may exceed `totalPoints` — the platform says
       so, and 140% is not a thing a progress bar can mean. */
    percent: total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : null,
    fileUrl,
  };
}

export const isTerminal = (phase: ExportPhase): boolean =>
  phase === 'done' || phase === 'failed' || phase === 'cancelled';

/** True while it is worth polling and worth offering a cancel. */
export const isActive = (progress: ExportProgress | null): boolean => progress !== null && !isTerminal(progress.phase);

export function exportStatusLabel(progress: ExportProgress): string {
  switch (progress.phase) {
    case 'queued':
      return 'Queued';
    case 'running':
      return progress.percent === null
        ? 'Exporting…'
        : `Exporting… ${progress.completed.toLocaleString()} of ${progress.total.toLocaleString()}`;
    case 'paused':
      return 'Paused by the server';
    case 'done':
      return progress.fileUrl ? 'Ready to download' : 'Finished — no file came back';
    case 'failed':
      return 'The export failed';
    case 'cancelled':
      return 'Cancelled';
  }
}

/**
 * What to say about a cancel that has been asked for.
 *
 * Cancel is a request the server may lose: in practice, a small export went
 * Cancelled and then finished anyway with a downloadable file. Telling the
 * user "cancelled" and then handing them the file is the one outcome this must
 * not produce, so the sentence is emitted only for a cancel that was actually
 * asked for, and it changes once the answer is known.
 */
export function cancelNote(progress: ExportProgress | null, requested: boolean): string | null {
  if (!requested || !progress) return null;
  if (progress.phase === 'cancelled') return 'Cancelled before the file was built.';
  if (progress.phase === 'done') {
    return 'The export finished before the cancel reached it — the file below is complete.';
  }
  if (progress.phase === 'failed') return 'The export ended without a file.';
  return 'Cancelling… a small export often finishes anyway, and then you get the file.';
}

/**
 * The known export failures, as sentences with a next step.
 * Codes are the ones the SDL documents on the two start mutations and cancel.
 */
export function exportErrorSentence(code: string | null, fallback: string): string {
  switch (code) {
    case 'CSVContactExportAlreadyInProgress':
      return 'This bot already has an export running. Wait for it to finish, or cancel it, and start again.';
    case 'SegmentIsInvalid':
      return 'The server rejected the filter behind this export. Simplify the filter — an attribute that no longer exists is the usual cause — and try again.';
    case 'CSVContactExportInvalidContactIDsCount':
      return `The API takes at most ${MAX_EXPORT_IDS} contact ids per export. Reduce the selection, or export by filter instead.`;
    case 'CSVContactExportDoesNotExist':
      return 'That export is already gone — it finished or was cancelled elsewhere.';
    case 'NotEnoughPermissions':
      return 'Exporting contacts needs the People: View permission on this bot.';
    default:
      return fallback;
  }
}

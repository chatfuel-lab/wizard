import { DEAL_FIELDS } from './dealFields';
import type { DealFieldBindings } from './dealFieldBinding';

/**
 * CSV export, in the two pure halves the React file must not hold: which
 * attributes go in the file, and what a `Task` currently means.
 *
 * Two API facts shape everything here:
 *
 * 1. **An empty `attributes` list exports ALL attributes.** So "all" is not
 *    "every checkbox ticked" — it is the empty array, and the two are different
 *    requests. Ticking every deal field exports seven columns; "all" exports
 *    every attribute the contact has, including ones this module never wrote.
 * 2. **The cancel id is not the task id.** `csvContactExportCancel(botID, id: String!)`
 *    wants `CSVContactsExport.id` — `task.data.id` — while `getTask(id: TaskID!)`
 *    wants `Task.id`. `readExportTask` surfaces both, because the only safe
 *    cancel is "try the data id, fall back to the task id".
 */

export type ColumnMode = 'all' | 'selected';

export interface CsvColumnOption {
  /** The attribute name that goes on the wire. */
  name: string;
  label: string;
  /** False when this bot has no such attribute — nothing to export. */
  bound: boolean;
}

/**
 * The deal fields, as export columns. An unbound field is still listed and
 * still selectable: the catalog is best-effort, and a column that comes back
 * empty is a better outcome than a silently missing one.
 */
export function csvColumnOptions(bindings: DealFieldBindings): CsvColumnOption[] {
  return DEAL_FIELDS.map((spec) => {
    const binding = bindings[spec.key];
    return { name: binding.name, label: spec.label, bound: binding.bound };
  });
}

export const defaultCsvSelection = (bindings: DealFieldBindings): string[] =>
  csvColumnOptions(bindings).map((option) => option.name);

export function toggleCsvColumn(selected: readonly string[], name: string): string[] {
  return selected.includes(name) ? selected.filter((entry) => entry !== name) : [...selected, name];
}

/**
 * The `attributes` argument. **The empty array means every attribute**, so
 * "selected" with nothing ticked cannot be sent as-is — it would silently
 * become the widest possible export. The caller blocks that; this returns the
 * empty array only for `all`.
 */
export function exportAttributes(
  mode: ColumnMode,
  selected: readonly string[],
  options: readonly CsvColumnOption[],
): string[] {
  if (mode === 'all') return [];
  const known = new Set(options.map((option) => option.name));
  const seen = new Set<string>();
  const names: string[] = [];
  for (const name of selected) {
    const trimmed = name.trim();
    if (trimmed === '' || seen.has(trimmed) || !known.has(trimmed)) continue;
    seen.add(trimmed);
    names.push(trimmed);
  }
  return names;
}

/** Whether the request is even sendable — "selected, none ticked" is not. */
export function canExport(mode: ColumnMode, attributes: readonly string[]): boolean {
  return mode === 'all' || attributes.length > 0;
}

export function columnsLabel(mode: ColumnMode, attributes: readonly string[]): string {
  if (mode === 'all') return 'Every attribute on the contact';
  if (attributes.length === 0) return 'No columns selected';
  return `${attributes.length} deal field${attributes.length === 1 ? '' : 's'}`;
}

/* ── the task ───────────────────────────────────────────────────────────── */

export type ExportPhase = 'queued' | 'running' | 'paused' | 'done' | 'failed' | 'cancelled';

/** Loosely typed so this file stays free of generated types — see `dealFieldValue.ts`. */
export interface ExportTaskLike {
  id: string;
  completedPoints?: number | null;
  totalPoints?: number | null;
  statuses?: readonly { startedAt?: string | null; type?: string | null }[] | null;
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
  /** 0..100, or null when the server has not published a total yet (indeterminate). */
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
 * `statuses` is a log, not a state: the current phase is its latest entry.
 * Ordering is by `startedAt` with array order as the tiebreak, because two
 * transitions can share a timestamp.
 */
export function readExportTask(task: ExportTaskLike): ExportProgress {
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

  const completed = Math.max(0, task.completedPoints ?? 0);
  const total = Math.max(0, task.totalPoints ?? 0);
  const data = task.data;
  const isCsv = data?.__typename === 'CSVContactsExport';
  const fileUrl = isCsv ? (data?.file?.url ?? null) : null;

  return {
    taskId: task.id,
    cancelId: isCsv ? (data?.id ?? null) : null,
    // A file means the work landed even if the status log has not caught up.
    phase: phase !== 'done' && fileUrl ? 'done' : phase,
    completed,
    total,
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
      return progress.fileUrl ? 'Ready to download' : 'Finished — the file is not available';
    case 'failed':
      return 'The export failed';
    case 'cancelled':
      return 'Cancelled';
  }
}

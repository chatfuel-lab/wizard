/**
 * The FAQ list as one pure reducer: order, selection, the open editor, dirty,
 * and the conflict a replace-all API makes unavoidable.
 *
 * Everything on this page edits a LOCAL list and one save bar writes it, and
 * that is not a style choice — `fuelyConfigSetFAQs` REPLACES THE WHOLE ARRAY.
 * There is no per-entry mutation to fire on blur, so a page that saved per row
 * would send the entire list on every keystroke-ish edit and lose a race with
 * itself. The draft is the unit of work; the reducer is what makes it testable.
 *
 * Four things worth knowing:
 *
 * 1. **`baseline` is not `rows` before the edit — it is what the SERVER held
 *    when the draft started.** `saveFaqs(next, baseline)` re-reads the live list
 *    and refuses the write if it moved, so the baseline is the only thing
 *    standing between two editors and a silently overwritten list.
 * 2. **Adopting the server list re-keys by POSITION when the content matches.**
 *    Keys are minted locally (`knowledgeStore.ts`) and a saved row that was
 *    edited comes back with a new one, so a plain key prune would drop the
 *    selection of every row that was just saved. Same content in the same order
 *    can only be our own list coming back, so index i is row i.
 * 3. **A refused save keeps the typing.** `conflict` holds THEIR list; the page
 *    offers "use theirs" (take it) or "keep mine" (re-baseline onto theirs, so
 *    the next save is allowed to win). Nothing is thrown away without a click.
 * 4. **The reducer never reads the clock or the network.** It does mint keys —
 *    the same module-local counter `knowledgeStore.ts` uses — because a row that
 *    exists only in a draft still needs an identity to be selected and dragged.
 */
import { toggleSelection } from '~ui';
import type { FaqEntry, FaqRow } from '../types';
import type { FaqSort } from './faqList';
import { faqsDiffer, mintFaqKey, reconcileFaqKeys, toFaqInput } from './knowledgeStore';

export type FaqField = 'question' | 'answer';

/** Where the caret goes when an editor mounts — a new row, or one opened from a link. */
export interface FaqFocus {
  key: string;
  field: FaqField;
}

export interface FaqDraftState {
  /** The draft, in the order that will be written. */
  rows: FaqRow[];
  /** The server list this draft was built from. */
  baseline: FaqRow[];
  /** Selected keys, in list order. */
  selection: string[];
  /** Where the last plain checkbox click landed — a shift-click extends from here. */
  anchor: string | null;
  /** The one row open in the inline editor. */
  editing: string | null;
  focus: FaqFocus | null;
  sort: FaqSort;
  /** Their list, when the server moved under a dirty draft or refused a save. */
  conflict: FaqRow[] | null;
  saving: boolean;
  /** The last save failure. Cleared by the next edit or the next save. */
  error: string | null;
}

export const initialFaqDraftState: FaqDraftState = {
  rows: [],
  baseline: [],
  selection: [],
  anchor: null,
  editing: null,
  focus: null,
  sort: 'position',
  conflict: null,
  saving: false,
  error: null,
};

export type FaqDraftAction =
  | { type: 'serverChanged'; rows: readonly FaqRow[] }
  | { type: 'added'; question: string; field: FaqField }
  | { type: 'patched'; key: string; field: FaqField; value: string }
  | { type: 'removed'; keys: readonly string[] }
  | { type: 'moved'; keys: readonly string[]; target: string | null }
  | { type: 'nudged'; key: string; to: NudgeTo }
  | { type: 'restored'; rows: readonly FaqRow[] }
  | { type: 'selectionToggled'; key: string; ids: readonly string[]; shift: boolean }
  | { type: 'selectionSet'; keys: readonly string[] }
  | { type: 'selectionCleared' }
  | { type: 'editingSet'; key: string | null; field?: FaqField }
  | { type: 'focusConsumed' }
  | { type: 'sortSet'; sort: FaqSort }
  | { type: 'saveStarted' }
  | { type: 'saveCommitted' }
  | { type: 'saveFailed'; message: string }
  | { type: 'conflicted'; theirs: readonly FaqEntry[] }
  | { type: 'useTheirs' }
  | { type: 'keepMine' }
  | { type: 'discarded' };

// ---------------------------------------------------------------------------
// Pure list surgery — exported so the view can compute an announcement from the
// same arithmetic the reducer applies, instead of a second copy of it.
// ---------------------------------------------------------------------------

export const indexOfRow = (rows: readonly FaqRow[], key: string): number => rows.findIndex((row) => row.key === key);

/**
 * Move `keys` so they sit at `target`. `null` means the end of the list.
 *
 * The direction rule is the one every sortable list needs and few write down:
 * dropping on a row BELOW the block puts the block after it, dropping on a row
 * above puts it before. Without it, dragging one row down by one does nothing —
 * the row is removed, then re-inserted at the index it just left.
 *
 * Returns the input array unchanged when the move is a no-op, so a drop on
 * yourself costs no re-render and pushes no undo.
 */
export function moveRows(rows: FaqRow[], keys: readonly string[], target: string | null): FaqRow[] {
  const moving = new Set(keys);
  const picked = rows.filter((row) => moving.has(row.key));
  if (picked.length === 0) return rows;
  const rest = rows.filter((row) => !moving.has(row.key));

  if (target === null) {
    const next = [...rest, ...picked];
    return sameOrder(rows, next) ? rows : next;
  }
  /* Dropping the block on one of its own members is a cancel, not a move. */
  if (moving.has(target)) return rows;

  const restIndex = indexOfRow(rest, target);
  if (restIndex === -1) return rows;
  const firstMoved = rows.findIndex((row) => moving.has(row.key));
  const insertAt = indexOfRow(rows, target) > firstMoved ? restIndex + 1 : restIndex;

  const next = [...rest.slice(0, insertAt), ...picked, ...rest.slice(insertAt)];
  return sameOrder(rows, next) ? rows : next;
}

/**
 * What a drag started on `key` actually moves.
 *
 * Deals' rule, for deals' reason: grabbing a row that is part of the selection
 * takes the whole selection with it; grabbing one outside the selection moves
 * that row alone and leaves the selection untouched. Anything else silently
 * drops rows the person had picked.
 */
export const dragKeys = (selection: readonly string[], key: string): string[] =>
  selection.includes(key) ? [...selection] : [key];

export type NudgeTo = 'up' | 'down' | 'top' | 'bottom';

/** Where a keyboard move would land the row. -1 when the key is not in the list. */
export function nudgeTarget(rows: readonly FaqRow[], key: string, to: NudgeTo): number {
  const from = indexOfRow(rows, key);
  if (from === -1) return -1;
  switch (to) {
    case 'up':
      return Math.max(0, from - 1);
    case 'down':
      return Math.min(rows.length - 1, from + 1);
    case 'top':
      return 0;
    case 'bottom':
      return rows.length - 1;
  }
}

/** One row to an index. Identity when it is already there. */
export function moveToIndex(rows: FaqRow[], key: string, index: number): FaqRow[] {
  const from = indexOfRow(rows, key);
  if (from === -1 || index < 0 || index >= rows.length || index === from) return rows;
  const next = [...rows];
  const [row] = next.splice(from, 1);
  next.splice(index, 0, row!);
  return next;
}

const sameOrder = (a: readonly FaqRow[], b: readonly FaqRow[]): boolean =>
  a.length === b.length && a.every((row, index) => row.key === b[index]!.key);

/**
 * Translate keys across an adopted list.
 *
 * Same content in the same order can only be our own list coming back from a
 * save, and the rows we edited were re-keyed by content — so map by position.
 * Anything else is somebody else's list, and only keys that still exist survive.
 */
function translateKeys(previous: readonly FaqRow[], next: readonly FaqRow[], keys: readonly string[]): string[] {
  const alive = new Set(next.map((row) => row.key));
  if (!faqsDiffer(previous, next)) {
    const byPosition = new Map(previous.map((row, index) => [row.key, next[index]!.key]));
    return keys.map((key) => byPosition.get(key) ?? key).filter((key) => alive.has(key));
  }
  return keys.filter((key) => alive.has(key));
}

const translateOne = (previous: readonly FaqRow[], next: readonly FaqRow[], key: string | null): string | null =>
  key === null ? null : (translateKeys(previous, next, [key])[0] ?? null);

/** Adopt a list wholesale, carrying selection, anchor and the open editor over. */
function adopt(state: FaqDraftState, next: readonly FaqRow[]): FaqDraftState {
  const rows = [...next];
  return {
    ...state,
    rows,
    baseline: [...next],
    selection: translateKeys(state.rows, rows, state.selection),
    anchor: translateOne(state.rows, rows, state.anchor),
    editing: translateOne(state.rows, rows, state.editing),
    focus: null,
    conflict: null,
    error: null,
  };
}

export function faqDraftReducer(state: FaqDraftState, action: FaqDraftAction): FaqDraftState {
  switch (action.type) {
    /**
     * The store's list moved: a first load, a refetch, a save landing, or
     * somebody else's write arriving through Refresh. `drafts.ts` names the
     * three outcomes — adopt, keep, conflict — and this is the only place the
     * FAQ page decides between them.
     */
    case 'serverChanged': {
      if (isDirty(state)) {
        if (!faqsDiffer(action.rows, state.baseline)) return state;
        return { ...state, conflict: reconcileFaqKeys(state.rows, action.rows) };
      }
      if (!faqsDiffer(action.rows, state.rows) && sameOrder(action.rows, state.rows)) return state;
      return adopt(state, action.rows);
    }

    case 'added': {
      const row: FaqRow = { key: mintFaqKey(), question: action.question, answer: '' };
      /* Appended, never prepended: this order IS the order the assistant reads,
         and quietly promoting the newest entry over the eight before it is a
         behaviour change nobody asked for. */
      return {
        ...state,
        rows: [...state.rows, row],
        editing: row.key,
        focus: { key: row.key, field: action.field },
        error: null,
      };
    }

    case 'patched': {
      const rows = state.rows.map((row) => (row.key === action.key ? { ...row, [action.field]: action.value } : row));
      return { ...state, rows, error: null };
    }

    case 'removed': {
      const gone = new Set(action.keys);
      if (!state.rows.some((row) => gone.has(row.key))) return state;
      return {
        ...state,
        rows: state.rows.filter((row) => !gone.has(row.key)),
        selection: state.selection.filter((key) => !gone.has(key)),
        anchor: state.anchor !== null && gone.has(state.anchor) ? null : state.anchor,
        editing: state.editing !== null && gone.has(state.editing) ? null : state.editing,
        error: null,
      };
    }

    case 'moved': {
      const rows = moveRows(state.rows, action.keys, action.target);
      return rows === state.rows ? state : { ...state, rows, error: null };
    }

    case 'nudged': {
      const rows = moveToIndex(state.rows, action.key, nudgeTarget(state.rows, action.key, action.to));
      return rows === state.rows ? state : { ...state, rows, error: null };
    }

    /* Undo. The whole previous list back, keys included, which is why undo can
       restore a deleted row into its own place rather than at the end. */
    case 'restored': {
      const rows = [...action.rows];
      const alive = new Set(rows.map((row) => row.key));
      return {
        ...state,
        rows,
        selection: state.selection.filter((key) => alive.has(key)),
        anchor: state.anchor !== null && alive.has(state.anchor) ? state.anchor : null,
        editing: state.editing !== null && alive.has(state.editing) ? state.editing : null,
        error: null,
      };
    }

    case 'selectionToggled': {
      const { selected, anchor } = toggleSelection({
        ids: action.ids,
        selected: state.selection,
        id: action.key,
        anchor: state.anchor,
        shift: action.shift,
      });
      return { ...state, selection: selected, anchor };
    }

    case 'selectionSet': {
      const alive = new Set(state.rows.map((row) => row.key));
      const selection = state.rows
        .filter((row) => action.keys.includes(row.key) && alive.has(row.key))
        .map((row) => row.key);
      return { ...state, selection };
    }

    case 'selectionCleared':
      return state.selection.length === 0 && state.anchor === null ? state : { ...state, selection: [], anchor: null };

    case 'editingSet':
      return {
        ...state,
        editing: action.key,
        focus: action.key !== null && action.field !== undefined ? { key: action.key, field: action.field } : null,
      };

    case 'focusConsumed':
      return state.focus === null ? state : { ...state, focus: null };

    case 'sortSet':
      return state.sort === action.sort ? state : { ...state, sort: action.sort };

    case 'saveStarted':
      return { ...state, saving: true, error: null };

    /* The write landed. `baseline` becomes what was just written — the server's
       own echo arrives separately as `serverChanged` and is adopted then. */
    case 'saveCommitted':
      return { ...state, baseline: [...state.rows], saving: false, error: null, conflict: null };

    case 'saveFailed':
      return { ...state, saving: false, error: action.message };

    case 'conflicted':
      return { ...state, saving: false, conflict: reconcileFaqKeys(state.rows, action.theirs) };

    case 'useTheirs':
      return state.conflict === null ? state : adopt(state, state.conflict);

    /* Re-baseline onto theirs and keep every word of the draft: the next save
       passes the freshness check and the API is last-write-wins, so mine lands. */
    case 'keepMine':
      return state.conflict === null ? state : { ...state, baseline: state.conflict, conflict: null };

    case 'discarded': {
      const rows = [...state.baseline];
      const alive = new Set(rows.map((row) => row.key));
      return {
        ...state,
        rows,
        selection: state.selection.filter((key) => alive.has(key)),
        anchor: state.anchor !== null && alive.has(state.anchor) ? state.anchor : null,
        editing: state.editing !== null && alive.has(state.editing) ? state.editing : null,
        focus: null,
        conflict: null,
        error: null,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** By content AND order — a reorder is an unsaved change like any other. */
export const isDirty = (state: FaqDraftState): boolean => faqsDiffer(state.rows, state.baseline);

export const hasConflict = (state: FaqDraftState): boolean => state.conflict !== null;

/** Selected rows in list order — what a bulk action actually runs on. */
export function selectedRows(state: FaqDraftState): FaqRow[] {
  if (state.selection.length === 0) return [];
  const wanted = new Set(state.selection);
  return state.rows.filter((row) => wanted.has(row.key));
}

export const rowByKey = (state: FaqDraftState, key: string): FaqRow | undefined =>
  state.rows.find((row) => row.key === key);

/** What goes on the wire, and what the freshness check is made against. */
export const draftEntries = (state: FaqDraftState): FaqEntry[] => toFaqInput(state.rows);
export const baselineEntries = (state: FaqDraftState): FaqEntry[] => toFaqInput(state.baseline);

/**
 * Can this draft be written at all?
 *
 * An entry with no question is not a row the assistant can ever match, and the
 * API takes it happily — so it is blocked here rather than saved and then
 * flagged by the lint. An empty ANSWER is only a warning: someone writing ten
 * questions first and answering them after is a real way to work.
 */
export const blankQuestions = (state: FaqDraftState): FaqRow[] =>
  state.rows.filter((row) => row.question.trim() === '');

export const canSave = (state: FaqDraftState): boolean =>
  isDirty(state) && !state.saving && blankQuestions(state).length === 0;

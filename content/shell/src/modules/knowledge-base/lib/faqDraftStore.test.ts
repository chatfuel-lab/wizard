import { describe, expect, it } from 'vitest';
import {
  baselineEntries,
  blankQuestions,
  canSave,
  dragKeys,
  draftEntries,
  faqDraftReducer,
  hasConflict,
  indexOfRow,
  initialFaqDraftState,
  isDirty,
  moveRows,
  moveToIndex,
  nudgeTarget,
  rowByKey,
  selectedRows,
  type FaqDraftAction,
  type FaqDraftState,
} from './faqDraftStore';
import type { FaqEntry, FaqRow } from '../types';

const row = (key: string, question: string, answer = `answer ${key}`): FaqRow => ({ key, question, answer });

const SERVER: FaqRow[] = [row('k1', 'one'), row('k2', 'two'), row('k3', 'three'), row('k4', 'four')];

const run = (state: FaqDraftState, ...actions: FaqDraftAction[]): FaqDraftState =>
  actions.reduce(faqDraftReducer, state);

/** A draft sitting on the four server rows. */
const loaded = (rows: readonly FaqRow[] = SERVER): FaqDraftState =>
  faqDraftReducer(initialFaqDraftState, { type: 'serverChanged', rows });

const keys = (state: FaqDraftState): string[] => state.rows.map((r) => r.key);

describe('moveRows', () => {
  it('drops below the block after the target, above it before', () => {
    expect(moveRows(SERVER, ['k1'], 'k3').map((r) => r.key)).toEqual(['k2', 'k3', 'k1', 'k4']);
    expect(moveRows(SERVER, ['k4'], 'k2').map((r) => r.key)).toEqual(['k1', 'k4', 'k2', 'k3']);
  });

  it('moves one row down by one — the case a naive splice turns into a no-op', () => {
    expect(moveRows(SERVER, ['k1'], 'k2').map((r) => r.key)).toEqual(['k2', 'k1', 'k3', 'k4']);
  });

  it('keeps a multi-row block together and in its own order', () => {
    expect(moveRows(SERVER, ['k1', 'k3'], 'k4').map((r) => r.key)).toEqual(['k2', 'k4', 'k1', 'k3']);
    expect(moveRows(SERVER, ['k3', 'k4'], 'k1').map((r) => r.key)).toEqual(['k3', 'k4', 'k1', 'k2']);
  });

  it('sends the block to the end for a null target', () => {
    expect(moveRows(SERVER, ['k1', 'k2'], null).map((r) => r.key)).toEqual(['k3', 'k4', 'k1', 'k2']);
  });

  it('returns the SAME array for a no-op, so nothing re-renders and no undo is offered', () => {
    expect(moveRows(SERVER, ['k2'], 'k2')).toBe(SERVER);
    expect(moveRows(SERVER, ['k2'], 'nope')).toBe(SERVER);
    expect(moveRows(SERVER, [], 'k1')).toBe(SERVER);
    expect(moveRows(SERVER, ['k4'], null)).toBe(SERVER);
    expect(moveRows(SERVER, ['k1'], 'k1')).toBe(SERVER);
  });
});

describe('dragKeys', () => {
  it('takes the whole selection only when the grabbed row is in it', () => {
    expect(dragKeys(['k1', 'k3'], 'k3')).toEqual(['k1', 'k3']);
    expect(dragKeys(['k1', 'k3'], 'k2')).toEqual(['k2']);
    expect(dragKeys([], 'k2')).toEqual(['k2']);
  });
});

describe('keyboard moves', () => {
  it('steps one, clamps at the ends and reaches them directly', () => {
    expect(nudgeTarget(SERVER, 'k2', 'up')).toBe(0);
    expect(nudgeTarget(SERVER, 'k2', 'down')).toBe(2);
    expect(nudgeTarget(SERVER, 'k1', 'up')).toBe(0);
    expect(nudgeTarget(SERVER, 'k4', 'down')).toBe(3);
    expect(nudgeTarget(SERVER, 'k3', 'top')).toBe(0);
    expect(nudgeTarget(SERVER, 'k3', 'bottom')).toBe(3);
    expect(nudgeTarget(SERVER, 'gone', 'up')).toBe(-1);
  });

  it('moves through the reducer and leaves the list alone at the edges', () => {
    expect(keys(faqDraftReducer(loaded(), { type: 'nudged', key: 'k3', to: 'top' }))).toEqual(['k3', 'k1', 'k2', 'k4']);
    const first = loaded();
    expect(faqDraftReducer(first, { type: 'nudged', key: 'k1', to: 'up' })).toBe(first);
    expect(moveToIndex(SERVER, 'k1', 9)).toBe(SERVER);
    expect(indexOfRow(SERVER, 'k3')).toBe(2);
  });
});

describe('adopting the server list', () => {
  it('loads it wholesale when the draft is clean', () => {
    const state = loaded();
    expect(keys(state)).toEqual(['k1', 'k2', 'k3', 'k4']);
    expect(isDirty(state)).toBe(false);
    expect(baselineEntries(state)).toEqual(draftEntries(state));
  });

  it('strips the local keys on the way to the wire', () => {
    expect(draftEntries(loaded([row('k1', 'one', 'a')]))).toEqual([{ question: 'one', answer: 'a' }]);
  });

  it('does nothing at all when the list has not moved', () => {
    const state = loaded();
    expect(faqDraftReducer(state, { type: 'serverChanged', rows: SERVER })).toBe(state);
  });

  it('carries selection over re-keyed rows when the content is ours coming back', () => {
    /* A save re-keys exactly the rows whose text changed. Same content, same
       order, new keys — the selection must survive it. */
    const edited = run(
      loaded(),
      { type: 'patched', key: 'k2', field: 'answer', value: 'edited' },
      { type: 'selectionSet', keys: ['k2', 'k3'] },
      { type: 'saveCommitted' },
    );
    const echo: FaqRow[] = [
      row('k1', 'one'),
      { key: 'k9', question: 'two', answer: 'edited' },
      row('k3', 'three'),
      row('k4', 'four'),
    ];
    const after = faqDraftReducer(edited, { type: 'serverChanged', rows: echo });
    expect(after.selection).toEqual(['k9', 'k3']);
    expect(isDirty(after)).toBe(false);
  });

  it('drops selection that somebody else deleted', () => {
    const state = run(loaded(), { type: 'selectionSet', keys: ['k2', 'k3'] });
    const after = faqDraftReducer(state, { type: 'serverChanged', rows: [row('k1', 'one'), row('k3', 'three')] });
    expect(after.selection).toEqual(['k3']);
    expect(keys(after)).toEqual(['k1', 'k3']);
  });
});

describe('the conflict', () => {
  const theirs: FaqEntry[] = [
    { question: 'one', answer: 'answer k1' },
    { question: 'theirs', answer: 'from somebody else' },
  ];

  it('fires when the server moves under a dirty draft, and not when it matches the baseline', () => {
    const dirty = faqDraftReducer(loaded(), { type: 'patched', key: 'k1', field: 'answer', value: 'mine' });
    expect(isDirty(dirty)).toBe(true);
    expect(faqDraftReducer(dirty, { type: 'serverChanged', rows: SERVER })).toBe(dirty);
    const clashed = faqDraftReducer(dirty, { type: 'serverChanged', rows: [row('k1', 'one'), row('k9', 'theirs')] });
    expect(hasConflict(clashed)).toBe(true);
    /* And nothing was thrown away. */
    expect(rowByKey(clashed, 'k1')?.answer).toBe('mine');
  });

  it('a refused save keeps every word of the draft', () => {
    const dirty = run(
      loaded(),
      { type: 'patched', key: 'k1', field: 'answer', value: 'mine' },
      { type: 'saveStarted' },
      { type: 'conflicted', theirs },
    );
    expect(dirty.saving).toBe(false);
    expect(hasConflict(dirty)).toBe(true);
    expect(rowByKey(dirty, 'k1')?.answer).toBe('mine');
  });

  it('"use theirs" takes their list, "keep mine" re-baselines onto it so the next save wins', () => {
    const clashed = run(
      loaded(),
      { type: 'patched', key: 'k1', field: 'answer', value: 'mine' },
      { type: 'conflicted', theirs },
    );

    const took = faqDraftReducer(clashed, { type: 'useTheirs' });
    expect(took.rows.map((r) => r.question)).toEqual(['one', 'theirs']);
    expect(isDirty(took)).toBe(false);
    expect(hasConflict(took)).toBe(false);

    const kept = faqDraftReducer(clashed, { type: 'keepMine' });
    expect(hasConflict(kept)).toBe(false);
    expect(rowByKey(kept, 'k1')?.answer).toBe('mine');
    /* The next save is checked against THEIR list, which is what makes it pass. */
    expect(baselineEntries(kept)).toEqual(theirs);
    expect(isDirty(kept)).toBe(true);
  });

  it('re-keys their list against the draft, so identical rows keep their identity', () => {
    /* k2 is the edited one here — k1 is byte-identical in both lists, and must
       therefore come back carrying the key the draft already knows it by. */
    const clashed = run(
      loaded(),
      { type: 'patched', key: 'k2', field: 'answer', value: 'mine' },
      { type: 'conflicted', theirs },
    );
    expect(clashed.conflict?.[0]?.key).toBe('k1');
    expect(clashed.conflict?.[1]?.key).not.toBe('k1');
  });
});

describe('editing the draft', () => {
  it('appends a new row, opens it and points the caret where the caller asked', () => {
    const state = faqDraftReducer(loaded(), { type: 'added', question: 'From a gap', field: 'answer' });
    const added = state.rows[state.rows.length - 1]!;
    expect(state.rows).toHaveLength(5);
    expect(added.question).toBe('From a gap');
    expect(added.answer).toBe('');
    expect(state.editing).toBe(added.key);
    expect(state.focus).toEqual({ key: added.key, field: 'answer' });
    expect(faqDraftReducer(state, { type: 'focusConsumed' }).focus).toBeNull();
  });

  it('patches one field of one row and nothing else', () => {
    const state = faqDraftReducer(loaded(), { type: 'patched', key: 'k2', field: 'question', value: 'two?' });
    expect(state.rows.map((r) => r.question)).toEqual(['one', 'two?', 'three', 'four']);
    expect(rowByKey(state, 'k2')?.answer).toBe('answer k2');
  });

  it('deletes rows and forgets them everywhere at once', () => {
    const state = run(
      loaded(),
      { type: 'selectionSet', keys: ['k2', 'k3'] },
      { type: 'editingSet', key: 'k2' },
      { type: 'removed', keys: ['k2', 'k3'] },
    );
    expect(keys(state)).toEqual(['k1', 'k4']);
    expect(state.selection).toEqual([]);
    expect(state.editing).toBeNull();
    const untouched = loaded();
    expect(faqDraftReducer(untouched, { type: 'removed', keys: ['gone'] })).toBe(untouched);
  });

  it('undo puts the whole previous list back, in its own places', () => {
    const before = loaded().rows;
    const deleted = faqDraftReducer(loaded(), { type: 'removed', keys: ['k2'] });
    const restored = faqDraftReducer(deleted, { type: 'restored', rows: before });
    expect(keys(restored)).toEqual(['k1', 'k2', 'k3', 'k4']);
  });

  it('discards back to the server list without touching the baseline', () => {
    const dirty = run(
      loaded(),
      { type: 'patched', key: 'k1', field: 'answer', value: 'mine' },
      { type: 'added', question: 'new', field: 'question' },
    );
    expect(isDirty(dirty)).toBe(true);
    const clean = faqDraftReducer(dirty, { type: 'discarded' });
    expect(isDirty(clean)).toBe(false);
    expect(keys(clean)).toEqual(['k1', 'k2', 'k3', 'k4']);
    expect(clean.editing).toBeNull();
  });
});

describe('selection', () => {
  const ids = SERVER.map((r) => r.key);

  it('toggles, and a shift-click takes the span from the anchor', () => {
    const one = faqDraftReducer(loaded(), { type: 'selectionToggled', key: 'k2', ids, shift: false });
    expect(one.selection).toEqual(['k2']);
    expect(one.anchor).toBe('k2');
    const span = faqDraftReducer(one, { type: 'selectionToggled', key: 'k4', ids, shift: true });
    expect(span.selection).toEqual(['k2', 'k3', 'k4']);
    /* The anchor does not follow a shift-click, so the next one grows the range. */
    expect(span.anchor).toBe('k2');
  });

  it('keeps the selection in list order however it was built', () => {
    const state = run(
      loaded(),
      { type: 'selectionToggled', key: 'k4', ids, shift: false },
      { type: 'selectionToggled', key: 'k1', ids, shift: false },
    );
    expect(state.selection).toEqual(['k1', 'k4']);
    expect(selectedRows(state).map((r) => r.question)).toEqual(['one', 'four']);
  });

  it('never selects a key that is not in the list, and clears to nothing', () => {
    const state = faqDraftReducer(loaded(), { type: 'selectionSet', keys: ['k1', 'ghost'] });
    expect(state.selection).toEqual(['k1']);
    const cleared = faqDraftReducer(state, { type: 'selectionCleared' });
    expect(cleared.selection).toEqual([]);
    expect(faqDraftReducer(cleared, { type: 'selectionCleared' })).toBe(cleared);
  });
});

describe('saving', () => {
  it('a reorder alone is an unsaved change', () => {
    expect(isDirty(faqDraftReducer(loaded(), { type: 'nudged', key: 'k4', to: 'top' }))).toBe(true);
  });

  it('commits the draft as the new baseline', () => {
    const saved = run(
      loaded(),
      { type: 'patched', key: 'k1', field: 'answer', value: 'mine' },
      { type: 'saveStarted' },
      { type: 'saveCommitted' },
    );
    expect(saved.saving).toBe(false);
    expect(isDirty(saved)).toBe(false);
    expect(baselineEntries(saved)[0]).toEqual({ question: 'one', answer: 'mine' });
  });

  it('keeps the draft on a failure and says why', () => {
    const failed = run(
      loaded(),
      { type: 'patched', key: 'k1', field: 'answer', value: 'mine' },
      { type: 'saveStarted' },
      { type: 'saveFailed', message: 'The knowledge base is full' },
    );
    expect(failed.saving).toBe(false);
    expect(failed.error).toBe('The knowledge base is full');
    expect(isDirty(failed)).toBe(true);
    /* And the next edit clears the message rather than leaving it stale. */
    expect(
      faqDraftReducer(failed, { type: 'patched', key: 'k1', field: 'answer', value: 'mine again' }).error,
    ).toBeNull();
  });

  it('refuses a list with a question nobody can match', () => {
    const clean = loaded();
    expect(canSave(clean)).toBe(false);
    const withBlank = faqDraftReducer(clean, { type: 'added', question: '', field: 'question' });
    expect(blankQuestions(withBlank)).toHaveLength(1);
    expect(canSave(withBlank)).toBe(false);
    const filled = faqDraftReducer(withBlank, {
      type: 'patched',
      key: withBlank.rows[4]!.key,
      field: 'question',
      value: 'five',
    });
    expect(canSave(filled)).toBe(true);
    expect(canSave({ ...filled, saving: true })).toBe(false);
  });
});

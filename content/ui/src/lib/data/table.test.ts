import { describe, expect, it } from 'vitest';
import {
  applyVisibleOrder,
  clampColumnWidth,
  columnReorderAction,
  headerCheckboxState,
  nextReorderTarget,
  nextSortState,
  reorderColumns,
  reorderMovableColumns,
  resolveColumnWidths,
  toggleSelection,
  visibleColumns,
} from './table';

describe('nextSortState', () => {
  it('cycles unsorted -> asc -> desc -> unsorted', () => {
    const a = nextSortState(null, 'name');
    expect(a).toEqual({ key: 'name', dir: 'asc' });
    const b = nextSortState(a, 'name');
    expect(b).toEqual({ key: 'name', dir: 'desc' });
    expect(nextSortState(b, 'name')).toBeNull();
  });

  it('starts a different column fresh at asc', () => {
    expect(nextSortState({ key: 'name', dir: 'desc' }, 'amount')).toEqual({
      key: 'amount',
      dir: 'asc',
    });
  });
});

describe('headerCheckboxState', () => {
  it('is false when nothing is selected and true when all are', () => {
    expect(headerCheckboxState(0, 5)).toBe(false);
    expect(headerCheckboxState(5, 5)).toBe(true);
  });

  it('is indeterminate in between', () => {
    expect(headerCheckboxState(2, 5)).toBe('indeterminate');
  });

  it('is false when no row can be selected at all', () => {
    expect(headerCheckboxState(0, 0)).toBe(false);
  });

  it('does not go indeterminate when selection outruns the loaded page', () => {
    /* Selection survives paging, so more can be selected than is on screen. */
    expect(headerCheckboxState(7, 5)).toBe(true);
  });
});

const IDS = ['a', 'b', 'c', 'd', 'e'];

describe('toggleSelection — plain clicks', () => {
  it('adds, and moves the anchor', () => {
    expect(toggleSelection({ ids: IDS, selected: [], id: 'b', anchor: null })).toEqual({
      selected: ['b'],
      anchor: 'b',
    });
  });

  it('removes an already-selected row and still moves the anchor there', () => {
    expect(toggleSelection({ ids: IDS, selected: ['b', 'c'], id: 'b', anchor: 'c' })).toEqual({
      selected: ['c'],
      anchor: 'b',
    });
  });

  it('keeps the result in display order, not click order', () => {
    const first = toggleSelection({ ids: IDS, selected: [], id: 'd', anchor: null });
    const second = toggleSelection({ ids: IDS, selected: first.selected, id: 'a', anchor: first.anchor });
    expect(second.selected).toEqual(['a', 'd']);
  });
});

describe('toggleSelection — shift ranges', () => {
  it('selects the span between the anchor and the target', () => {
    expect(toggleSelection({ ids: IDS, selected: ['b'], id: 'd', anchor: 'b', shift: true })).toEqual({
      selected: ['b', 'c', 'd'],
      anchor: 'b',
    });
  });

  it('works backwards', () => {
    expect(toggleSelection({ ids: IDS, selected: ['d'], id: 'b', anchor: 'd', shift: true })).toEqual({
      selected: ['b', 'c', 'd'],
      anchor: 'd',
    });
  });

  it('leaves the anchor alone, so a second shift-click regrows from the same end', () => {
    const first = toggleSelection({ ids: IDS, selected: ['b'], id: 'c', anchor: 'b', shift: true });
    expect(first.anchor).toBe('b');
    const second = toggleSelection({
      ids: IDS,
      selected: first.selected,
      id: 'e',
      anchor: first.anchor,
      shift: true,
    });
    expect(second.selected).toEqual(['b', 'c', 'd', 'e']);
  });

  it('deselects the span when the anchor itself is unselected', () => {
    expect(toggleSelection({ ids: IDS, selected: ['b', 'c', 'd'], id: 'd', anchor: 'a', shift: true })).toEqual({
      selected: [],
      anchor: 'a',
    });
  });

  it('preserves selections outside the span', () => {
    expect(toggleSelection({ ids: IDS, selected: ['a', 'c'], id: 'd', anchor: 'c', shift: true })).toEqual({
      selected: ['a', 'c', 'd'],
      anchor: 'c',
    });
  });

  it('degrades to a plain toggle when the anchor has been paged away', () => {
    expect(toggleSelection({ ids: IDS, selected: [], id: 'c', anchor: 'zz', shift: true })).toEqual({
      selected: ['c'],
      anchor: 'c',
    });
  });

  it('degrades to a plain toggle with no anchor at all', () => {
    expect(toggleSelection({ ids: IDS, selected: [], id: 'c', anchor: null, shift: true })).toEqual({
      selected: ['c'],
      anchor: 'c',
    });
  });

  it('drops ids that are no longer selectable', () => {
    /* A live update removed 'c' from the page; it must not survive in the result. */
    const result = toggleSelection({
      ids: ['a', 'b', 'd'],
      selected: ['a', 'c'],
      id: 'd',
      anchor: 'a',
      shift: true,
    });
    expect(result.selected).toEqual(['a', 'b', 'd']);
  });
});

const COLUMNS = [{ key: 'name', width: '16rem', minWidth: 120 }, { key: 'stage' }, { key: 'amount', width: '8rem' }];

describe('column widths', () => {
  it('falls back to the declared width, and undefined when there is none', () => {
    expect(resolveColumnWidths(COLUMNS)).toEqual(['16rem', undefined, '8rem']);
  });

  it('lets an override win', () => {
    expect(resolveColumnWidths(COLUMNS, { name: 300 })).toEqual(['300px', undefined, '8rem']);
  });

  it('clamps an override to the column minimum', () => {
    expect(resolveColumnWidths(COLUMNS, { name: 10 })).toEqual(['120px', undefined, '8rem']);
  });

  it('applies a default floor when the column declares none', () => {
    expect(clampColumnWidth(4, { key: 'stage' })).toBe(64);
  });
});

describe('visibleColumns', () => {
  it('is a copy when nothing is hidden', () => {
    expect(visibleColumns(COLUMNS)).toEqual(COLUMNS);
    expect(visibleColumns(COLUMNS)).not.toBe(COLUMNS);
  });

  it('drops the hidden keys', () => {
    expect(visibleColumns(COLUMNS, ['stage']).map((c) => c.key)).toEqual(['name', 'amount']);
  });

  it('never returns an empty table', () => {
    expect(visibleColumns(COLUMNS, ['name', 'stage', 'amount']).map((c) => c.key)).toEqual(['name']);
  });

  it('handles having no columns at all', () => {
    expect(visibleColumns([], ['name'])).toEqual([]);
  });
});

describe('reorderColumns', () => {
  const ORDER = ['name', 'email', 'city', 'stage'];

  it('drops a column into the slot the target held, moving right', () => {
    expect(reorderColumns(ORDER, 'name', 'city')).toEqual(['email', 'city', 'name', 'stage']);
  });

  it('and moving left', () => {
    expect(reorderColumns(ORDER, 'stage', 'email')).toEqual(['name', 'stage', 'email', 'city']);
  });

  it('is a no-op on itself', () => {
    expect(reorderColumns(ORDER, 'city', 'city')).toEqual(ORDER);
  });

  it('is a no-op for a key that is not there', () => {
    expect(reorderColumns(ORDER, 'ghost', 'city')).toEqual(ORDER);
    expect(reorderColumns(ORDER, 'city', 'ghost')).toEqual(ORDER);
  });

  it('never mutates the input', () => {
    const input = [...ORDER];
    reorderColumns(input, 'name', 'stage');
    expect(input).toEqual(ORDER);
  });

  it('round-trips a single-step move', () => {
    const moved = reorderColumns(ORDER, 'name', 'email');
    expect(reorderColumns(moved, 'name', 'name')).toEqual(moved);
    expect(reorderColumns(moved, 'email', 'name')).toEqual(ORDER);
  });
});

describe('applyVisibleOrder', () => {
  it('keeps a hidden column in the slot it already held', () => {
    /* 'email' is hidden; reordering the three visible columns must not drag it
     * to the end, or unhiding it later would find it somewhere it never was. */
    expect(applyVisibleOrder(['name', 'email', 'city', 'stage'], ['city', 'stage', 'name'])).toEqual([
      'city',
      'email',
      'stage',
      'name',
    ]);
  });

  it('is the identity when nothing is hidden and nothing moved', () => {
    expect(applyVisibleOrder(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('leaves a slot alone rather than emptying it when the visible list is short', () => {
    expect(applyVisibleOrder(['a', 'b', 'c'], ['b'])).toEqual(['a', 'b', 'c']);
  });

  it('never mutates the input', () => {
    const order = ['a', 'b'];
    applyVisibleOrder(order, ['b', 'a']);
    expect(order).toEqual(['a', 'b']);
  });
});

describe('columnReorderAction', () => {
  it('Space grabs, then Space drops', () => {
    expect(columnReorderAction(' ', false)).toEqual({ type: 'grab' });
    expect(columnReorderAction(' ', true)).toEqual({ type: 'drop' });
  });

  it('arrows only move something already grabbed', () => {
    expect(columnReorderAction('ArrowLeft', false)).toEqual({ type: 'none' });
    expect(columnReorderAction('ArrowLeft', true)).toEqual({ type: 'move', delta: -1 });
    expect(columnReorderAction('ArrowRight', true)).toEqual({ type: 'move', delta: 1 });
  });

  it('Enter drops and Escape puts it back', () => {
    expect(columnReorderAction('Enter', true)).toEqual({ type: 'drop' });
    expect(columnReorderAction('Escape', true)).toEqual({ type: 'cancel' });
  });

  it('leaves Escape and Enter alone when nothing is grabbed', () => {
    expect(columnReorderAction('Escape', false)).toEqual({ type: 'none' });
    expect(columnReorderAction('Enter', false)).toEqual({ type: 'none' });
  });

  it('ignores anything else', () => {
    expect(columnReorderAction('a', true)).toEqual({ type: 'none' });
    expect(columnReorderAction('ArrowDown', true)).toEqual({ type: 'none' });
  });
});

describe('reorderMovableColumns', () => {
  const ORDER = ['name', 'email', 'city', 'stage'];

  it('is reorderColumns when every column may move', () => {
    expect(reorderMovableColumns(ORDER, ORDER, 'stage', 'email')).toEqual(reorderColumns(ORDER, 'stage', 'email'));
  });

  it('keeps a frozen leading column at index 0', () => {
    /* The identity column everything else is read against. A plain splice
     * would push it to index 1 the moment another column landed on it. */
    const movable = ['email', 'city', 'stage'];
    expect(reorderMovableColumns(ORDER, movable, 'stage', 'email')).toEqual(['name', 'stage', 'email', 'city']);
  });

  it('keeps a frozen MIDDLE column exactly where it was', () => {
    const order = ['a', 'frozen', 'c', 'd'];
    const movable = ['a', 'c', 'd'];
    const next = reorderMovableColumns(order, movable, 'a', 'd');
    expect(next).toEqual(['c', 'frozen', 'd', 'a']);
    expect(next.indexOf('frozen')).toBe(1);
  });

  it('lets the columns either side of a frozen one trade places across it', () => {
    const order = ['a', 'frozen', 'c'];
    expect(reorderMovableColumns(order, ['a', 'c'], 'a', 'c')).toEqual(['c', 'frozen', 'a']);
  });

  it('refuses to move a frozen column, and refuses to drop onto one', () => {
    const movable = ['email', 'city', 'stage'];
    expect(reorderMovableColumns(ORDER, movable, 'name', 'city')).toEqual(ORDER);
    expect(reorderMovableColumns(ORDER, movable, 'city', 'name')).toEqual(ORDER);
  });

  it('never mutates the input', () => {
    const input = [...ORDER];
    reorderMovableColumns(input, ['email', 'city', 'stage'], 'stage', 'email');
    expect(input).toEqual(ORDER);
  });
});

describe('nextReorderTarget', () => {
  const ORDER = ['name', 'email', 'city', 'stage'];
  const MOVABLE = ['email', 'city', 'stage'];

  it('is the adjacent column when everything may move', () => {
    expect(nextReorderTarget(ORDER, ORDER, 'city', -1)).toBe('email');
    expect(nextReorderTarget(ORDER, ORDER, 'city', 1)).toBe('stage');
  });

  it('stops at a frozen column instead of walking it out of position one', () => {
    /* This is the bug the pointer route never had: a frozen column is not
     * registered as a drop target, so a drag simply cannot reach it. */
    expect(nextReorderTarget(ORDER, MOVABLE, 'email', -1)).toBeNull();
  });

  it('steps OVER a frozen column in the middle rather than treating it as a wall', () => {
    expect(nextReorderTarget(['a', 'frozen', 'c'], ['a', 'c'], 'a', 1)).toBe('c');
  });

  it('is null at the end of the row', () => {
    expect(nextReorderTarget(ORDER, MOVABLE, 'stage', 1)).toBeNull();
  });

  it('is null for a column that cannot move at all', () => {
    expect(nextReorderTarget(ORDER, MOVABLE, 'name', 1)).toBeNull();
  });

  it('is null for a key that is not in the order', () => {
    expect(nextReorderTarget(ORDER, MOVABLE, 'ghost', 1)).toBeNull();
  });
});

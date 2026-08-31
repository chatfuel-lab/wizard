import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EDIT_ERROR,
  cellId,
  cellKeyAction,
  editChanged,
  editErrorMessage,
  editKeyAction,
  editorHoldsKey,
  firstEditableCell,
  isEditableCell,
  isThenable,
  nextEditableCell,
  sameCell,
  type EditableGrid,
} from './tableEdit';

const GRID: EditableGrid = {
  rows: ['r1', 'r2', 'r3'],
  columns: ['name', 'email', 'city'],
};

describe('nextEditableCell — Enter (down/up)', () => {
  it('holds the column and steps one row', () => {
    expect(nextEditableCell(GRID, { rowId: 'r1', columnKey: 'email' }, 'down')).toEqual({
      rowId: 'r2',
      columnKey: 'email',
    });
    expect(nextEditableCell(GRID, { rowId: 'r3', columnKey: 'email' }, 'up')).toEqual({
      rowId: 'r2',
      columnKey: 'email',
    });
  });

  it('stops at the ends rather than wrapping', () => {
    expect(nextEditableCell(GRID, { rowId: 'r3', columnKey: 'name' }, 'down')).toBeNull();
    expect(nextEditableCell(GRID, { rowId: 'r1', columnKey: 'name' }, 'up')).toBeNull();
  });

  it('skips a locked row', () => {
    const grid: EditableGrid = { ...GRID, isEditable: (cell) => cell.rowId !== 'r2' };
    expect(nextEditableCell(grid, { rowId: 'r1', columnKey: 'name' }, 'down')).toEqual({
      rowId: 'r3',
      columnKey: 'name',
    });
  });

  it('returns null when every row below is locked', () => {
    const grid: EditableGrid = { ...GRID, isEditable: (cell) => cell.rowId === 'r1' };
    expect(nextEditableCell(grid, { rowId: 'r1', columnKey: 'name' }, 'down')).toBeNull();
  });
});

describe('nextEditableCell — arrows (left/right)', () => {
  it('holds the row and steps one column', () => {
    expect(nextEditableCell(GRID, { rowId: 'r2', columnKey: 'name' }, 'right')).toEqual({
      rowId: 'r2',
      columnKey: 'email',
    });
    expect(nextEditableCell(GRID, { rowId: 'r2', columnKey: 'city' }, 'left')).toEqual({
      rowId: 'r2',
      columnKey: 'email',
    });
  });

  it('never crosses into the next row', () => {
    expect(nextEditableCell(GRID, { rowId: 'r2', columnKey: 'city' }, 'right')).toBeNull();
    expect(nextEditableCell(GRID, { rowId: 'r2', columnKey: 'name' }, 'left')).toBeNull();
  });

  it('skips a cell the row does not own', () => {
    const grid: EditableGrid = {
      ...GRID,
      isEditable: (cell) => !(cell.rowId === 'r2' && cell.columnKey === 'email'),
    };
    expect(nextEditableCell(grid, { rowId: 'r2', columnKey: 'name' }, 'right')).toEqual({
      rowId: 'r2',
      columnKey: 'city',
    });
  });
});

describe('nextEditableCell — Tab (reading order)', () => {
  it('moves along the row', () => {
    expect(nextEditableCell(GRID, { rowId: 'r1', columnKey: 'name' }, 'next')).toEqual({
      rowId: 'r1',
      columnKey: 'email',
    });
  });

  it('wraps onto the first column of the next row', () => {
    expect(nextEditableCell(GRID, { rowId: 'r1', columnKey: 'city' }, 'next')).toEqual({
      rowId: 'r2',
      columnKey: 'name',
    });
  });

  it('wraps backwards onto the last column of the previous row', () => {
    expect(nextEditableCell(GRID, { rowId: 'r2', columnKey: 'name' }, 'previous')).toEqual({
      rowId: 'r1',
      columnKey: 'city',
    });
  });

  it('runs out at the two corners of the grid', () => {
    expect(nextEditableCell(GRID, { rowId: 'r3', columnKey: 'city' }, 'next')).toBeNull();
    expect(nextEditableCell(GRID, { rowId: 'r1', columnKey: 'name' }, 'previous')).toBeNull();
  });

  it('skips a whole locked row on the way past', () => {
    const grid: EditableGrid = { ...GRID, isEditable: (cell) => cell.rowId !== 'r2' };
    expect(nextEditableCell(grid, { rowId: 'r1', columnKey: 'city' }, 'next')).toEqual({
      rowId: 'r3',
      columnKey: 'name',
    });
  });
});

describe('nextEditableCell — rows that moved under the editor', () => {
  it('gives up when the row was paged away', () => {
    /* Live updates remove rows mid-edit. "One row down" from a row that is
     * gone has no honest answer, and guessing would overwrite a stranger. */
    expect(nextEditableCell(GRID, { rowId: 'zz', columnKey: 'name' }, 'down')).toBeNull();
  });

  it('gives up when the column was hidden', () => {
    expect(nextEditableCell(GRID, { rowId: 'r1', columnKey: 'phone' }, 'next')).toBeNull();
  });

  it('handles a grid with no editable columns at all', () => {
    expect(nextEditableCell({ rows: ['r1'], columns: [] }, { rowId: 'r1', columnKey: 'x' }, 'next')).toBeNull();
  });
});

describe('firstEditableCell / isEditableCell / sameCell', () => {
  it('finds the top-left editable cell', () => {
    expect(firstEditableCell(GRID)).toEqual({ rowId: 'r1', columnKey: 'name' });
  });

  it('skips past locked cells in reading order', () => {
    const grid: EditableGrid = {
      ...GRID,
      isEditable: (cell) => cell.rowId === 'r2' && cell.columnKey === 'city',
    };
    expect(firstEditableCell(grid)).toEqual({ rowId: 'r2', columnKey: 'city' });
  });

  it('is null when nothing can be edited', () => {
    expect(firstEditableCell({ rows: [], columns: ['name'] })).toBeNull();
    expect(firstEditableCell({ ...GRID, isEditable: () => false })).toBeNull();
  });

  it('rejects a cell outside the grid', () => {
    expect(isEditableCell(GRID, { rowId: 'r1', columnKey: 'name' })).toBe(true);
    expect(isEditableCell(GRID, { rowId: 'gone', columnKey: 'name' })).toBe(false);
    expect(isEditableCell(GRID, { rowId: 'r1', columnKey: 'hidden' })).toBe(false);
  });

  it('compares cells, nulls included', () => {
    expect(sameCell({ rowId: 'a', columnKey: 'b' }, { rowId: 'a', columnKey: 'b' })).toBe(true);
    expect(sameCell({ rowId: 'a', columnKey: 'b' }, { rowId: 'a', columnKey: 'c' })).toBe(false);
    expect(sameCell(null, null)).toBe(true);
    expect(sameCell(null, { rowId: 'a', columnKey: 'b' })).toBe(false);
  });
});

describe('editKeyAction', () => {
  it('commits down on Enter and up on Shift+Enter', () => {
    expect(editKeyAction({ key: 'Enter' })).toEqual({ type: 'commit', move: 'down' });
    expect(editKeyAction({ key: 'Enter', shiftKey: true })).toEqual({ type: 'commit', move: 'up' });
  });

  it('commits along reading order on Tab', () => {
    expect(editKeyAction({ key: 'Tab' })).toEqual({ type: 'commit', move: 'next' });
    expect(editKeyAction({ key: 'Tab', shiftKey: true })).toEqual({
      type: 'commit',
      move: 'previous',
    });
  });

  it('cancels on Escape even with a modifier held', () => {
    expect(editKeyAction({ key: 'Escape' })).toEqual({ type: 'cancel' });
    expect(editKeyAction({ key: 'Escape', metaKey: true })).toEqual({ type: 'cancel' });
  });

  it('leaves application shortcuts alone', () => {
    expect(editKeyAction({ key: 'Enter', metaKey: true })).toEqual({ type: 'none' });
    expect(editKeyAction({ key: 'Enter', ctrlKey: true })).toEqual({ type: 'none' });
    expect(editKeyAction({ key: 'a', metaKey: true })).toEqual({ type: 'none' });
  });

  it('ignores every ordinary key, so typing reaches the input', () => {
    expect(editKeyAction({ key: 'a' })).toEqual({ type: 'none' });
    expect(editKeyAction({ key: 'ArrowDown' })).toEqual({ type: 'none' });
    expect(editKeyAction({ key: ' ' })).toEqual({ type: 'none' });
  });
});

describe('cellKeyAction', () => {
  it('opens the editor on Enter and F2', () => {
    expect(cellKeyAction({ key: 'Enter' })).toEqual({ type: 'edit' });
    expect(cellKeyAction({ key: 'F2' })).toEqual({ type: 'edit' });
  });

  it('moves the cursor on the arrows', () => {
    expect(cellKeyAction({ key: 'ArrowDown' })).toEqual({ type: 'move', move: 'down' });
    expect(cellKeyAction({ key: 'ArrowUp' })).toEqual({ type: 'move', move: 'up' });
    expect(cellKeyAction({ key: 'ArrowRight' })).toEqual({ type: 'move', move: 'right' });
    expect(cellKeyAction({ key: 'ArrowLeft' })).toEqual({ type: 'move', move: 'left' });
  });

  it('leaves Space to the row, so selection still works from a cell', () => {
    expect(cellKeyAction({ key: ' ' })).toEqual({ type: 'none' });
  });

  it('leaves Tab to the browser when nothing is being edited', () => {
    expect(cellKeyAction({ key: 'Tab' })).toEqual({ type: 'none' });
  });

  it('defers to a held modifier', () => {
    expect(cellKeyAction({ key: 'ArrowDown', metaKey: true })).toEqual({ type: 'none' });
  });
});

describe('editErrorMessage', () => {
  it('takes an Error message', () => {
    expect(editErrorMessage(new Error('Attribute is read-only'))).toBe('Attribute is read-only');
  });

  it('takes the message off a plain object', () => {
    /* A GraphQL failure is not an Error instance — an instanceof test would
     * throw away every useful message the API sends. */
    expect(editErrorMessage({ message: 'The upstream service rejected the request.' })).toBe(
      'The upstream service rejected the request.',
    );
  });

  it('takes a bare string', () => {
    expect(editErrorMessage('Nope')).toBe('Nope');
  });

  it('never prints [object Object] or undefined', () => {
    expect(editErrorMessage({})).toBe(DEFAULT_EDIT_ERROR);
    expect(editErrorMessage(undefined)).toBe(DEFAULT_EDIT_ERROR);
    expect(editErrorMessage(null)).toBe(DEFAULT_EDIT_ERROR);
    expect(editErrorMessage(new Error('   '))).toBe(DEFAULT_EDIT_ERROR);
    expect(editErrorMessage({ message: 42 })).toBe(DEFAULT_EDIT_ERROR);
  });
});

describe('editChanged', () => {
  it('is false when nothing was typed, so blur fires no mutation', () => {
    expect(editChanged('Anna', 'Anna')).toBe(false);
    expect(editChanged('', '')).toBe(false);
  });

  it('counts whitespace as a change rather than normalising it away', () => {
    expect(editChanged('Anna ', 'Anna')).toBe(true);
  });

  it('counts clearing a value', () => {
    expect(editChanged('', 'Anna')).toBe(true);
  });
});

describe('isThenable', () => {
  it('accepts a promise and a hand-rolled thenable', () => {
    expect(isThenable(Promise.resolve(1))).toBe(true);
    expect(isThenable({ then: () => undefined })).toBe(true);
  });

  it('rejects everything a synchronous commit can return', () => {
    expect(isThenable(undefined)).toBe(false);
    expect(isThenable(null)).toBe(false);
    expect(isThenable('ok')).toBe(false);
    expect(isThenable({})).toBe(false);
  });
});

describe('cellId', () => {
  it('cannot collide across a separator that appears in an id', () => {
    /* Row ids here are opaque server strings; whatever printable character we
     * picked, some id would eventually contain it. */
    expect(cellId({ rowId: 'a', columnKey: 'b:c' })).not.toBe(cellId({ rowId: 'a:b', columnKey: 'c' }));
  });

  it('is stable for the same cell', () => {
    expect(cellId({ rowId: 'r1', columnKey: 'name' })).toBe(cellId({ rowId: 'r1', columnKey: 'name' }));
  });
});

describe('editorHoldsKey', () => {
  it('holds the keys the row would otherwise steal', () => {
    /* Space was the one that mattered: a DataTable row toggles its selection
     * on Space, so without this a two-word value could not be typed at all. */
    expect(editorHoldsKey({ key: ' ' })).toBe(true);
    expect(editorHoldsKey({ key: 'Spacebar' })).toBe(true);
    expect(editorHoldsKey({ key: 'Enter' })).toBe(true);
    expect(editorHoldsKey({ key: 'Home' })).toBe(true);
    expect(editorHoldsKey({ key: 'End' })).toBe(true);
  });

  it('holds all four arrows — they move the caret here and the cursor outside', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      expect(editorHoldsKey({ key })).toBe(true);
    }
  });

  it('lets Escape and Tab through, because nothing outside the editor claims them', () => {
    expect(editorHoldsKey({ key: 'Escape' })).toBe(false);
    expect(editorHoldsKey({ key: 'Tab' })).toBe(false);
  });

  it('lets a modified key through to the application', () => {
    expect(editorHoldsKey({ key: 'k', metaKey: true })).toBe(false);
    expect(editorHoldsKey({ key: 'ArrowDown', metaKey: true })).toBe(false);
    expect(editorHoldsKey({ key: 'Enter', ctrlKey: true })).toBe(false);
    expect(editorHoldsKey({ key: ' ', altKey: true })).toBe(false);
  });

  it('does not hold Shift+Enter, which the editor itself answers', () => {
    expect(editorHoldsKey({ key: 'Enter', shiftKey: true })).toBe(true);
  });

  it('ignores ordinary typing', () => {
    expect(editorHoldsKey({ key: 'a' })).toBe(false);
    expect(editorHoldsKey({ key: '1' })).toBe(false);
    expect(editorHoldsKey({ key: 'Backspace' })).toBe(false);
  });
});

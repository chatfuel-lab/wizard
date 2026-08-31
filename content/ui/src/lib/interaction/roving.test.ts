import { describe, expect, it } from 'vitest';
import { rovingAction, seekEnabled, typeaheadIndex } from './roving';

describe('rovingAction — vertical (the default)', () => {
  it('moves down and up', () => {
    expect(rovingAction('ArrowDown', 4, 0)).toEqual({ type: 'move', index: 1 });
    expect(rovingAction('ArrowUp', 4, 2)).toEqual({ type: 'move', index: 1 });
  });

  it('wraps at both ends by default', () => {
    expect(rovingAction('ArrowDown', 4, 3)).toEqual({ type: 'move', index: 0 });
    expect(rovingAction('ArrowUp', 4, 0)).toEqual({ type: 'move', index: 3 });
  });

  it('stops at the ends when loop is off', () => {
    expect(rovingAction('ArrowDown', 4, 3, { loop: false })).toEqual({ type: 'none' });
    expect(rovingAction('ArrowUp', 4, 0, { loop: false })).toEqual({ type: 'none' });
  });

  it('enters at the first item when nothing is focused yet', () => {
    expect(rovingAction('ArrowDown', 4, -1)).toEqual({ type: 'move', index: 0 });
    expect(rovingAction('ArrowUp', 4, -1)).toEqual({ type: 'move', index: 3 });
  });

  it('ignores horizontal arrows so the page keeps its own behaviour', () => {
    expect(rovingAction('ArrowRight', 4, 0)).toEqual({ type: 'none' });
  });
});

describe('rovingAction — orientation', () => {
  it('horizontal owns left/right and ignores up/down', () => {
    expect(rovingAction('ArrowRight', 3, 0, { orientation: 'horizontal' })).toEqual({ type: 'move', index: 1 });
    expect(rovingAction('ArrowDown', 3, 0, { orientation: 'horizontal' })).toEqual({ type: 'none' });
  });

  it('both owns all four', () => {
    expect(rovingAction('ArrowDown', 3, 0, { orientation: 'both' })).toEqual({ type: 'move', index: 1 });
    expect(rovingAction('ArrowLeft', 3, 1, { orientation: 'both' })).toEqual({ type: 'move', index: 0 });
  });
});

describe('rovingAction — Home / End', () => {
  it('jumps to the first and last item', () => {
    expect(rovingAction('Home', 5, 3)).toEqual({ type: 'move', index: 0 });
    expect(rovingAction('End', 5, 1)).toEqual({ type: 'move', index: 4 });
  });

  it('skips disabled edges', () => {
    expect(rovingAction('Home', 5, 3, { disabled: [0, 1] })).toEqual({ type: 'move', index: 2 });
    expect(rovingAction('End', 5, 1, { disabled: [4] })).toEqual({ type: 'move', index: 3 });
  });
});

describe('rovingAction — disabled items', () => {
  it('steps over a separator', () => {
    expect(rovingAction('ArrowDown', 4, 0, { disabled: [1] })).toEqual({ type: 'move', index: 2 });
  });

  it('steps over a run of disabled items', () => {
    expect(rovingAction('ArrowDown', 5, 0, { disabled: [1, 2, 3] })).toEqual({ type: 'move', index: 4 });
  });

  it('reports none when every item is disabled', () => {
    expect(rovingAction('ArrowDown', 3, -1, { disabled: [0, 1, 2] })).toEqual({ type: 'none' });
  });

  it('reports none rather than re-selecting the only enabled item', () => {
    expect(rovingAction('ArrowDown', 3, 1, { disabled: [0, 2] })).toEqual({ type: 'none' });
  });
});

describe('rovingAction — empty group', () => {
  it('never acts on an empty list', () => {
    expect(rovingAction('ArrowDown', 0, -1)).toEqual({ type: 'none' });
    expect(rovingAction('Home', 0, -1)).toEqual({ type: 'none' });
  });
});

describe('seekEnabled', () => {
  it('returns the starting index when it is enabled', () => {
    expect(seekEnabled(4, 2, 1)).toBe(2);
  });

  it('wraps when looping', () => {
    expect(seekEnabled(4, 4, 1)).toBe(0);
  });

  it('gives up instead of wrapping when loop is off', () => {
    expect(seekEnabled(4, 4, 1, { loop: false })).toBe(-1);
  });
});

const LABELS = ['Archive', 'Assign', 'Copy link', 'Delete', 'Duplicate'];

describe('typeaheadIndex', () => {
  it('matches a prefix', () => {
    expect(typeaheadIndex(LABELS, 'co', -1)).toBe(2);
  });

  it('is case-insensitive', () => {
    expect(typeaheadIndex(LABELS, 'DEL', -1)).toBe(3);
  });

  it('searches after the current item so a longer buffer refines', () => {
    expect(typeaheadIndex(LABELS, 'a', -1)).toBe(0);
    expect(typeaheadIndex(LABELS, 'as', 0)).toBe(1);
  });

  it('cycles through matches when the same character is repeated', () => {
    expect(typeaheadIndex(LABELS, 'd', -1)).toBe(3);
    expect(typeaheadIndex(LABELS, 'dd', 3)).toBe(4);
    expect(typeaheadIndex(LABELS, 'ddd', 4)).toBe(3);
  });

  it('wraps around the end', () => {
    expect(typeaheadIndex(LABELS, 'a', 4)).toBe(0);
  });

  it('skips disabled items', () => {
    expect(typeaheadIndex(LABELS, 'a', -1, { disabled: [0] })).toBe(1);
  });

  it('reports -1 for no match and for an empty buffer', () => {
    expect(typeaheadIndex(LABELS, 'zz', -1)).toBe(-1);
    expect(typeaheadIndex(LABELS, '   ', -1)).toBe(-1);
  });
});

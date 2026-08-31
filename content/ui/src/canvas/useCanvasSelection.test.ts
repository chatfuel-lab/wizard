import { describe, expect, it } from 'vitest';
import { collapseSelection, marqueeSelection, nextSelection, pruneSelection } from './useCanvasSelection';

const set = (...ids: string[]) => new Set(ids) as ReadonlySet<string>;

describe('nextSelection', () => {
  it('replaces the selection on a plain press', () => {
    expect([...nextSelection(set('a', 'b'), 'c', false)]).toEqual(['c']);
  });

  it('adds on an additive press', () => {
    expect([...nextSelection(set('a'), 'b', true)]).toEqual(['a', 'b']);
  });

  it('removes an already-selected node on an additive press', () => {
    expect([...nextSelection(set('a', 'b'), 'a', true)]).toEqual(['b']);
  });

  it('keeps a multi-selection when one of its members is pressed', () => {
    /* The gesture that starts this way is "drag all of these". Collapsing here
       makes a group drag impossible — the first pixel of movement would already
       have thrown the group away. */
    const current = set('a', 'b', 'c');
    expect(nextSelection(current, 'b', false)).toBe(current);
  });

  it('keeps the set identical when the only selected node is pressed', () => {
    const current = set('a');
    expect(nextSelection(current, 'a', false)).toBe(current);
  });
});

describe('collapseSelection', () => {
  it('collapses a multi-selection to the clicked node', () => {
    expect([...collapseSelection(set('a', 'b', 'c'), 'b')]).toEqual(['b']);
  });

  it('is identity when that node is already the whole selection', () => {
    const current = set('b');
    expect(collapseSelection(current, 'b')).toBe(current);
  });

  it('selects a node that was not selected at all', () => {
    expect([...collapseSelection(set('a'), 'z')]).toEqual(['z']);
  });
});

describe('marqueeSelection', () => {
  it('replaces the selection with what the marquee caught', () => {
    expect([...marqueeSelection(set('a'), ['b', 'c'], false)]).toEqual(['b', 'c']);
  });

  it('clears the selection when a plain marquee catches nothing', () => {
    expect([...marqueeSelection(set('a', 'b'), [], false)]).toEqual([]);
  });

  it('adds to the selection when additive', () => {
    expect([...marqueeSelection(set('a'), ['b'], true)]).toEqual(['a', 'b']);
  });

  it('does not duplicate a node the marquee catches twice over', () => {
    expect([...marqueeSelection(set('a'), ['a', 'b'], true)]).toEqual(['a', 'b']);
  });
});

describe('pruneSelection', () => {
  it('drops ids that no longer exist', () => {
    expect([...pruneSelection(set('a', 'b'), set('b', 'c'))]).toEqual(['b']);
  });

  it('returns the SAME set when nothing was dropped', () => {
    /* Identity, not equality. The caller prunes from an effect on every server
       response; a fresh equal set would set state, re-run the effect and loop
       forever — and only once something was selected. */
    const current = set('a', 'b');
    expect(pruneSelection(current, set('a', 'b', 'c'))).toBe(current);
  });

  it('accepts a plain array of live ids', () => {
    expect([...pruneSelection(set('a', 'b'), ['a'])]).toEqual(['a']);
  });

  it('empties a selection whose nodes have all gone', () => {
    expect([...pruneSelection(set('a'), [])]).toEqual([]);
  });

  it('leaves an empty selection alone', () => {
    const current = set();
    expect(pruneSelection(current, ['a'])).toBe(current);
  });
});

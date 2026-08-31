import { describe, expect, it } from 'vitest';
import { collapseTrail, hiddenTrailLabel, type TrailItem, type TrailSlot } from './breadcrumbs';

const trail = (...labels: string[]): TrailItem[] => labels.map((label) => ({ id: label.toLowerCase(), label }));

const shape = (slots: TrailSlot<TrailItem>[]) =>
  slots.map((slot) => (slot.kind === 'ellipsis' ? `…${slot.hidden.length}` : slot.item.label));

describe('collapseTrail', () => {
  it('leaves a short trail alone', () => {
    expect(shape(collapseTrail(trail('Contacts', 'Anna Koch'), 3))).toEqual(['Contacts', 'Anna Koch']);
  });

  it('keeps the first and the last, and drops the middle', () => {
    expect(shape(collapseTrail(trail('Home', 'Contacts', 'VIP', 'Germany', 'Anna Koch'), 3))).toEqual([
      'Home',
      '…2',
      'Germany',
      'Anna Koch',
    ]);
  });

  it('does not collapse when only one item would be hidden', () => {
    /* One item replaced by one ellipsis saves no width and costs a click. */
    expect(shape(collapseTrail(trail('Home', 'Contacts', 'VIP', 'Anna Koch'), 3))).toEqual([
      'Home',
      'Contacts',
      'VIP',
      'Anna Koch',
    ]);
  });

  it('keeps exactly maxItems real items once it does collapse', () => {
    const slots = collapseTrail(trail('a', 'b', 'c', 'd', 'e', 'f', 'g'), 4);
    expect(slots.filter((slot) => slot.kind === 'item')).toHaveLength(4);
    expect(shape(slots)).toEqual(['a', '…3', 'e', 'f', 'g']);
  });

  it('never falls below first-plus-last, whatever it is asked for', () => {
    expect(shape(collapseTrail(trail('a', 'b', 'c', 'd'), 1))).toEqual(['a', '…2', 'd']);
    expect(shape(collapseTrail(trail('a', 'b', 'c', 'd'), 0))).toEqual(['a', '…2', 'd']);
  });

  it('carries the original index, so the last item can be told apart', () => {
    const slots = collapseTrail(trail('a', 'b', 'c', 'd', 'e'), 3);
    const last = slots[slots.length - 1];
    expect(last).toEqual({ kind: 'item', item: { id: 'e', label: 'e' }, index: 4 });
  });

  it('carries the hidden items themselves, so they can be expanded', () => {
    const slots = collapseTrail(trail('a', 'b', 'c', 'd', 'e'), 3);
    const ellipsis = slots.find((slot) => slot.kind === 'ellipsis');
    expect(ellipsis).toEqual({
      kind: 'ellipsis',
      hidden: [
        { id: 'b', label: 'b' },
        { id: 'c', label: 'c' },
      ],
    });
  });

  it('handles an empty trail and a single step', () => {
    expect(collapseTrail([], 3)).toEqual([]);
    expect(shape(collapseTrail(trail('Contacts'), 3))).toEqual(['Contacts']);
  });
});

describe('hiddenTrailLabel', () => {
  it('names what the ellipsis stands for', () => {
    expect(hiddenTrailLabel(trail('Contacts', 'VIP'))).toBe('Show 2 hidden steps: Contacts, VIP');
  });

  it('reads as singular for one', () => {
    expect(hiddenTrailLabel(trail('Contacts'))).toBe('Show 1 hidden step: Contacts');
  });

  it('is empty when nothing is hidden, so no control is labelled with a lie', () => {
    expect(hiddenTrailLabel([])).toBe('');
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { isBottomLayer, isLayerAbove, isTopLayer, layerCount, popLayer, pushLayer, resetLayers } from './layers';

beforeEach(resetLayers);

describe('layer stack', () => {
  it('reports the most recently pushed layer as the top', () => {
    pushLayer('dialog');
    pushLayer('popover');
    expect(isTopLayer('popover')).toBe(true);
    expect(isTopLayer('dialog')).toBe(false);
  });

  it('hands the top back when the layer above closes', () => {
    pushLayer('dialog');
    pushLayer('popover');
    popLayer('popover');
    expect(isTopLayer('dialog')).toBe(true);
  });

  it('tracks the bottom layer, which owns the background', () => {
    pushLayer('dialog');
    pushLayer('popover');
    expect(isBottomLayer('dialog')).toBe(true);
    expect(isBottomLayer('popover')).toBe(false);
  });

  it('never reports a top when empty', () => {
    expect(isTopLayer('anything')).toBe(false);
    expect(isBottomLayer('anything')).toBe(false);
    expect(layerCount()).toBe(0);
  });

  it('knows which of two open layers is above the other', () => {
    /* A popover opened from inside a popover: the inner is above the outer,
       so a press inside the inner is not an outside press for the outer. */
    pushLayer('outer');
    pushLayer('inner');
    expect(isLayerAbove('inner', 'outer')).toBe(true);
    expect(isLayerAbove('outer', 'inner')).toBe(false);
    expect(isLayerAbove('outer', 'outer')).toBe(false);
  });

  it('says nothing is above a layer that is not open', () => {
    pushLayer('outer');
    expect(isLayerAbove('inner', 'outer')).toBe(false);
    expect(isLayerAbove('outer', 'gone')).toBe(false);
  });
});

describe('layer stack — misuse', () => {
  it('does not duplicate a re-pushed id', () => {
    pushLayer('dialog');
    pushLayer('dialog');
    expect(layerCount()).toBe(1);
    popLayer('dialog');
    expect(layerCount()).toBe(0);
  });

  it('moves a re-pushed id to the top rather than leaving it buried', () => {
    pushLayer('a');
    pushLayer('b');
    pushLayer('a');
    expect(isTopLayer('a')).toBe(true);
    expect(layerCount()).toBe(2);
  });

  it('ignores popping an id that was never pushed', () => {
    pushLayer('a');
    popLayer('ghost');
    expect(layerCount()).toBe(1);
    expect(isTopLayer('a')).toBe(true);
  });

  it('survives out-of-order pops', () => {
    pushLayer('a');
    pushLayer('b');
    pushLayer('c');
    popLayer('b');
    expect(layerCount()).toBe(2);
    expect(isTopLayer('c')).toBe(true);
    expect(isBottomLayer('a')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { BLOCK_PLUGIN_CATALOG } from './blockPlugins';
import { blockVisual, cardVisual, elementVisual, NEUTRAL, pluginVisual } from './blockVisuals';
import { BLOCK_LABELS, ELEMENT_LABELS } from './elementSummary';

/**
 * The same discipline as `editorCoverage.test.ts`, applied to appearance
 * instead of editability: a typename this build has a NAME for must also have a
 * considered LOOK. Otherwise a new element family lands, gets its label, and
 * shows up on the canvas as a grey unknown — which reads to a user as a bug in
 * their flow rather than as a gap in ours.
 */
describe('block visuals', () => {
  it('gives every named element typename a considered visual', () => {
    const unstyled = Object.keys(ELEMENT_LABELS).filter((typename) => elementVisual(typename) === NEUTRAL);
    expect(unstyled).toEqual([]);
  });

  it('gives every named block typename a considered visual', () => {
    const unstyled = Object.keys(BLOCK_LABELS).filter((typename) => blockVisual(typename) === NEUTRAL);
    expect(unstyled).toEqual([]);
  });

  it('gives every block family the palette can offer a considered visual', () => {
    const unstyled = BLOCK_PLUGIN_CATALOG.filter((plugin) => pluginVisual(plugin.key) === NEUTRAL);
    expect(unstyled.map((plugin) => plugin.key)).toEqual([]);
  });

  it('falls back rather than throwing on a typename this build never heard of', () => {
    expect(elementVisual('SomeNewFangledBlockElement')).toBe(NEUTRAL);
    expect(blockVisual('SomeNewFangledBlock')).toBe(NEUTRAL);
    expect(pluginVisual('someNewFangledFamily')).toBe(NEUTRAL);
    expect(cardVisual('SomeNewFangledBlock', ['AlsoUnknownBlockElement'])).toBe(NEUTRAL);
  });

  it('reads a card from its first element, because the block typename is often generic', () => {
    /* `RegularContentBlock` is the schema's catch-all container and says
       nothing about what is in it. A content block holding one image IS an
       image block as far as anyone looking at the canvas is concerned. */
    expect(cardVisual('RegularContentBlock', ['WhatsAppImageBlockElement'])).toEqual(
      elementVisual('WhatsAppImageBlockElement'),
    );
    expect(cardVisual('RegularContentBlock', [])).toEqual(blockVisual('RegularContentBlock'));
  });

  it('falls back to the block when the first element is unknown but the block is not', () => {
    expect(cardVisual('SetConditionBlock', ['SomethingUnknownBlockElement'])).toEqual(blockVisual('SetConditionBlock'));
  });

  it('keeps every tone in use, so none is a dead branch in the class maps', () => {
    const tones = new Set([
      ...Object.keys(ELEMENT_LABELS).map((typename) => elementVisual(typename).tone),
      ...Object.keys(BLOCK_LABELS).map((typename) => blockVisual(typename).tone),
      NEUTRAL.tone,
    ]);
    expect([...tones].sort()).toEqual(['ai', 'entry', 'logic', 'message', 'neutral']);
  });
});

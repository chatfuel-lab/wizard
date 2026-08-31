import { describe, expect, it } from 'vitest';
import { seedSettled } from './useComposerSeed';

/**
 * The bug this pins: a composer opened from a library tile came up blank and
 * stayed blank.
 *
 * `loading` used to be raised inside an effect, which runs one commit AFTER the
 * id arrives. In that commit it read false with no draft — indistinguishable
 * from "asked, and there was nothing behind it" — and the composer, which
 * latches its seed exactly once, latched on the empty answer. The media arrived
 * a moment later to a consumer that had already decided.
 */
describe('seedSettled', () => {
  it('is settled when nothing was asked for', () => {
    expect(seedSettled(null, null)).toBe(true);
    expect(seedSettled(null, 'ig-1')).toBe(true);
  });

  it('is NOT settled in the commit the id first appears', () => {
    // Nothing has been resolved yet — this is the frame the old flag got wrong.
    expect(seedSettled('ig-1', null)).toBe(false);
  });

  it('is settled once the answer belongs to the id being asked about', () => {
    expect(seedSettled('ig-1', 'ig-1')).toBe(true);
  });

  it('is NOT settled while the answer belongs to the PREVIOUS id', () => {
    // Opening one tile and then another must not seed the second from the first.
    expect(seedSettled('ig-2', 'ig-1')).toBe(false);
  });
});

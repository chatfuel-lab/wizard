import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BAND_INLINE, BAND_NARROW, BAND_WIDE, BANDS, bandAtLeast, bandFor, nextBand } from './layout';

describe('bandFor', () => {
  it('switches exactly at the constants, inclusive on the upper band', () => {
    expect(bandFor(BAND_NARROW - 1)).toBe('compact');
    expect(bandFor(BAND_NARROW)).toBe('narrow');
    expect(bandFor(BAND_WIDE - 1)).toBe('narrow');
    expect(bandFor(BAND_WIDE)).toBe('wide');
    expect(bandFor(BAND_INLINE - 1)).toBe('wide');
    expect(bandFor(BAND_INLINE)).toBe('inline');
  });

  it('degrades every unusable width to the SMALLEST band', () => {
    // A detached or display:none root reports 0; NaN comes from a bad read.
    expect(bandFor(0)).toBe('compact');
    expect(bandFor(-1)).toBe('compact');
    expect(bandFor(Number.NaN)).toBe('compact');
    // Infinity too, and that direction is the point: a garbage measurement must
    // never be read as "lots of room". The compact layout works at any width;
    // the inline one assumes 1280px of it.
    expect(bandFor(Number.POSITIVE_INFINITY)).toBe('compact');
  });
});

describe('bandAtLeast', () => {
  it('is inclusive at the named band', () => {
    expect(bandAtLeast('wide', 'wide')).toBe(true);
    expect(bandAtLeast('inline', 'wide')).toBe(true);
    expect(bandAtLeast('narrow', 'wide')).toBe(false);
    expect(bandAtLeast('compact', 'compact')).toBe(true);
  });

  it('orders every band against every other', () => {
    for (let i = 0; i < BANDS.length; i += 1) {
      for (let j = 0; j < BANDS.length; j += 1) {
        expect(bandAtLeast(BANDS[i], BANDS[j])).toBe(i >= j);
      }
    }
  });
});

describe('nextBand', () => {
  it('returns null while the width stays inside the current band', () => {
    expect(nextBand('wide', BAND_WIDE)).toBeNull();
    expect(nextBand('wide', BAND_INLINE - 1)).toBeNull();
  });

  it('returns the new band the moment the boundary is crossed', () => {
    expect(nextBand('wide', BAND_INLINE)).toBe('inline');
    expect(nextBand('wide', BAND_WIDE - 1)).toBe('narrow');
    expect(nextBand('inline', 0)).toBe('compact');
  });
});

/**
 * The tokens and these constants are two halves of one decision. If they drift,
 * a module lays itself out for one band while its own CSS is styling for
 * another, and the failure is invisible except in a narrow strip either side of
 * the boundary — which is exactly the kind of bug nobody reproduces on demand.
 *
 * Reading the file is the only way to assert it: the constants are TypeScript
 * and the thresholds are CSS custom properties, and no build step brings them
 * together. Node-only, no jsdom.
 */
describe('token parity with styles/tokens.css', () => {
  const css = readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8');
  const tokenPx = (name: string): number => {
    const match = css.match(new RegExp(`--container-${name}:\\s*(\\d+)px`));
    if (!match) throw new Error(`--container-${name} is missing from tokens.css, or is not in px`);
    return Number(match[1]);
  };

  it('declares the same three thresholds the Band type switches on', () => {
    expect(tokenPx('compact')).toBe(BAND_NARROW);
    expect(tokenPx('wide')).toBe(BAND_WIDE);
    expect(tokenPx('inline')).toBe(BAND_INLINE);
  });

  it('keeps the thresholds in px, because ResizeObserver reports px', () => {
    // rem would resolve against the ROOT font size, so a host with
    // `html { font-size: 18px }` would move the CSS boundary and leave the JS
    // one where it was.
    for (const name of ['compact', 'wide', 'inline']) {
      expect(css).toMatch(new RegExp(`--container-${name}:\\s*\\d+px`));
    }
  });
});

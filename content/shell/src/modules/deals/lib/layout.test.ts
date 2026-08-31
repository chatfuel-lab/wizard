import { describe, expect, it } from 'vitest';
import { effectiveDensity, isNarrow, panelHost } from './layout';

// bandFor's own cases live in content/ui/src/lib/layout.test.ts now, together
// with the assertion that its thresholds match the --container-* tokens.

describe('isNarrow', () => {
  it('covers BOTH bands below the board minimum', () => {
    // The reason this function exists. Deals used to ask `band === 'narrow'`
    // when narrow was the smallest band; with 'compact' below it, that test
    // would silently start answering false on phones.
    expect(isNarrow('compact')).toBe(true);
    expect(isNarrow('narrow')).toBe(true);
    expect(isNarrow('wide')).toBe(false);
    expect(isNarrow('inline')).toBe(false);
  });
});

describe('effectiveDensity', () => {
  it('forces compact below the board minimum and otherwise honours the request', () => {
    expect(effectiveDensity('compact', 'comfortable')).toBe('compact');
    expect(effectiveDensity('narrow', 'comfortable')).toBe('compact');
    expect(effectiveDensity('narrow', 'compact')).toBe('compact');
    expect(effectiveDensity('wide', 'comfortable')).toBe('comfortable');
    expect(effectiveDensity('inline', 'comfortable')).toBe('comfortable');
  });
});

describe('panelHost', () => {
  it('only goes inline in the widest band', () => {
    expect(panelHost('compact')).toBe('drawer');
    expect(panelHost('narrow')).toBe('drawer');
    expect(panelHost('wide')).toBe('drawer');
    expect(panelHost('inline')).toBe('inline');
  });
});

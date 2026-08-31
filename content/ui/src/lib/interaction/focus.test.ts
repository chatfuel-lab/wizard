import { describe, expect, it } from 'vitest';
import { nextTabbableIndex, TABBABLE_SELECTOR } from './focus';

describe('nextTabbableIndex', () => {
  it('advances forward and wraps past the end', () => {
    expect(nextTabbableIndex(3, 0, false)).toBe(1);
    expect(nextTabbableIndex(3, 2, false)).toBe(0);
  });

  it('advances backward and wraps past the start', () => {
    expect(nextTabbableIndex(3, 2, true)).toBe(1);
    expect(nextTabbableIndex(3, 0, true)).toBe(2);
  });

  it('enters at the first element on Tab when focus was outside', () => {
    expect(nextTabbableIndex(3, -1, false)).toBe(0);
  });

  it('enters at the last element on Shift+Tab when focus was outside', () => {
    expect(nextTabbableIndex(3, -1, true)).toBe(2);
  });

  it('stays on the only element', () => {
    expect(nextTabbableIndex(1, 0, false)).toBe(0);
    expect(nextTabbableIndex(1, 0, true)).toBe(0);
  });

  it('reports -1 when there is nothing tabbable', () => {
    expect(nextTabbableIndex(0, -1, false)).toBe(-1);
    expect(nextTabbableIndex(0, 0, true)).toBe(-1);
  });
});

describe('TABBABLE_SELECTOR', () => {
  it('excludes tabindex="-1" so a focusable container is not a Tab stop', () => {
    expect(TABBABLE_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])');
  });

  it('excludes disabled controls and hidden inputs', () => {
    expect(TABBABLE_SELECTOR).toContain('button:not([disabled])');
    expect(TABBABLE_SELECTOR).toContain(':not([type="hidden"])');
  });
});

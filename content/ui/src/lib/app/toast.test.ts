import { describe, expect, it } from 'vitest';
import { MAX_TOASTS, initialToastState, toastReducer, type Toast, type ToastState } from './toast';

const toast = (id: string, overrides?: Partial<Toast>): Toast => ({
  id,
  title: id,
  tone: 'info',
  duration: 4000,
  ...overrides,
});

const show = (state: ToastState, ...toasts: Toast[]): ToastState =>
  toasts.reduce((acc, next) => toastReducer(acc, { type: 'show', toast: next }), state);

const ids = (state: ToastState) => state.toasts.map((each) => each.id);

describe('toastReducer — showing', () => {
  it('appends, oldest first', () => {
    expect(ids(show(initialToastState, toast('a'), toast('b')))).toEqual(['a', 'b']);
  });

  it('replaces in place when the id repeats, instead of stacking duplicates', () => {
    const state = show(initialToastState, toast('a'), toast('b'), toast('a', { title: 'again' }));
    expect(ids(state)).toEqual(['a', 'b']);
    expect(state.toasts[0]!.title).toBe('again');
  });
});

describe('toastReducer — the cap', () => {
  it('never exceeds MAX_TOASTS, dropping the oldest', () => {
    const many = Array.from({ length: MAX_TOASTS + 2 }, (_, i) => toast(`t${i}`));
    const state = show(initialToastState, ...many);
    expect(state.toasts).toHaveLength(MAX_TOASTS);
    expect(ids(state)).toEqual(['t2', 't3', 't4', 't5']);
  });

  it('evicts an auto-dismissing toast before a sticky one', () => {
    const sticky = toast('error', { duration: 0, tone: 'danger' });
    const many = Array.from({ length: MAX_TOASTS }, (_, i) => toast(`t${i}`));
    const state = show(initialToastState, sticky, ...many);
    expect(ids(state)).toContain('error');
    expect(ids(state)).toEqual(['error', 't1', 't2', 't3']);
  });

  it('falls back to the oldest when every toast is sticky', () => {
    const many = Array.from({ length: MAX_TOASTS + 1 }, (_, i) => toast(`t${i}`, { duration: 0 }));
    const state = show(initialToastState, ...many);
    expect(ids(state)).toEqual(['t1', 't2', 't3', 't4']);
  });
});

describe('toastReducer — dismissing', () => {
  it('removes by id', () => {
    const state = toastReducer(show(initialToastState, toast('a'), toast('b')), {
      type: 'dismiss',
      id: 'a',
    });
    expect(ids(state)).toEqual(['b']);
  });

  it('returns the same object for an unknown id, so nothing re-renders', () => {
    const before = show(initialToastState, toast('a'));
    expect(toastReducer(before, { type: 'dismiss', id: 'zz' })).toBe(before);
  });

  it('clears everything, and is a no-op when already empty', () => {
    const before = show(initialToastState, toast('a'), toast('b'));
    expect(toastReducer(before, { type: 'clear' }).toasts).toEqual([]);
    expect(toastReducer(initialToastState, { type: 'clear' })).toBe(initialToastState);
  });
});

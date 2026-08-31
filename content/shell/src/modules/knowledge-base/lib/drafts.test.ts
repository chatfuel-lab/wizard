import { describe, expect, it, vi } from 'vitest';
import { createDraftRegistry, draftKey, reconcileDraft, type DraftHandle } from './drafts';

const handle = (key: string, over: Partial<DraftHandle> = {}): DraftHandle => ({
  key,
  source: 'faq',
  dirty: true,
  save: async () => {},
  discard: () => {},
  ...over,
});

describe('createDraftRegistry', () => {
  it('counts only dirty handles', () => {
    const registry = createDraftRegistry();
    registry.register(handle('a'));
    registry.register(handle('b', { dirty: false }));
    expect(registry.dirtyCount()).toBe(1);
    expect(registry.dirtyKeys()).toEqual(['a']);
  });

  it('scopes dirty handles to a source', () => {
    const registry = createDraftRegistry();
    registry.register(handle('a', { source: 'faq' }));
    registry.register(handle('b', { source: 'products' }));
    expect(registry.dirtyOn('faq')).toEqual(['a']);
    expect(registry.dirtyOn('products')).toEqual(['b']);
    expect(registry.dirtyOn('profile')).toEqual([]);
  });

  it('unregisters only its own handle, so a remount does not delete the new one', () => {
    const registry = createDraftRegistry();
    const dispose = registry.register(handle('a'));
    registry.register(handle('a')); // remount: same key, new object
    dispose(); // the OLD handle's cleanup runs after
    expect(registry.dirtyCount()).toBe(1);
  });

  it('saves sequentially and reports what failed', async () => {
    const order: string[] = [];
    const registry = createDraftRegistry();
    registry.register(handle('a', { save: async () => void order.push('a') }));
    registry.register(
      handle('b', {
        save: async () => {
          order.push('b');
          throw new Error('nope');
        },
      }),
    );
    registry.register(handle('c', { save: async () => void order.push('c') }));
    const result = await registry.saveAll();
    expect(order).toEqual(['a', 'b', 'c']);
    expect(result.saved).toEqual(['a', 'c']);
    expect(result.failed).toEqual(['b']);
  });

  it('discards every dirty draft', () => {
    const discard = vi.fn();
    const registry = createDraftRegistry();
    registry.register(handle('a', { discard }));
    registry.discardAll();
    expect(discard).toHaveBeenCalledOnce();
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    const registry = createDraftRegistry();
    const listener = vi.fn();
    const off = registry.subscribe(listener);
    registry.touch();
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    registry.touch();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keys a draft by source and name', () => {
    expect(draftKey('instructions', 'prompt')).toBe('instructions:prompt');
  });
});

describe('reconcileDraft', () => {
  it('adopts a server change nobody is editing', () => {
    expect(reconcileDraft(false, 'v2', 'v1')).toBe('adopt');
  });

  it('keeps a clean draft when nothing moved', () => {
    expect(reconcileDraft(false, 'v1', 'v1')).toBe('keep');
  });

  it('keeps typing when the server did not move', () => {
    expect(reconcileDraft(true, 'v1', 'v1')).toBe('keep');
  });

  it('raises a conflict when both moved', () => {
    expect(reconcileDraft(true, 'v2', 'v1')).toBe('conflict');
  });
});

import { describe, expect, it } from 'vitest';
import { createDraftRegistry, draftKey, reconcileDraft, type DraftHandle } from './drafts';

const handle = (key: string, dirty: boolean, onSave?: () => Promise<void>): DraftHandle & { discarded: number } => {
  const h = {
    key,
    automationId: key.split(':')[0]!,
    typename: key.split(':')[1]!,
    dirty,
    discarded: 0,
    save: onSave ?? (async () => undefined),
    discard: () => {
      h.discarded += 1;
      h.dirty = false;
    },
  };
  return h;
};

describe('draft registry', () => {
  it('counts dirty drafts, saves them all sequentially, discards, filters by automation', async () => {
    const reg = createDraftRegistry();
    const order: string[] = [];
    const a = handle('a1:FuelySettingKeywords', true, async () => void order.push('a'));
    const b = handle('a1:FuelySettingIncomingMessages', false);
    const c = handle('a2:FuelySettingRefLinks', true, async () => void order.push('c'));
    const off = reg.register(a);
    reg.register(b);
    reg.register(c);
    expect(reg.dirtyCount()).toBe(2);
    expect(reg.dirtyOn('a1')).toEqual(['a1:FuelySettingKeywords']);
    const result = await reg.saveAll();
    expect(result.saved).toEqual(['a1:FuelySettingKeywords', 'a2:FuelySettingRefLinks']);
    expect(order).toEqual(['a', 'c']);
    off();
    expect(reg.dirtyCount()).toBe(1);
    reg.discardAll();
    expect(c.discarded).toBe(1);
    expect(reg.dirtyCount()).toBe(0);
  });
  it('a failing save is reported, the rest still run; listeners fire on register/unregister/touch', async () => {
    const reg = createDraftRegistry();
    let ticks = 0;
    const off = reg.subscribe(() => void (ticks += 1));
    const bad = handle('x:FuelySettingKeywords', true, async () => {
      throw new Error('nope');
    });
    const good = handle('y:FuelySettingKeywords', true);
    const un = reg.register(bad);
    reg.register(good);
    const result = await reg.saveAll();
    expect(result.failed).toEqual(['x:FuelySettingKeywords']);
    expect(result.saved).toEqual(['y:FuelySettingKeywords']);
    reg.touch();
    un();
    expect(ticks).toBe(4);
    off();
    expect(draftKey('a', 'B')).toBe('a:B');
  });
});

describe('reconcileDraft', () => {
  it('adopts a server change when clean, keeps when nothing moved, conflicts when dirty and moved', () => {
    expect(reconcileDraft(false, 'v2', 'v1')).toBe('adopt');
    expect(reconcileDraft(false, 'v1', 'v1')).toBe('keep');
    expect(reconcileDraft(true, 'v1', 'v1')).toBe('keep');
    expect(reconcileDraft(true, 'v2', 'v1')).toBe('conflict');
  });
});

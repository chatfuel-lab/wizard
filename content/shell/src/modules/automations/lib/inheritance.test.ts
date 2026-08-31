import { describe, expect, it } from 'vitest';
import { AUTOMATIONS } from './samples';
import { customizedCount, inheritanceOptions, inheritanceState, resolvedDiff, revertTarget } from './inheritance';
import type { AutomationRecord } from '../types';

const map = () =>
  Object.fromEntries(
    [...AUTOMATIONS.entries()].map(([id, a]) => [id, structuredClone(a) as unknown as AutomationRecord]),
  );

describe('inheritanceState', () => {
  it('reads follows / own / fixed off the setting alone', () => {
    const m = map();
    const all = m['auto-all-base']!;
    for (const s of all.settings) expect(inheritanceState(s)).toBe('fixed');
    const spring = m['rule-spring-posts']!;
    const kw = spring.settings.find((s) => s.__typename === 'FuelySettingKeywords')!;
    expect(inheritanceState(kw)).toBe('fixed');
    const pub = spring.settings.find((s) => s.__typename === 'FuelySettingPublicReply')!;
    expect(inheritanceState(pub)).toBe('follows');
    const im = spring.settings.find((s) => s.__typename === 'FuelySettingIncomingMessages')!;
    expect(inheritanceState(im)).toBe('own');
  });
});

describe('inheritanceOptions / revertTarget', () => {
  it('offers the parents other than the current one, and reverts to the nearer base', () => {
    const m = map();
    const spring = m['rule-spring-posts']!;
    const im = spring.settings.find((s) => s.__typename === 'FuelySettingIncomingMessages')!;
    expect(
      inheritanceOptions(im)
        .map((r) => r.scope)
        .sort(),
    ).toEqual(['All', 'InstagramPostComments']);
    expect(revertTarget(im, spring.scope)?.scope).toBe('InstagramPostComments');
    const pub = spring.settings.find((s) => s.__typename === 'FuelySettingPublicReply')!;
    expect(inheritanceOptions(pub)).toEqual([]);
    const kw = spring.settings.find((s) => s.__typename === 'FuelySettingKeywords')!;
    expect(revertTarget(kw, spring.scope)).toBeNull();
  });
});

describe('resolvedDiff / customizedCount', () => {
  it('tells owned-and-different from owned-but-equal and from following', () => {
    const m = map();
    const igDm = m['auto-InstagramDirectMessages-base']!;
    const diff = resolvedDiff(igDm, m);
    const by = Object.fromEntries(diff.map((d) => [d.typename, d]));
    expect(by.FuelySettingWhenAIReplies).toMatchObject({
      state: 'own',
      differsFromParent: true,
      parentKnown: true,
    });
    expect(by.FuelySettingMessageDelays).toMatchObject({
      state: 'own',
      differsFromParent: false,
      parentKnown: true,
    });
    expect(by.FuelySettingBookingRules).toMatchObject({ state: 'follows', differsFromParent: false });
    // Owned settings, minus the one holding the parent's own value: the scope
    // header renders that one "same as Default", so the badge does not send
    // the reader to it.
    const owned = diff.filter((d) => d.state === 'own').length;
    expect(owned).toBe(3);
    expect(customizedCount(igDm, m)).toBe(2);
  });
  it('treats a parent that is not loaded as not different', () => {
    const m = map();
    const igDm = m['auto-InstagramDirectMessages-base']!;
    const diff = resolvedDiff(igDm, {});
    expect(diff.every((d) => d.differsFromParent === false)).toBe(true);
    expect(diff.every((d) => d.parentKnown === false)).toBe(true);
  });
  it('counts an owned setting whose parent is not loaded — nothing said they agree', () => {
    const m = map();
    const igDm = m['auto-InstagramDirectMessages-base']!;
    expect(customizedCount(igDm, {})).toBe(3);
  });
});

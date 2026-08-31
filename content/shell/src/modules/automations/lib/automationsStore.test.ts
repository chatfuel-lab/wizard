import { describe, expect, it } from 'vitest';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { AUTOMATIONS } from './samples';
import {
  automationsReducer,
  initialAutomationsState,
  isInitialLoad,
  isSaving,
  saveKey,
  selectAllBase,
  selectBase,
  selectByScope,
  selectCustoms,
  selectCustomsCount,
  selectScopeStatus,
  type AutomationsState,
} from './automationsStore';
import type { AutomationRecord } from '../types';

const all = () => [...AUTOMATIONS.values()].map((a) => structuredClone(a) as unknown as AutomationRecord);
const loaded = (): AutomationsState => {
  let s = automationsReducer(initialAutomationsState(), { type: 'reset' });
  s = automationsReducer(s, { type: 'loaded', epoch: s.epoch, automations: all(), isMigrated: true });
  return s;
};

describe('load / epoch', () => {
  it('reset bumps the epoch and IS the request; a stale load is dropped', () => {
    let s = automationsReducer(initialAutomationsState(), { type: 'reset' });
    expect(s.epoch).toBe(1);
    expect(isInitialLoad(s)).toBe(true);
    s = automationsReducer(s, { type: 'reset' });
    expect(s.epoch).toBe(2);
    const stale = automationsReducer(s, { type: 'loaded', epoch: 1, automations: all(), isMigrated: true });
    expect(stale).toBe(s);
    s = automationsReducer(s, { type: 'loaded', epoch: 2, automations: all(), isMigrated: true });
    expect(Object.keys(s.byId).length).toBe(AUTOMATIONS.size);
    expect(s.loaded).toBe(true);
    expect(isInitialLoad(s)).toBe(false);
  });
  it('a live event is dropped while loading, kept otherwise', () => {
    let s = loaded();
    const rec = { ...s.byId['rule-spring-posts']!, name: 'Live rename' };
    s = automationsReducer(s, { type: 'live', automation: rec, origin: 'live' });
    expect(s.byId['rule-spring-posts']!.name).toBe('Live rename');
    s = automationsReducer(s, { type: 'reset' });
    const during = automationsReducer(s, { type: 'live', automation: { ...rec, name: 'Dropped' }, origin: 'live' });
    expect(during.byId['rule-spring-posts']!.name).toBe('Live rename');
  });
});

describe('optimistic enabled / name', () => {
  it('editStarted applies, editFailed rolls back and flashes, keeps the FIRST prev', () => {
    let s = loaded();
    const rec = s.byId['rule-spring-posts']!;
    s = automationsReducer(s, { type: 'editStarted', id: rec.id, next: { ...rec, enabled: false } });
    expect(s.byId[rec.id]!.enabled).toBe(false);
    s = automationsReducer(s, { type: 'editStarted', id: rec.id, next: { ...rec, enabled: false, name: 'X' } });
    expect(s.pending[rec.id]!.prev.enabled).toBe(true);
    s = automationsReducer(s, { type: 'editFailed', id: rec.id, now: 5 });
    expect(s.byId[rec.id]!.enabled).toBe(true);
    expect(s.byId[rec.id]!.name).toBe(rec.name);
    expect(s.flash[rec.id]).toBe(5);
    s = automationsReducer(s, { type: 'flashCleared', id: rec.id });
    expect(s.flash[rec.id]).toBeUndefined();
  });
  it('a live echo during a pending edit keeps the optimistic fields', () => {
    let s = loaded();
    const rec = s.byId['rule-spring-posts']!;
    s = automationsReducer(s, { type: 'editStarted', id: rec.id, next: { ...rec, enabled: false } });
    s = automationsReducer(s, {
      type: 'live',
      automation: { ...rec, enabled: true, updatedAt: 'later' },
      origin: 'live',
    });
    expect(s.byId[rec.id]!.enabled).toBe(false);
    expect(s.byId[rec.id]!.updatedAt).toBe('later');
    s = automationsReducer(s, { type: 'editSucceeded', id: rec.id, automation: { ...rec, enabled: false } });
    expect(s.pending[rec.id]).toBeUndefined();
  });
});

describe('scopeReplaced / removed / saving', () => {
  it('scopeReplaced drops what the scope list no longer carries and nothing else', () => {
    let s = loaded();
    const scope = FuelyAutomationScope.InstagramPostComments;
    const before = selectByScope(s, scope);
    const keep = before.filter((a) => a.isBase);
    s = automationsReducer(s, { type: 'scopeReplaced', scope, automations: keep });
    expect(selectCustoms(s, scope)).toEqual([]);
    expect(s.byId['rule-lead-ads']).toBeDefined();
  });
  it('removed / saving keys', () => {
    let s = loaded();
    s = automationsReducer(s, { type: 'removed', id: 'rule-bio-link' });
    expect(s.byId['rule-bio-link']).toBeUndefined();
    const key = saveKey('rule-lead-ads', 'FuelySettingKeywords');
    s = automationsReducer(s, { type: 'saveStarted', key });
    expect(isSaving(s, 'rule-lead-ads', 'FuelySettingKeywords')).toBe(true);
    s = automationsReducer(s, { type: 'saveSettled', key });
    expect(isSaving(s, 'rule-lead-ads', 'FuelySettingKeywords')).toBe(false);
  });
});

describe('selectors', () => {
  it('base first then customs by name; counts; statuses; the All base', () => {
    const s = loaded();
    const ig = selectByScope(s, FuelyAutomationScope.InstagramPostComments);
    expect(ig[0]!.isBase).toBe(true);
    expect(selectBase(s, FuelyAutomationScope.InstagramPostComments)!.id).toBe('auto-InstagramPostComments-base');
    expect(selectAllBase(s)!.scope).toBe('All');
    expect(selectScopeStatus(s, FuelyAutomationScope.TikTokDirectMessages)).toBe('off');
    expect(selectScopeStatus(s, FuelyAutomationScope.WhatsAppDirectMessages)).toBe('on');
    const counts = selectCustomsCount(s);
    expect(counts.WhatsAppClickFromAds).toBe(2);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(8);
  });
});

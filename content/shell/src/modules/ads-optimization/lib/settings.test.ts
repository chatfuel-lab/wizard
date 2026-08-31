import { describe, expect, it } from 'vitest';
import { FuelyAutomationScope } from '~api/generated/ads-optimization/graphql';
import type { EventSet } from '../types';
import { defaultSetId, orderSets, toView } from './settings';

const set = (id: string, isBase: boolean, name: string | null, settings: EventSet['settings'] = []): EventSet => ({
  __typename: 'FuelyAutomation',
  id,
  isBase,
  name,
  enabled: true,
  scope: FuelyAutomationScope.WhatsAppClickFromAds,
  updatedAt: '2026-08-21T00:00:00.000Z',
  settings,
});

describe('toView', () => {
  it('has no ad list on the set that carries none', () => {
    // The API strips filter settings from a base automation, and that absence
    // is what makes the default set "every ad" rather than "no ads".
    expect(toView(set('base', true, null)).ads).toBeNull();
  });

  it('carries where a value comes from, not just the value', () => {
    const parent = {
      __typename: 'FuelyAutomation' as const,
      id: 'base',
      isBase: true,
      name: null,
      enabled: true,
      scope: FuelyAutomationScope.WhatsAppClickFromAds,
    };
    const view = toView(
      set('spring', false, 'Spring', [
        { __typename: 'FuelySettingListOfAds', adIDs: ['1'], inheritsFrom: parent, canInheritFrom: [parent] },
      ] as EventSet['settings']),
    );
    expect(view.ads).toEqual({ value: ['1'], inheritsFrom: parent, canInheritFrom: [parent] });
  });

  it('ignores the settings other surfaces own', () => {
    const view = toView(
      set('spring', false, 'Spring', [
        { __typename: 'FuelySettingMessageDelays', inheritsFrom: null, canInheritFrom: [] },
      ] as EventSet['settings']),
    );
    expect(view.ads).toBeNull();
    expect(view.events).toBeNull();
  });
});

describe('orderSets', () => {
  it('puts the default first and the rest by name', () => {
    const ordered = orderSets([set('b', false, 'Retargeting'), set('a', false, 'Lookalike'), set('base', true, null)]);
    expect(ordered.map((entry) => entry.id)).toEqual(['base', 'a', 'b']);
  });

  it('opens on the default set', () => {
    expect(defaultSetId([set('a', false, 'Lookalike'), set('base', true, null)])).toBe('base');
    expect(defaultSetId([])).toBeNull();
  });
});

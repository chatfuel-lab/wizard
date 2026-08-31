import { describe, expect, it } from 'vitest';
import { AUTOMATIONS } from './samples';
import {
  INHERITABLE,
  KNOWN_SETTINGS,
  isFilterSetting,
  isKnownSetting,
  sameUpdate,
  sameValue,
  settingOf,
  settingUpdateInput,
  valueKey,
} from './settingValue';
import type { AutomationRecord, SettingInfo } from '../types';

const record = (id: string) => structuredClone(AUTOMATIONS.get(id)) as unknown as AutomationRecord;

describe('settingUpdateInput', () => {
  it('produces the write shape for every known setting in the corpus', () => {
    for (const a of AUTOMATIONS.values()) {
      for (const s of a.settings as unknown as SettingInfo[]) {
        const input = settingUpdateInput(s);
        if (!isKnownSetting(s.__typename)) {
          expect(input).toBeNull();
          continue;
        }
        expect(input?.type).toBe(s.__typename);
      }
    }
  });

  it('maps the four read→write transforms', () => {
    const spring = record('rule-spring-posts');
    const posts = settingUpdateInput(settingOf(spring.settings, 'FuelySettingListOfPosts')!);
    expect(posts).toEqual({ type: 'FuelySettingListOfPosts', update: { postIDs: ['ig-media-1', 'ig-media-2'] } });
    const stories = settingUpdateInput(settingOf(record('rule-story-polls').settings, 'FuelySettingListOfStories')!);
    expect(stories?.update).toEqual({ storyIDs: ['ig-media-3', 'ig-media-7'] });
    const sth = settingUpdateInput(settingOf(record('auto-all-base').settings, 'FuelySettingSwitchToHuman')!);
    expect(sth?.type).toBe('FuelySettingSwitchToHuman');
    if (sth?.type === 'FuelySettingSwitchToHuman') {
      expect(sth.update.rules[0]?.assignees).toEqual([{ userID: 'u-nora' }, { userID: 'u-sam' }]);
      expect(sth.update.rules[2]?.assignees).toEqual([]);
    }
    const cci = settingUpdateInput(settingOf(record('auto-all-base').settings, 'FuelySettingCollectContactInfo')!);
    if (cci?.type === 'FuelySettingCollectContactInfo') {
      expect(cci.update.captures[0]).toEqual({
        description: 'Which treatment they are interested in',
        name: 'treatment_interest',
      });
    }
  });
});

describe('sameValue / sameUpdate / valueKey', () => {
  it('ignores inheritance metadata and key order', () => {
    const a = settingOf(record('auto-all-base').settings, 'FuelySettingWhenAIReplies')!;
    const b = {
      ...a,
      inheritsFrom: { __typename: 'FuelyAutomation', id: 'x', isBase: true, name: null, enabled: true, scope: 'All' },
    } as SettingInfo;
    expect(sameValue(a, b)).toBe(true);
    expect(sameUpdate({ option: 'Always' } as never, { option: 'Always' } as never)).toBe(true);
    expect(
      sameUpdate(
        { howToReply: 'UsingAI', messagePrompt: 'x' } as never,
        { messagePrompt: 'x', howToReply: 'UsingAI' } as never,
      ),
    ).toBe(true);
    expect(
      sameUpdate(
        { keywords: ['a', 'b'], reactTo: 'AnyComment' } as never,
        { keywords: ['b', 'a'], reactTo: 'AnyComment' } as never,
      ),
    ).toBe(false);
  });
  it('keys an unknown typename without throwing', () => {
    expect(
      valueKey({
        __typename: 'FuelySettingSendEventsToMeta',
        inheritsFrom: null,
        canInheritFrom: [],
      } as unknown as SettingInfo),
    ).toContain('unknown');
  });
});

describe('sets', () => {
  it('splits the 15 known settings into 10 inheritable + 5 filters', () => {
    expect(INHERITABLE.size).toBe(10);
    expect(KNOWN_SETTINGS.size).toBe(15);
    expect([...KNOWN_SETTINGS].filter(isFilterSetting)).toHaveLength(5);
    expect(isKnownSetting('FuelySettingSendEventsToMeta')).toBe(false);
  });
});

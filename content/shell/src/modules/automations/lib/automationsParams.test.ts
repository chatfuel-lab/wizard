import { describe, expect, it } from 'vitest';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import {
  DEFAULT_PARAMS,
  parseAutomationsParams,
  settingKeyOf,
  typenameOfKey,
  writeAutomationsParams,
} from './automationsParams';

const parse = (query: string) => parseAutomationsParams(new URLSearchParams(query));
const write = (patch: Partial<typeof DEFAULT_PARAMS>, existing = '') =>
  writeAutomationsParams(new URLSearchParams(existing), { ...DEFAULT_PARAMS, ...patch }).toString();

describe('parseAutomationsParams', () => {
  it('defaults to the All scope with nothing focused', () => {
    expect(parse('')).toEqual(DEFAULT_PARAMS);
  });

  it('reads every key', () => {
    const p = parse('scope=WhatsAppClickFromAds&automation=a1&setting=keywords');
    expect(p).toEqual({ scope: 'WhatsAppClickFromAds', automation: 'a1', setting: 'keywords', new: null });
    expect(parse('new=InstagramStoryReplies').new).toBe('InstagramStoryReplies');
  });

  it('falls back silently on unknown values', () => {
    const p = parse('scope=Mars&setting=zzz&new=Venus&automation=');
    expect(p).toEqual(DEFAULT_PARAMS);
  });

  it('ignores the retired keys but still reads the ones it keeps', () => {
    const p = parse('view=rules&scope=InstagramPostComments&automation=abc&test=abc&mode=customer&q=x');
    expect(p).toEqual({
      scope: FuelyAutomationScope.InstagramPostComments,
      automation: 'abc',
      setting: null,
      new: null,
    });
  });
});

describe('writeAutomationsParams', () => {
  it('omits defaults', () => {
    expect(write({})).toBe('');
    expect(write({ scope: FuelyAutomationScope.All })).toBe('');
  });

  it('writes the four keys', () => {
    expect(
      write({
        scope: FuelyAutomationScope.InstagramPostComments,
        automation: 'a1',
        setting: 'keywords',
        new: FuelyAutomationScope.InstagramPostComments,
      }),
    ).toBe('scope=InstagramPostComments&automation=a1&setting=keywords&new=InstagramPostComments');
  });

  it('leaves foreign keys alone and drops the retired keys it owned', () => {
    expect(
      write(
        { scope: FuelyAutomationScope.TikTokPostComments },
        'foo=bar&view=rules&test=a1&q=price&scope=InstagramPostComments',
      ),
    ).toBe('foo=bar&scope=TikTokPostComments');
  });

  it('round-trips', () => {
    const query = 'scope=TikTokPostComments&automation=z9';
    expect(writeAutomationsParams(new URLSearchParams(), parse(query)).toString()).toBe(query);
  });
});

describe('setting keys', () => {
  it('maps typenames to keys and back', () => {
    expect(settingKeyOf('FuelySettingIncomingMessages')).toBe('incomingMessages');
    expect(settingKeyOf('FuelySettingWhenAIReplies')).toBe('whenAIReplies');
    expect(settingKeyOf('FuelySettingSendEventsToMeta')).toBeNull();
    expect(typenameOfKey('whenAIReplies')).toBe('FuelySettingWhenAIReplies');
    expect(typenameOfKey('listOfAds')).toBe('FuelySettingListOfAds');
  });
});

import { describe, expect, it } from 'vitest';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import {
  allowsCustomAutomations,
  baseLabel,
  COMMON_SETTINGS,
  extrasFor,
  FILTER_SETTINGS,
  filterSettingsFor,
  isCommentReplyScope,
  isFacebookScope,
  parseScope,
  platformOf,
  SCOPE_GROUPS,
  SCOPES,
  scopeLabel,
  settingRank,
} from './scopes';

describe('SCOPES', () => {
  it('lists all 18 scopes exactly once, All pinned first', () => {
    expect(SCOPES).toHaveLength(18);
    expect(new Set(SCOPES).size).toBe(18);
    expect(SCOPES[0]).toBe(FuelyAutomationScope.All);
    for (const scope of Object.values(FuelyAutomationScope)) {
      expect(SCOPES).toContain(scope);
    }
  });

  it('groups every non-All scope under a platform', () => {
    const grouped = SCOPE_GROUPS.flatMap((group) => group.scopes);
    expect(grouped).toHaveLength(17);
    expect(grouped).not.toContain(FuelyAutomationScope.All);
    expect(platformOf(FuelyAutomationScope.All)).toBeNull();
    expect(platformOf(FuelyAutomationScope.TikTokPostComments)).toBe('TikTok');
  });
});

describe('extras table (guide.md)', () => {
  it('matches the per-scope extras', () => {
    expect(extrasFor(FuelyAutomationScope.InstagramPostComments)).toEqual([
      'FuelySettingPrivateReply',
      'FuelySettingPublicReply',
      'FuelySettingKeywords',
      'FuelySettingListOfPosts',
    ]);
    expect(extrasFor(FuelyAutomationScope.InstagramAdComments)).toContain('FuelySettingListOfAds');
    expect(extrasFor(FuelyAutomationScope.TikTokPostComments)).toEqual([
      'FuelySettingPublicReply',
      'FuelySettingKeywords',
    ]);
    expect(extrasFor(FuelyAutomationScope.InstagramStoryReplies)).toEqual([
      'FuelySettingKeywords',
      'FuelySettingListOfStories',
    ]);
    expect(extrasFor(FuelyAutomationScope.FacebookMMeLinks)).toEqual(['FuelySettingRefLinks']);
    expect(extrasFor(FuelyAutomationScope.TikTokClickFromAds)).toEqual(['FuelySettingKeywords']);
    expect(extrasFor(FuelyAutomationScope.WebWidgetDirectMessage)).toEqual([]);
  });

  it('allows customs exactly in the 11 scopes owning a filter setting', () => {
    const customScopes = SCOPES.filter(allowsCustomAutomations);
    expect(customScopes.sort()).toEqual(
      [
        FuelyAutomationScope.InstagramPostComments,
        FuelyAutomationScope.FacebookPostComments,
        FuelyAutomationScope.InstagramAdComments,
        FuelyAutomationScope.TikTokPostComments,
        FuelyAutomationScope.InstagramClickFromAds,
        FuelyAutomationScope.WhatsAppClickFromAds,
        FuelyAutomationScope.FacebookClickFromAds,
        FuelyAutomationScope.InstagramStoryReplies,
        FuelyAutomationScope.InstagramIgMeLinks,
        FuelyAutomationScope.FacebookMMeLinks,
        FuelyAutomationScope.TikTokClickFromAds,
      ].sort(),
    );
  });

  it('filterSettingsFor returns only filter settings', () => {
    for (const scope of SCOPES) {
      for (const typename of filterSettingsFor(scope)) {
        expect(FILTER_SETTINGS).toContain(typename);
      }
    }
    expect(filterSettingsFor(FuelyAutomationScope.InstagramPostComments)).toEqual([
      'FuelySettingKeywords',
      'FuelySettingListOfPosts',
    ]);
  });
});

describe('labels', () => {
  it('composes platform and short label', () => {
    expect(scopeLabel(FuelyAutomationScope.All)).toBe('All channels');
    expect(scopeLabel(FuelyAutomationScope.InstagramPostComments)).toBe('Instagram · Post comments');
    expect(baseLabel({ scope: FuelyAutomationScope.All })).toBe('All channels base');
    expect(baseLabel({ scope: FuelyAutomationScope.WhatsAppDirectMessages })).toBe('WhatsApp · Direct messages base');
  });
});

describe('scope predicates', () => {
  it('isCommentReplyScope covers exactly the four comment scopes', () => {
    expect(SCOPES.filter(isCommentReplyScope).sort()).toEqual(
      [
        FuelyAutomationScope.InstagramPostComments,
        FuelyAutomationScope.InstagramAdComments,
        FuelyAutomationScope.FacebookPostComments,
        FuelyAutomationScope.TikTokPostComments,
      ].sort(),
    );
  });

  it('isFacebookScope keys off the platform', () => {
    expect(isFacebookScope(FuelyAutomationScope.FacebookPostComments)).toBe(true);
    expect(isFacebookScope(FuelyAutomationScope.InstagramPostComments)).toBe(false);
  });
});

describe('settingRank', () => {
  it('orders common settings before replies before filters', () => {
    expect(settingRank(COMMON_SETTINGS[0]!)).toBe(0);
    expect(settingRank('FuelySettingPrivateReply')).toBeGreaterThan(settingRank('FuelySettingCollectContactInfo'));
    expect(settingRank('FuelySettingKeywords')).toBeGreaterThan(settingRank('FuelySettingPublicReply'));
  });
});

describe('parseScope', () => {
  it('accepts valid scope params and falls back to All', () => {
    expect(parseScope('TikTokPostComments')).toBe(FuelyAutomationScope.TikTokPostComments);
    expect(parseScope('nope')).toBe(FuelyAutomationScope.All);
    expect(parseScope(null)).toBe(FuelyAutomationScope.All);
  });
});

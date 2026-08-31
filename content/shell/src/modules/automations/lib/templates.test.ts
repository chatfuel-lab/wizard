import { describe, expect, it } from 'vitest';
import { FuelyAutomationScope, FuelySettingKeywordsReactTo } from '~api/generated/automations/graphql';
import { COMMON_SETTINGS, allowsCustomAutomations, extrasFor } from './scopes';
import { RULE_TEMPLATES, defaultRuleName, templateById, templateSettingTypes, templatesFor } from './templates';

describe('RULE_TEMPLATES', () => {
  it('has the six starters, unique ids, and only sources that accept rules', () => {
    expect(RULE_TEMPLATES.map((t) => t.id)).toEqual([
      'keyword-dm',
      'dm-post-commenters',
      'story-keyword',
      'campaign-link',
      'ctwa',
      'tiktok-viral',
    ]);
    expect(new Set(RULE_TEMPLATES.map((t) => t.id)).size).toBe(RULE_TEMPLATES.length);
    for (const template of RULE_TEMPLATES) {
      expect(template.title.trim()).not.toBe('');
      expect(template.description.trim()).not.toBe('');
      expect(template.scopes.length).toBeGreaterThan(0);
      for (const scope of template.scopes)
        expect(allowsCustomAutomations(scope), `${template.id} on ${scope}`).toBe(true);
    }
  });

  it('every template builds only settings its scopes carry', () => {
    for (const template of RULE_TEMPLATES) {
      for (const scope of template.scopes) {
        const allowed = new Set([...COMMON_SETTINGS, ...extrasFor(scope)]);
        for (const update of template.build(scope))
          expect(allowed.has(update.type), `${template.id} writes ${update.type} on ${scope}`).toBe(true);
      }
    }
  });

  it('never builds a non-Any keywords mode with an empty list, and never an empty non-empty-required text', () => {
    for (const template of RULE_TEMPLATES) {
      for (const scope of template.scopes) {
        for (const update of template.build(scope)) {
          if (update.type === 'FuelySettingKeywords') {
            if (update.update.reactTo !== FuelySettingKeywordsReactTo.AnyComment)
              expect(update.update.keywords.length, template.id).toBeGreaterThan(0);
            for (const k of update.update.keywords) expect(k.length).toBeLessThanOrEqual(50);
          }
          if (update.type === 'FuelySettingPublicReply' || update.type === 'FuelySettingPrivateReply') {
            // The setter requires both texts regardless of the reply mode.
            expect(update.update.exactTextReply.trim()).not.toBe('');
            expect(update.update.messagePrompt.trim()).not.toBe('');
            expect(update.update.exactTextReply.length).toBeLessThanOrEqual(1000);
            expect(update.update.messagePrompt.length).toBeLessThanOrEqual(3000);
          }
          if (update.type === 'FuelySettingPublicReply')
            expect(update.update.likeContactComment, 'like is Facebook-only; a template must not set it').toBe(false);
          if (update.type === 'FuelySettingFollowUps') expect(update.update.messagePrompt.trim()).not.toBe('');
          if (update.type === 'FuelySettingRefLinks') expect(update.update.refs.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('builds a rule that plans as one create plus its setting writes', () => {
    const template = templateById('keyword-dm')!;
    const updates = template.build(FuelyAutomationScope.InstagramPostComments);
    expect(updates.map((u) => u.type)).toEqual([
      'FuelySettingKeywords',
      'FuelySettingPublicReply',
      'FuelySettingPrivateReply',
    ]);
    expect(templateSettingTypes(template, FuelyAutomationScope.InstagramPostComments)).toEqual(
      updates.map((u) => u.type),
    );
    // a fresh array each time — the caller may mutate its copy
    expect(template.build(FuelyAutomationScope.InstagramPostComments)).not.toBe(updates);
  });

  it('templatesFor filters by scope; a scope without templates gets none', () => {
    expect(templatesFor(FuelyAutomationScope.InstagramPostComments).map((t) => t.id)).toEqual([
      'keyword-dm',
      'dm-post-commenters',
    ]);
    expect(templatesFor(FuelyAutomationScope.InstagramStoryReplies).map((t) => t.id)).toEqual(['story-keyword']);
    expect(templatesFor(FuelyAutomationScope.WhatsAppClickFromAds).map((t) => t.id)).toEqual(['ctwa']);
    expect(templatesFor(FuelyAutomationScope.FacebookMMeLinks).map((t) => t.id)).toEqual(['campaign-link']);
    expect(templatesFor(FuelyAutomationScope.TikTokPostComments).map((t) => t.id)).toEqual(['tiktok-viral']);
    expect(templatesFor(FuelyAutomationScope.InstagramClickFromAds)).toEqual([]);
    expect(templatesFor(FuelyAutomationScope.InstagramDirectMessages)).toEqual([]);
    expect(templateById('nope')).toBeNull();
  });

  it('names a new rule after its source', () => {
    expect(defaultRuleName(FuelyAutomationScope.InstagramPostComments)).toBe('New rule on Instagram post comments');
    expect(defaultRuleName(FuelyAutomationScope.WhatsAppClickFromAds)).toBe('New rule on WhatsApp click from ads');
    expect(defaultRuleName(FuelyAutomationScope.InstagramIgMeLinks)).toBe('New rule on Instagram ig.me links');
    expect(defaultRuleName(FuelyAutomationScope.All)).toBe('New rule on All channels');
  });
});

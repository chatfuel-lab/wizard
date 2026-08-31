import { describe, expect, it } from 'vitest';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { AutomationRecord } from '../types';
import { keywordNoun, listPreview, summarizeReplies, summarizeTriggers } from './ruleSummary';
import { AUTOMATIONS } from './samples';

const byId = (id: string): AutomationRecord => AUTOMATIONS.get(id) as unknown as AutomationRecord;

describe('listPreview', () => {
  it('shows the first two and counts the rest', () => {
    expect(listPreview(['price', 'cost', 'how much', 'book', 'appointment'])).toBe('price, cost + 3 more');
    expect(listPreview(['price', 'cost'])).toBe('price, cost');
    expect(listPreview(['bio', 'spring-consult'], 3)).toBe('bio, spring-consult');
    expect(listPreview([])).toBe('');
  });
});

describe('summarizeTriggers over the samples', () => {
  it("reads each sample rule in the product's words", () => {
    expect(summarizeTriggers(byId('rule-spring-posts'))).toBe('Comments containing price, cost + 3 more · 2 posts');
    expect(summarizeTriggers(byId('rule-lead-ads'))).toBe('Any comment · 3 ads');
    expect(summarizeTriggers(byId('rule-bio-link'))).toBe('Ref links: bio, spring-consult');
    expect(summarizeTriggers(byId('rule-story-polls'))).toBe('Story replies containing yes, me + 1 more · 2 stories');
    expect(summarizeTriggers(byId('rule-wa-ads'))).toBe('Any message · 1 ad');
    expect(summarizeTriggers(byId('rule-fb-old-promo'))).toBe('Comments containing promo · All posts');
  });

  it('says so when a non-Any mode has no keywords (the production 500)', () => {
    expect(summarizeTriggers(byId('rule-tiktok-viral'))).toBe('Comments exactly matching — no keywords yet');
  });

  it('a base (no filters) reads as every conversation', () => {
    expect(summarizeTriggers(byId('auto-InstagramPostComments-base'))).toBe('Every conversation on this source');
  });

  it('the noun follows the scope', () => {
    expect(keywordNoun(FuelyAutomationScope.InstagramPostComments).plural).toBe('Comments');
    expect(keywordNoun(FuelyAutomationScope.InstagramStoryReplies).plural).toBe('Story replies');
    expect(keywordNoun(FuelyAutomationScope.WhatsAppClickFromAds).singular).toBe('message');
  });
});

describe('summarizeReplies over the samples', () => {
  it('comment rules read public · private; others read the AI mode', () => {
    // spring: public follows the source base (ExactText), private owned UsingAI
    expect(summarizeReplies(byId('rule-spring-posts'))).toBe('Replies publicly with exact text · sends a DM with AI');
    expect(summarizeReplies(byId('rule-wa-ads'))).toBe('Replies with AI');
    expect(summarizeReplies(byId('rule-bio-link'))).toBe('Replies with AI');
    // The bases, which carry the AI mode and no reply setting of their own.
    expect(summarizeReplies(byId('auto-all-base'))).toBe('Replies with AI');
    expect(summarizeReplies(byId('auto-InstagramStoryReplies-base'))).toBe('Replies with AI');
  });

  it('never throws on a record with no reply settings at all', () => {
    const bare = { ...byId('rule-bio-link'), settings: [] } as AutomationRecord;
    expect(summarizeReplies(bare)).toBeNull();
    expect(summarizeTriggers(bare)).toBe('Every conversation on this source');
  });
});

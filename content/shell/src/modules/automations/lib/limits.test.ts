import { describe, expect, it } from 'vitest';
import {
  FuelyAutomationScope,
  FuelySettingCollectContactInfoHowToCollect,
  FuelySettingIncomingMessagesHowToReply,
  FuelySettingKeywordsReactTo,
  FuelySettingPrivateReplyHowToReply,
  FuelySettingPublicReplyHowToReply,
  FuelySettingSwitchToHumanHowToSwitch,
} from '~api/generated/automations/graphql';
import {
  integerInRange,
  KEYWORDS_EMPTY_MESSAGE,
  LIMITS,
  listWithin,
  requiredText,
  textLength,
  validateSettingUpdate,
} from './limits';

const ig = FuelyAutomationScope.InstagramPostComments;
const fb = FuelyAutomationScope.FacebookPostComments;
const dm = FuelyAutomationScope.WhatsAppDirectMessages;

describe('field helpers', () => {
  it('counts code points, not UTF-16 units', () => {
    expect(textLength('👍👍')).toBe(2);
  });
  it('requiredText: blank, then too long, then fine', () => {
    expect(requiredText('   ', 10, 'The prompt')).toBe('The prompt is required');
    expect(requiredText('a'.repeat(11), 10, 'The prompt')).toMatch(/over 10 characters \(11\)/);
    expect(requiredText('ok', 10, 'The prompt')).toBeNull();
  });
  it('integerInRange rejects decimals, words and out-of-range', () => {
    expect(integerInRange('2.5', 0, 10)).not.toBeNull();
    expect(integerInRange('ten', 0, 10)).not.toBeNull();
    expect(integerInRange(11, 0, 10)).not.toBeNull();
    expect(integerInRange(' 3 ', 0, 10)).toBeNull();
    expect(integerInRange(0, 0, 10)).toBeNull();
  });
  it('listWithin: count ceiling first, then per-item length', () => {
    expect(
      listWithin(
        Array.from({ length: 51 }, (_, i) => `k${i}`),
        50,
        50,
        'keyword',
      ),
    ).toMatch(/At most 50 keywords \(51 now\)/);
    expect(listWithin(['fine', 'x'.repeat(51)], 50, 50, 'keyword')).toMatch(/at most 50 characters/);
    expect(listWithin(['fine'], 50, 50, 'keyword')).toBeNull();
  });
});

describe('validateSettingUpdate', () => {
  it('blocks a non-Any keywords mode with zero keywords — the production 500', () => {
    expect(
      validateSettingUpdate(
        {
          type: 'FuelySettingKeywords',
          update: { reactTo: FuelySettingKeywordsReactTo.CommentThatExactlyMatches, keywords: [] },
        },
        ig,
      ),
    ).toBe(KEYWORDS_EMPTY_MESSAGE);
    expect(
      validateSettingUpdate(
        { type: 'FuelySettingKeywords', update: { reactTo: FuelySettingKeywordsReactTo.AnyComment, keywords: [] } },
        ig,
      ),
    ).toBeNull();
    expect(
      validateSettingUpdate(
        {
          type: 'FuelySettingKeywords',
          update: { reactTo: FuelySettingKeywordsReactTo.CommentThatContains, keywords: ['price'] },
        },
        ig,
      ),
    ).toBeNull();
  });
  it('locks AI instructions to "using AI" outside comment scopes and requires the prompt', () => {
    expect(
      validateSettingUpdate(
        {
          type: 'FuelySettingIncomingMessages',
          update: { howToReply: FuelySettingIncomingMessagesHowToReply.DontReply, messagePrompt: 'x' },
        },
        dm,
      ),
    ).toMatch(/comment sources/);
    expect(
      validateSettingUpdate(
        {
          type: 'FuelySettingIncomingMessages',
          update: { howToReply: FuelySettingIncomingMessagesHowToReply.DontReply, messagePrompt: 'x' },
        },
        ig,
      ),
    ).toBeNull();
    expect(
      validateSettingUpdate(
        {
          type: 'FuelySettingIncomingMessages',
          update: { howToReply: FuelySettingIncomingMessagesHowToReply.UsingAi, messagePrompt: '' },
        },
        dm,
      ),
    ).toMatch(/required/);
    expect(
      validateSettingUpdate(
        {
          type: 'FuelySettingIncomingMessages',
          update: {
            howToReply: FuelySettingIncomingMessagesHowToReply.UsingAi,
            messagePrompt: 'a'.repeat(LIMITS.prompt + 1),
          },
        },
        dm,
      ),
    ).toMatch(/over 5,000/);
  });
  it('checks hand-off rules: count, both texts, both limits', () => {
    const rule = { switchingConditions: 'asks for a human', messagePrompt: 'say a teammate will reply' };
    expect(
      validateSettingUpdate(
        {
          type: 'FuelySettingSwitchToHuman',
          update: {
            howToSwitch: FuelySettingSwitchToHumanHowToSwitch.SwitchToTeammates,
            rules: Array.from({ length: 21 }, () => rule),
          },
        },
        dm,
      ),
    ).toMatch(/At most 20 rules/);
    expect(
      validateSettingUpdate(
        {
          type: 'FuelySettingSwitchToHuman',
          update: {
            howToSwitch: FuelySettingSwitchToHumanHowToSwitch.SwitchToTeammates,
            rules: [{ ...rule, switchingConditions: '' }],
          },
        },
        dm,
      ),
    ).toMatch(/Rule 1: the “When…” text is required/);
    expect(
      validateSettingUpdate(
        {
          type: 'FuelySettingSwitchToHuman',
          update: {
            howToSwitch: FuelySettingSwitchToHumanHowToSwitch.SwitchToTeammates,
            rules: [{ ...rule, messagePrompt: 'x'.repeat(3001) }],
          },
        },
        dm,
      ),
    ).toMatch(/Rule 1: the hand-off instructions is over 3,000/);
    expect(
      validateSettingUpdate(
        {
          type: 'FuelySettingSwitchToHuman',
          update: { howToSwitch: FuelySettingSwitchToHumanHowToSwitch.SwitchToTeammates, rules: [rule] },
        },
        dm,
      ),
    ).toBeNull();
  });
  it('checks captures: count, attribute, description, duplicates', () => {
    const cap = { name: 'budget', description: 'their budget' };
    const how = FuelySettingCollectContactInfoHowToCollect.CollectInfo;
    expect(
      validateSettingUpdate(
        {
          type: 'FuelySettingCollectContactInfo',
          update: { howToCollect: how, captures: Array.from({ length: 41 }, () => cap) },
        },
        dm,
      ),
    ).toMatch(/At most 40 captures/);
    expect(
      validateSettingUpdate(
        { type: 'FuelySettingCollectContactInfo', update: { howToCollect: how, captures: [{ ...cap, name: ' ' }] } },
        dm,
      ),
    ).toMatch(/pick or type an attribute/);
    expect(
      validateSettingUpdate(
        {
          type: 'FuelySettingCollectContactInfo',
          update: { howToCollect: how, captures: [{ ...cap, description: 'x'.repeat(451) }] },
        },
        dm,
      ),
    ).toMatch(/over 450/);
    expect(
      validateSettingUpdate(
        {
          type: 'FuelySettingCollectContactInfo',
          update: { howToCollect: how, captures: [cap, { ...cap, name: 'Budget' }] },
        },
        dm,
      ),
    ).toMatch(/captured twice/);
    expect(
      validateSettingUpdate(
        { type: 'FuelySettingCollectContactInfo', update: { howToCollect: how, captures: [cap] } },
        dm,
      ),
    ).toBeNull();
  });
  it('requires both reply texts and allows liking only on Facebook', () => {
    const pub = {
      publicReplyHowToReply: FuelySettingPublicReplyHowToReply.UsingAi,
      exactTextReply: 'thanks',
      messagePrompt: 'reply',
      likeContactComment: false,
    };
    expect(
      validateSettingUpdate({ type: 'FuelySettingPublicReply', update: { ...pub, exactTextReply: '' } }, ig),
    ).toMatch(/exact reply text is required/);
    expect(
      validateSettingUpdate(
        { type: 'FuelySettingPublicReply', update: { ...pub, messagePrompt: 'x'.repeat(3001) } },
        ig,
      ),
    ).toMatch(/over 3,000/);
    expect(
      validateSettingUpdate({ type: 'FuelySettingPublicReply', update: { ...pub, likeContactComment: true } }, ig),
    ).toMatch(/only available on Facebook/);
    expect(
      validateSettingUpdate({ type: 'FuelySettingPublicReply', update: { ...pub, likeContactComment: true } }, fb),
    ).toBeNull();
    const priv = {
      privateReplyHowToReply: FuelySettingPrivateReplyHowToReply.ExactText,
      exactTextReply: 'x'.repeat(1001),
      messagePrompt: 'p',
    };
    expect(validateSettingUpdate({ type: 'FuelySettingPrivateReply', update: priv }, ig)).toMatch(/over 1,000/);
  });
  it('caps the lists at the live ceilings', () => {
    expect(
      validateSettingUpdate(
        { type: 'FuelySettingRefLinks', update: { refs: Array.from({ length: 21 }, (_, i) => `r${i}`) } },
        ig,
      ),
    ).toMatch(/At most 20 refs/);
    expect(validateSettingUpdate({ type: 'FuelySettingRefLinks', update: { refs: ['x'.repeat(101)] } }, ig)).toMatch(
      /at most 100 characters/,
    );
    expect(validateSettingUpdate({ type: 'FuelySettingListOfAds', update: { adIDs: ['x'.repeat(61)] } }, ig)).toMatch(
      /at most 60 characters/,
    );
    expect(
      validateSettingUpdate(
        { type: 'FuelySettingListOfPosts', update: { postIDs: Array.from({ length: 51 }, (_, i) => `p${i}`) } },
        ig,
      ),
    ).toMatch(/At most 50 post ids/);
    expect(validateSettingUpdate({ type: 'FuelySettingListOfStories', update: { storyIDs: [] } }, ig)).toBeNull();
    expect(
      validateSettingUpdate(
        { type: 'FuelySettingCatalogImages', update: { whenToShow: 'Never' as never, imagesPerCatalogItem: 11 } },
        ig,
      ),
    ).toMatch(/between 0 and 10/);
    expect(
      validateSettingUpdate(
        { type: 'FuelySettingFollowUps', update: { howToSend: 'Send' as never, messagePrompt: '' } },
        ig,
      ),
    ).toMatch(/follow-up prompt is required/);
  });
});

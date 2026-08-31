/**
 * The two lines under a rule's name: what fires it and how it replies.
 *
 *   "Comments containing price, cost + 3 more · 2 posts"
 *   "Any comment · 3 ads"
 *   "Ref links: bio, spring-consult"
 *   "Replies publicly with AI · sends a DM with exact text"
 *
 * Pure over the record; the noun follows the scope (a comment, a story reply,
 * a message) so a WhatsApp ad rule never says "comment". Kept apart from
 * `settingSummary.ts`, which summarises ONE setting; this reads the rule.
 */
import {
  FuelyAutomationScope,
  FuelySettingIncomingMessagesHowToReply,
  FuelySettingKeywordsReactTo,
  FuelySettingPrivateReplyHowToReply,
  FuelySettingPublicReplyHowToReply,
} from '~api/generated/automations/graphql';
import type { AutomationRecord, SettingInfo } from '../types';
import { isCommentReplyScope } from './scopes';
import { count } from './settingSummary';
import { settingOf } from './settingValue';

/** "price, cost + 3 more" — the first `shown` items, then a count. */
export function listPreview(items: readonly string[], shown = 2): string {
  const head = items.slice(0, shown).join(', ');
  const rest = items.length - shown;
  return rest > 0 ? `${head} + ${rest} more` : head;
}

/** What the keywords setting looks at on this source. */
export function keywordNoun(scope: FuelyAutomationScope): { singular: string; plural: string } {
  if (isCommentReplyScope(scope)) return { singular: 'comment', plural: 'Comments' };
  if (scope === FuelyAutomationScope.InstagramStoryReplies) return { singular: 'story reply', plural: 'Story replies' };
  return { singular: 'message', plural: 'Messages' };
}

function keywordsPhrase(
  setting: Extract<SettingInfo, { __typename: 'FuelySettingKeywords' }>,
  scope: FuelyAutomationScope,
): string {
  const noun = keywordNoun(scope);
  if (setting.reactTo === FuelySettingKeywordsReactTo.AnyComment) return `Any ${noun.singular}`;
  const verb =
    setting.reactTo === FuelySettingKeywordsReactTo.CommentThatContains
      ? 'containing'
      : setting.reactTo === FuelySettingKeywordsReactTo.CommentThatExactlyMatches
        ? 'exactly matching'
        : 'not containing';
  if (setting.keywords.length === 0) return `${noun.plural} ${verb} — no keywords yet`;
  return `${noun.plural} ${verb} ${listPreview(setting.keywords)}`;
}

/** The trigger line. Filters in scope order: keywords first, then the list the source has. */
export function summarizeTriggers(record: AutomationRecord): string {
  const parts: string[] = [];
  const keywords = settingOf(record.settings, 'FuelySettingKeywords');
  if (keywords) parts.push(keywordsPhrase(keywords, record.scope));
  const posts = settingOf(record.settings, 'FuelySettingListOfPosts');
  if (posts) parts.push(posts.posts.length === 0 ? 'All posts' : count(posts.posts.length, 'post'));
  const stories = settingOf(record.settings, 'FuelySettingListOfStories');
  if (stories)
    parts.push(stories.stories.length === 0 ? 'All stories' : count(stories.stories.length, 'story', 'stories'));
  const ads = settingOf(record.settings, 'FuelySettingListOfAds');
  if (ads) parts.push(ads.adIDs.length === 0 ? 'All ads' : count(ads.adIDs.length, 'ad'));
  const refs = settingOf(record.settings, 'FuelySettingRefLinks');
  if (refs) parts.push(refs.refs.length === 0 ? 'Any ref link' : `Ref links: ${listPreview(refs.refs, 3)}`);
  return parts.length > 0 ? parts.join(' · ') : 'Every conversation on this source';
}

/** The reply line, or null when the rule has nothing to say about replies. */
export function summarizeReplies(record: AutomationRecord): string | null {
  const parts: string[] = [];
  const pub = settingOf(record.settings, 'FuelySettingPublicReply');
  const priv = settingOf(record.settings, 'FuelySettingPrivateReply');
  if (pub) {
    parts.push(
      pub.publicReplyHowToReply === FuelySettingPublicReplyHowToReply.UsingAi
        ? 'Replies publicly with AI'
        : pub.publicReplyHowToReply === FuelySettingPublicReplyHowToReply.ExactText
          ? 'Replies publicly with exact text'
          : 'No public reply',
    );
  }
  if (priv) {
    parts.push(
      priv.privateReplyHowToReply === FuelySettingPrivateReplyHowToReply.UsingAi
        ? 'sends a DM with AI'
        : priv.privateReplyHowToReply === FuelySettingPrivateReplyHowToReply.ExactText
          ? 'sends a DM with exact text'
          : 'no DM',
    );
  }
  if (!pub && !priv) {
    const incoming = settingOf(record.settings, 'FuelySettingIncomingMessages');
    if (incoming)
      parts.push(
        incoming.howToReply === FuelySettingIncomingMessagesHowToReply.UsingAi ? 'Replies with AI' : 'Doesn’t reply',
      );
  }
  if (parts.length === 0) return null;
  const [first, ...rest] = parts;
  return [first!.charAt(0).toUpperCase() + first!.slice(1), ...rest].join(' · ');
}

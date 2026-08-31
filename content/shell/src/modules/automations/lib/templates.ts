/**
 * Starters for the New-rule dialog. A template is a name, a sentence about
 * when to use it, the sources it applies to, and the settings it pre-fills —
 * in WRITE shape (`SettingUpdate[]`), so `planFromTemplate` can run them
 * straight after the create. Everything a template does not set stays as the
 * source's Default (a fresh rule follows its scope base for the 8 common
 * settings and for the two replies).
 *
 * Two live rules every template obeys, and `templates.test.ts` proves:
 * a template writes only settings its scopes carry (`FuelySettingNotAllowedInScope`
 * otherwise), and never a non-Any keywords mode with an empty list (production
 * answers InternalServerError). The reply settings send BOTH texts because the
 * setter requires both regardless of the mode.
 */
import {
  FuelyAutomationScope,
  FuelySettingFollowUpsHowToSend,
  FuelySettingKeywordsReactTo,
  FuelySettingPrivateReplyHowToReply,
  FuelySettingPublicReplyHowToReply,
} from '~api/generated/automations/graphql';
import type { SettingUpdate } from '../types';
import { platformOf, scopeShortLabel } from './scopes';

export interface RuleTemplate {
  id: string;
  title: string;
  description: string;
  /** Where it applies; the dialog offers it only for these. */
  scopes: readonly FuelyAutomationScope[];
  build: (scope: FuelyAutomationScope) => SettingUpdate[];
}

const keywords = (reactTo: FuelySettingKeywordsReactTo, list: string[]): SettingUpdate => ({
  type: 'FuelySettingKeywords',
  update: { reactTo, keywords: list },
});

const publicReply = (how: FuelySettingPublicReplyHowToReply, exactText: string, prompt: string): SettingUpdate => ({
  type: 'FuelySettingPublicReply',
  update: { publicReplyHowToReply: how, exactTextReply: exactText, messagePrompt: prompt, likeContactComment: false },
});

const privateReply = (how: FuelySettingPrivateReplyHowToReply, exactText: string, prompt: string): SettingUpdate => ({
  type: 'FuelySettingPrivateReply',
  update: { privateReplyHowToReply: how, exactTextReply: exactText, messagePrompt: prompt },
});

const DM_PROMPT =
  'Open the DM by thanking them for their comment, then answer the question it contained — price, availability or how to book. Keep it to two short paragraphs and offer the two nearest free slots when booking comes up.';
const DM_EXACT =
  'Thanks for your comment! Here are the details you asked about — reply here if you have any questions.';
const PUBLIC_PROMPT =
  'Reply publicly in one short, friendly sentence and say the details are in their DMs. Never state prices or slots publicly.';

export const RULE_TEMPLATES: readonly RuleTemplate[] = [
  {
    id: 'keyword-dm',
    title: 'Reply to comments containing a keyword and DM the poster',
    description:
      'When a comment contains price, cost or how much, reply publicly with a short "Sent you a DM 💌" and let the AI answer in a private message. Edit the keywords after creating.',
    scopes: [
      FuelyAutomationScope.InstagramPostComments,
      FuelyAutomationScope.InstagramAdComments,
      FuelyAutomationScope.FacebookPostComments,
    ],
    build: () => [
      keywords(FuelySettingKeywordsReactTo.CommentThatContains, ['price', 'cost', 'how much']),
      publicReply(FuelySettingPublicReplyHowToReply.ExactText, 'Sent you a DM 💌', PUBLIC_PROMPT),
      privateReply(FuelySettingPrivateReplyHowToReply.UsingAi, DM_EXACT, DM_PROMPT),
    ],
  },
  {
    id: 'dm-post-commenters',
    title: 'DM everyone who comments on a specific post',
    description:
      'Every comment gets a private AI reply and no public one. Pick the post (or posts) in the rule after creating — until you do, it applies to all posts.',
    scopes: [FuelyAutomationScope.InstagramPostComments, FuelyAutomationScope.FacebookPostComments],
    build: () => [
      keywords(FuelySettingKeywordsReactTo.AnyComment, []),
      publicReply(FuelySettingPublicReplyHowToReply.DontReply, 'Sent you a DM 💌', PUBLIC_PROMPT),
      privateReply(FuelySettingPrivateReplyHowToReply.UsingAi, DM_EXACT, DM_PROMPT),
    ],
  },
  {
    id: 'story-keyword',
    title: 'Story reply keyword',
    description:
      'When someone replies "yes" or "me" to a story — a poll, a waitlist, a giveaway — the AI takes it from there. Change the words to match your story.',
    scopes: [FuelyAutomationScope.InstagramStoryReplies],
    build: () => [keywords(FuelySettingKeywordsReactTo.CommentThatContains, ['yes', 'me'])],
  },
  {
    id: 'campaign-link',
    title: 'ig.me / m.me campaign link',
    description:
      'A rule for one campaign link: share ig.me/m/<handle>?ref=campaign (or m.me/<page>?ref=campaign) and every chat that starts from it lands here. Rename the ref after creating.',
    scopes: [FuelyAutomationScope.InstagramIgMeLinks, FuelyAutomationScope.FacebookMMeLinks],
    build: () => [{ type: 'FuelySettingRefLinks', update: { refs: ['campaign'] } }],
  },
  {
    id: 'ctwa',
    title: 'Click-to-WhatsApp ad',
    description:
      'Every chat opened from a click-to-WhatsApp ad, with a follow-up nudge if the person goes quiet. Pick the ads in the rule after creating.',
    scopes: [FuelyAutomationScope.WhatsAppClickFromAds],
    build: () => [
      keywords(FuelySettingKeywordsReactTo.AnyComment, []),
      {
        type: 'FuelySettingFollowUps',
        update: {
          howToSend: FuelySettingFollowUpsHowToSend.Send,
          messagePrompt:
            'If the person goes quiet after opening the chat from the ad, send one gentle nudge after two hours: remind them what the ad offered and offer the two nearest free slots. Never send a second nudge.',
        },
      },
    ],
  },
  {
    id: 'tiktok-viral',
    title: 'TikTok viral video',
    description:
      'When a video takes off: comments containing price or link get a public AI reply that points to the profile link. Widen the keywords after creating.',
    scopes: [FuelyAutomationScope.TikTokPostComments],
    build: () => [keywords(FuelySettingKeywordsReactTo.CommentThatContains, ['price', 'link'])],
  },
];

/** The templates that apply to a source, in gallery order. */
export const templatesFor = (scope: FuelyAutomationScope): RuleTemplate[] =>
  RULE_TEMPLATES.filter((t) => t.scopes.includes(scope));

export const templateById = (id: string): RuleTemplate | null => RULE_TEMPLATES.find((t) => t.id === id) ?? null;

/** "New rule on Instagram post comments" — the dialog's default name. */
export function defaultRuleName(scope: FuelyAutomationScope): string {
  const platform = platformOf(scope);
  const short = scopeShortLabel(scope);
  return platform
    ? `New rule on ${platform} ${short.charAt(0).toLowerCase()}${short.slice(1)}`
    : `New rule on ${short}`;
}

/** The setting labels a template pre-fills — for the card's small tags. */
export const templateSettingTypes = (template: RuleTemplate, scope: FuelyAutomationScope): SettingUpdate['type'][] =>
  template.build(scope).map((u) => u.type);

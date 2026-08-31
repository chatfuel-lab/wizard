import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { SettingTypename } from '../types';

/**
 * The scope model tables from guide.md, encoded once: nav order, display
 * labels, per-scope extra settings and which scopes accept custom
 * automations (exactly those owning at least one filter setting).
 */

export type Platform = 'Instagram' | 'WhatsApp' | 'Facebook' | 'TikTok' | 'Web Widget';

export interface ScopeGroup {
  platform: Platform;
  scopes: readonly FuelyAutomationScope[];
}

/** Channel nav order: `All` is pinned on top, then the platform groups. */
export const SCOPE_GROUPS: readonly ScopeGroup[] = [
  {
    platform: 'Instagram',
    scopes: [
      FuelyAutomationScope.InstagramDirectMessages,
      FuelyAutomationScope.InstagramPostComments,
      FuelyAutomationScope.InstagramAdComments,
      FuelyAutomationScope.InstagramStoryReplies,
      FuelyAutomationScope.InstagramIgMeLinks,
      FuelyAutomationScope.InstagramClickFromAds,
    ],
  },
  {
    platform: 'WhatsApp',
    scopes: [
      FuelyAutomationScope.WhatsAppDirectMessages,
      FuelyAutomationScope.WhatsAppClickFromAds,
      FuelyAutomationScope.WhatsAppClickFromPosts,
    ],
  },
  {
    platform: 'Facebook',
    scopes: [
      FuelyAutomationScope.FacebookDirectMessages,
      FuelyAutomationScope.FacebookPostComments,
      FuelyAutomationScope.FacebookMMeLinks,
      FuelyAutomationScope.FacebookClickFromAds,
    ],
  },
  {
    platform: 'TikTok',
    scopes: [
      FuelyAutomationScope.TikTokDirectMessages,
      FuelyAutomationScope.TikTokPostComments,
      FuelyAutomationScope.TikTokClickFromAds,
    ],
  },
  {
    platform: 'Web Widget',
    scopes: [FuelyAutomationScope.WebWidgetDirectMessage],
  },
];

/** All 18 scopes in nav order. */
export const SCOPES: readonly FuelyAutomationScope[] = [
  FuelyAutomationScope.All,
  ...SCOPE_GROUPS.flatMap((group) => group.scopes),
];

const SHORT_LABELS: Record<FuelyAutomationScope, string> = {
  [FuelyAutomationScope.All]: 'All channels',
  [FuelyAutomationScope.InstagramDirectMessages]: 'Direct messages',
  [FuelyAutomationScope.InstagramPostComments]: 'Post comments',
  [FuelyAutomationScope.InstagramAdComments]: 'Ad comments',
  [FuelyAutomationScope.InstagramStoryReplies]: 'Story replies',
  [FuelyAutomationScope.InstagramIgMeLinks]: 'ig.me links',
  [FuelyAutomationScope.InstagramClickFromAds]: 'Click from ads',
  [FuelyAutomationScope.WhatsAppDirectMessages]: 'Direct messages',
  [FuelyAutomationScope.WhatsAppClickFromAds]: 'Click from ads',
  [FuelyAutomationScope.WhatsAppClickFromPosts]: 'Click from posts',
  [FuelyAutomationScope.FacebookDirectMessages]: 'Direct messages',
  [FuelyAutomationScope.FacebookPostComments]: 'Post comments',
  [FuelyAutomationScope.FacebookMMeLinks]: 'm.me links',
  [FuelyAutomationScope.FacebookClickFromAds]: 'Click from ads',
  [FuelyAutomationScope.TikTokDirectMessages]: 'Direct messages',
  [FuelyAutomationScope.TikTokPostComments]: 'Post comments',
  [FuelyAutomationScope.TikTokClickFromAds]: 'Click from ads',
  [FuelyAutomationScope.WebWidgetDirectMessage]: 'Direct messages',
};

/** Label inside a platform group ("Post comments"). */
export const scopeShortLabel = (scope: FuelyAutomationScope): string => SHORT_LABELS[scope];

export const platformOf = (scope: FuelyAutomationScope): Platform | null =>
  SCOPE_GROUPS.find((group) => group.scopes.includes(scope))?.platform ?? null;

/** Full label ("Instagram · Post comments"; the All scope is "All channels"). */
export const scopeLabel = (scope: FuelyAutomationScope): string => {
  const platform = platformOf(scope);
  return platform ? `${platform} · ${SHORT_LABELS[scope]}` : SHORT_LABELS[scope];
};

/** Short name for an inheritance parent — parents are always base automations. */
export const baseLabel = (ref: { scope: FuelyAutomationScope }): string =>
  ref.scope === FuelyAutomationScope.All ? 'All channels base' : `${scopeLabel(ref.scope)} base`;

/** The 8 settings every scope carries, display order. */
export const COMMON_SETTINGS: readonly SettingTypename[] = [
  'FuelySettingIncomingMessages',
  'FuelySettingWhenAIReplies',
  'FuelySettingMessageDelays',
  'FuelySettingCatalogImages',
  'FuelySettingBookingRules',
  'FuelySettingSwitchToHuman',
  'FuelySettingFollowUps',
  'FuelySettingCollectContactInfo',
];

/** Filter settings: valid on custom automations only, never on a base one. */
export const FILTER_SETTINGS: readonly SettingTypename[] = [
  'FuelySettingKeywords',
  'FuelySettingListOfPosts',
  'FuelySettingListOfStories',
  'FuelySettingListOfAds',
  'FuelySettingRefLinks',
];

/** Per-scope extras (guide.md table), display order: replies first, then filters. */
const EXTRAS: Record<FuelyAutomationScope, readonly SettingTypename[]> = {
  [FuelyAutomationScope.All]: [],
  [FuelyAutomationScope.InstagramDirectMessages]: [],
  [FuelyAutomationScope.InstagramPostComments]: [
    'FuelySettingPrivateReply',
    'FuelySettingPublicReply',
    'FuelySettingKeywords',
    'FuelySettingListOfPosts',
  ],
  [FuelyAutomationScope.InstagramAdComments]: [
    'FuelySettingPrivateReply',
    'FuelySettingPublicReply',
    'FuelySettingKeywords',
    'FuelySettingListOfAds',
  ],
  [FuelyAutomationScope.InstagramStoryReplies]: ['FuelySettingKeywords', 'FuelySettingListOfStories'],
  [FuelyAutomationScope.InstagramIgMeLinks]: ['FuelySettingRefLinks'],
  [FuelyAutomationScope.InstagramClickFromAds]: ['FuelySettingKeywords', 'FuelySettingListOfAds'],
  [FuelyAutomationScope.WhatsAppDirectMessages]: [],
  [FuelyAutomationScope.WhatsAppClickFromAds]: ['FuelySettingKeywords', 'FuelySettingListOfAds'],
  [FuelyAutomationScope.WhatsAppClickFromPosts]: [],
  [FuelyAutomationScope.FacebookDirectMessages]: [],
  [FuelyAutomationScope.FacebookPostComments]: [
    'FuelySettingPrivateReply',
    'FuelySettingPublicReply',
    'FuelySettingKeywords',
    'FuelySettingListOfPosts',
  ],
  [FuelyAutomationScope.FacebookMMeLinks]: ['FuelySettingRefLinks'],
  [FuelyAutomationScope.FacebookClickFromAds]: ['FuelySettingKeywords', 'FuelySettingListOfAds'],
  [FuelyAutomationScope.TikTokDirectMessages]: [],
  [FuelyAutomationScope.TikTokPostComments]: ['FuelySettingPublicReply', 'FuelySettingKeywords'],
  [FuelyAutomationScope.TikTokClickFromAds]: ['FuelySettingKeywords'],
  [FuelyAutomationScope.WebWidgetDirectMessage]: [],
};

export const extrasFor = (scope: FuelyAutomationScope): readonly SettingTypename[] => EXTRAS[scope];

export const filterSettingsFor = (scope: FuelyAutomationScope): readonly SettingTypename[] =>
  EXTRAS[scope].filter((typename) => FILTER_SETTINGS.includes(typename));

/** Custom automations exist only in scopes owning at least one filter setting. */
export const allowsCustomAutomations = (scope: FuelyAutomationScope): boolean => filterSettingsFor(scope).length > 0;

/** Canonical section order: the 8 common settings, then replies, then filters. */
const SETTING_ORDER: readonly SettingTypename[] = [
  ...COMMON_SETTINGS,
  'FuelySettingPrivateReply',
  'FuelySettingPublicReply',
  'FuelySettingKeywords',
  'FuelySettingListOfPosts',
  'FuelySettingListOfStories',
  'FuelySettingListOfAds',
  'FuelySettingRefLinks',
];

/** Unknown typenames (a setting the module does not edit) sort last, never first. */
export const settingRank = (typename: SettingTypename): number => {
  const at = SETTING_ORDER.indexOf(typename);
  return at === -1 ? SETTING_ORDER.length : at;
};

/**
 * The four comment scopes where IncomingMessages.howToReply may be a value
 * other than UsingAI (FuelyIncomingMessagesHowToReplyNotAllowed elsewhere).
 */
export const isCommentReplyScope = (scope: FuelyAutomationScope): boolean =>
  scope === FuelyAutomationScope.InstagramPostComments ||
  scope === FuelyAutomationScope.InstagramAdComments ||
  scope === FuelyAutomationScope.FacebookPostComments ||
  scope === FuelyAutomationScope.TikTokPostComments;

/** likeContactComment is Facebook-only (FuelyLikeContactCommentNotAllowed). */
export const isFacebookScope = (scope: FuelyAutomationScope): boolean => platformOf(scope) === 'Facebook';

/** Deep-link parsing: unknown values fall back to the All scope. */
export const parseScope = (raw: string | null): FuelyAutomationScope =>
  SCOPES.find((scope) => scope === raw) ?? FuelyAutomationScope.All;

// ---------------------------------------------------------------------------
// The words a person uses for a source, the platform key the
// design system tokens/icons are named by, and how the settings group in a card.
// ---------------------------------------------------------------------------

/** Token / icon key: `text-channel-<key>`, `bg-channel-<key>-soft`, `IconInstagram` … */
export type PlatformKey = 'instagram' | 'whatsapp' | 'facebook' | 'tiktok' | 'widget';

export const PLATFORM_KEYS: Record<Platform, PlatformKey> = {
  Instagram: 'instagram',
  WhatsApp: 'whatsapp',
  Facebook: 'facebook',
  TikTok: 'tiktok',
  'Web Widget': 'widget',
};

/** One line under the source name — what a contact did to land here (the dashboard's copy). */
const DESCRIPTIONS: Record<FuelyAutomationScope, string> = {
  [FuelyAutomationScope.All]: 'The rules every source starts from',
  [FuelyAutomationScope.InstagramDirectMessages]: 'When a contact messages you privately',
  [FuelyAutomationScope.InstagramPostComments]: 'When a contact comments on your post or Reel',
  [FuelyAutomationScope.InstagramAdComments]: 'When a contact comments on your ad post',
  [FuelyAutomationScope.InstagramStoryReplies]: 'When a contact replies to your story',
  [FuelyAutomationScope.InstagramIgMeLinks]: 'When a contact comes from an ig.me link',
  [FuelyAutomationScope.InstagramClickFromAds]: 'When a contact taps an ad that opens Instagram',
  [FuelyAutomationScope.WhatsAppDirectMessages]: 'When a contact messages you',
  [FuelyAutomationScope.WhatsAppClickFromAds]: 'When a contact taps a click-to-WhatsApp ad',
  [FuelyAutomationScope.WhatsAppClickFromPosts]: 'When a contact comes from a post that opens WhatsApp',
  [FuelyAutomationScope.FacebookDirectMessages]: 'When a contact messages your page',
  [FuelyAutomationScope.FacebookPostComments]: 'When a contact comments on your page post',
  [FuelyAutomationScope.FacebookMMeLinks]: 'When a contact comes from an m.me link',
  [FuelyAutomationScope.FacebookClickFromAds]: 'When a contact taps an ad that opens Messenger',
  [FuelyAutomationScope.TikTokDirectMessages]: 'When a contact messages you privately',
  [FuelyAutomationScope.TikTokPostComments]: 'When a contact comments on your video',
  [FuelyAutomationScope.TikTokClickFromAds]: 'When a contact taps an ad that opens TikTok',
  [FuelyAutomationScope.WebWidgetDirectMessage]: 'When a contact writes in the website chat',
};

export const scopeDescription = (scope: FuelyAutomationScope): string => DESCRIPTIONS[scope];

/** The direct-message source of a platform — the one the routed test picks. */
export const DM_SCOPE: Record<Platform, FuelyAutomationScope> = {
  Instagram: FuelyAutomationScope.InstagramDirectMessages,
  WhatsApp: FuelyAutomationScope.WhatsAppDirectMessages,
  Facebook: FuelyAutomationScope.FacebookDirectMessages,
  TikTok: FuelyAutomationScope.TikTokDirectMessages,
  'Web Widget': FuelyAutomationScope.WebWidgetDirectMessage,
};

/**
 * How a card groups its settings — by behaviour, not by typename order:
 * Triggers (the filters a rule owns), Replying, Comments, Sales & bookings, People.
 */
export type BehaviorGroupId = 'triggers' | 'replying' | 'comments' | 'sales' | 'people' | 'other';

export interface BehaviorGroup {
  id: BehaviorGroupId;
  label: string;
  settings: readonly SettingTypename[];
}

export const BEHAVIOR_GROUPS: readonly BehaviorGroup[] = [
  {
    id: 'triggers',
    label: 'Triggers',
    settings: [
      'FuelySettingKeywords',
      'FuelySettingListOfPosts',
      'FuelySettingListOfStories',
      'FuelySettingListOfAds',
      'FuelySettingRefLinks',
    ],
  },
  {
    id: 'replying',
    label: 'Replying',
    settings: ['FuelySettingIncomingMessages', 'FuelySettingWhenAIReplies', 'FuelySettingMessageDelays'],
  },
  { id: 'comments', label: 'Comments', settings: ['FuelySettingPublicReply', 'FuelySettingPrivateReply'] },
  { id: 'sales', label: 'Sales & bookings', settings: ['FuelySettingCatalogImages', 'FuelySettingBookingRules'] },
  {
    id: 'people',
    label: 'People',
    settings: ['FuelySettingSwitchToHuman', 'FuelySettingCollectContactInfo', 'FuelySettingFollowUps'],
  },
];

/** The settings an automation actually has, in behaviour-group order; unknown typenames last. */
export function groupSettings(settings: readonly { __typename: SettingTypename }[]): {
  group: BehaviorGroup;
  settings: SettingTypename[];
}[] {
  const present = new Set(settings.map((s) => s.__typename));
  const out = BEHAVIOR_GROUPS.map((group) => ({
    group,
    settings: group.settings.filter((typename) => present.has(typename)),
  })).filter((entry) => entry.settings.length > 0);
  const known = new Set(BEHAVIOR_GROUPS.flatMap((g) => g.settings));
  const rest = [...present].filter((typename) => !known.has(typename));
  if (rest.length > 0) out.push({ group: { id: 'other', label: 'Other', settings: rest }, settings: rest });
  return out;
}

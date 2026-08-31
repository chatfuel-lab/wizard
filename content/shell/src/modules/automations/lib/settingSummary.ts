import {
  FuelySettingBookingRulesAutonomyLevel,
  FuelySettingCatalogImagesWhenToShow,
  FuelySettingCollectContactInfoHowToCollect,
  FuelySettingFollowUpsHowToSend,
  FuelySettingIncomingMessagesHowToReply,
  FuelySettingKeywordsReactTo,
  FuelySettingPrivateReplyHowToReply,
  FuelySettingPublicReplyHowToReply,
  FuelySettingSwitchToHumanHowToSwitch,
  FuelySettingWhenAiRepliesOptions,
} from '~api/generated/automations/graphql';
import type { SettingInfo, SettingTypename } from '../types';

// Enum display labels — declaration order doubles as <Select> option order.

export const HOW_TO_REPLY_LABELS: Record<FuelySettingIncomingMessagesHowToReply, string> = {
  [FuelySettingIncomingMessagesHowToReply.UsingAi]: 'Reply with AI',
  [FuelySettingIncomingMessagesHowToReply.DontReply]: 'Don’t reply',
};

export const WHEN_AI_REPLIES_LABELS: Record<FuelySettingWhenAiRepliesOptions, string> = {
  [FuelySettingWhenAiRepliesOptions.Always]: 'Always',
  [FuelySettingWhenAiRepliesOptions.OutsideOfWorkingHours]: 'Outside of working hours',
};

export const CATALOG_IMAGES_LABELS: Record<FuelySettingCatalogImagesWhenToShow, string> = {
  [FuelySettingCatalogImagesWhenToShow.OnceMentioned]: 'Once an item is mentioned',
  [FuelySettingCatalogImagesWhenToShow.WhenAsked]: 'When the customer asks',
  [FuelySettingCatalogImagesWhenToShow.Never]: 'Never',
};

export const BOOKING_RULES_LABELS: Record<FuelySettingBookingRulesAutonomyLevel, string> = {
  [FuelySettingBookingRulesAutonomyLevel.BookWithFullAutonomy]: 'Book with full autonomy',
  [FuelySettingBookingRulesAutonomyLevel.BookWithTeammatesApproval]: 'Book with teammates’ approval',
  [FuelySettingBookingRulesAutonomyLevel.BookWithTeammatesReview]: 'Book with teammates’ review',
  [FuelySettingBookingRulesAutonomyLevel.CollectIntents]: 'Collect booking intents only',
  [FuelySettingBookingRulesAutonomyLevel.DontBook]: 'Don’t book',
};

export const SWITCH_TO_HUMAN_LABELS: Record<FuelySettingSwitchToHumanHowToSwitch, string> = {
  [FuelySettingSwitchToHumanHowToSwitch.SwitchToTeammates]: 'Switch to teammates',
  [FuelySettingSwitchToHumanHowToSwitch.DontSwitch]: 'Don’t switch',
};

export const FOLLOW_UPS_LABELS: Record<FuelySettingFollowUpsHowToSend, string> = {
  [FuelySettingFollowUpsHowToSend.Send]: 'Send follow-ups',
  [FuelySettingFollowUpsHowToSend.DontSend]: 'Don’t send',
};

export const COLLECT_INFO_LABELS: Record<FuelySettingCollectContactInfoHowToCollect, string> = {
  [FuelySettingCollectContactInfoHowToCollect.CollectInfo]: 'Collect info',
  [FuelySettingCollectContactInfoHowToCollect.DoNotCollectInfo]: 'Don’t collect',
};

export const PRIVATE_REPLY_LABELS: Record<FuelySettingPrivateReplyHowToReply, string> = {
  [FuelySettingPrivateReplyHowToReply.UsingAi]: 'Reply with AI',
  [FuelySettingPrivateReplyHowToReply.ExactText]: 'Reply with exact text',
  [FuelySettingPrivateReplyHowToReply.DontReply]: 'Don’t reply',
};

export const PUBLIC_REPLY_LABELS: Record<FuelySettingPublicReplyHowToReply, string> = {
  [FuelySettingPublicReplyHowToReply.UsingAi]: 'Reply with AI',
  [FuelySettingPublicReplyHowToReply.ExactText]: 'Reply with exact text',
  [FuelySettingPublicReplyHowToReply.DontReply]: 'Don’t reply',
};

export const KEYWORDS_REACT_TO_LABELS: Record<FuelySettingKeywordsReactTo, string> = {
  [FuelySettingKeywordsReactTo.AnyComment]: 'Any comment',
  [FuelySettingKeywordsReactTo.CommentThatContains]: 'Comment that contains…',
  [FuelySettingKeywordsReactTo.CommentThatDoesNotContain]: 'Comment that does not contain…',
  [FuelySettingKeywordsReactTo.CommentThatExactlyMatches]: 'Comment that exactly matches…',
};

export const count = (n: number, singular: string, plural = `${singular}s`): string =>
  `${n} ${n === 1 ? singular : plural}`;

export interface SettingSummary {
  label: string;
  /** Short facts for the collapsed section header. */
  rows: string[];
}

/** Collapsed-header line for any of the 15 setting types. */
export function summarizeSetting(setting: SettingInfo): SettingSummary {
  const label = SETTING_LABELS[setting.__typename];
  switch (setting.__typename) {
    case 'FuelySettingIncomingMessages':
      return {
        label,
        rows: [HOW_TO_REPLY_LABELS[setting.howToReply], `prompt ${setting.messagePrompt.length}/5000`],
      };
    case 'FuelySettingWhenAIReplies':
      return { label, rows: [WHEN_AI_REPLIES_LABELS[setting.option]] };
    case 'FuelySettingMessageDelays':
      return { label, rows: [setting.enabled ? 'Humanlike delays on' : 'Humanlike delays off'] };
    case 'FuelySettingCatalogImages':
      return {
        label,
        rows: [CATALOG_IMAGES_LABELS[setting.whenToShow], `${count(setting.imagesPerCatalogItem, 'image')} per item`],
      };
    case 'FuelySettingBookingRules':
      return { label, rows: [BOOKING_RULES_LABELS[setting.autonomyLevel]] };
    case 'FuelySettingSwitchToHuman':
      return {
        label,
        rows: [SWITCH_TO_HUMAN_LABELS[setting.howToSwitch], count(setting.rules.length, 'rule')],
      };
    case 'FuelySettingFollowUps':
      return {
        label,
        rows: [FOLLOW_UPS_LABELS[setting.howToSend], `prompt ${setting.messagePrompt.length}/3000`],
      };
    case 'FuelySettingCollectContactInfo': {
      const warnings = setting.captures.filter((capture) => capture.validationErrors.length > 0).length;
      return {
        label,
        rows: [
          COLLECT_INFO_LABELS[setting.howToCollect],
          count(setting.captures.length, 'capture'),
          ...(warnings > 0 ? [count(warnings, 'warning')] : []),
        ],
      };
    }
    case 'FuelySettingPrivateReply':
      return { label, rows: [PRIVATE_REPLY_LABELS[setting.privateReplyHowToReply]] };
    case 'FuelySettingPublicReply':
      return {
        label,
        rows: [
          PUBLIC_REPLY_LABELS[setting.publicReplyHowToReply],
          ...(setting.likeContactComment ? ['likes comments'] : []),
        ],
      };
    case 'FuelySettingKeywords':
      return {
        label,
        rows: [KEYWORDS_REACT_TO_LABELS[setting.reactTo], count(setting.keywords.length, 'keyword')],
      };
    case 'FuelySettingListOfPosts':
      return { label, rows: [count(setting.posts.length, 'post')] };
    case 'FuelySettingListOfStories':
      return { label, rows: [count(setting.stories.length, 'story', 'stories')] };
    case 'FuelySettingListOfAds':
      return { label, rows: [count(setting.adIDs.length, 'ad')] };
    case 'FuelySettingRefLinks':
      return { label, rows: [count(setting.refs.length, 'ref link')] };
    default:
      return { label, rows: ['Managed in the Chatfuel dashboard'] };
  }
}

// ---------------------------------------------------------------------------
// The product's words for each setting, the option arrays the editors render
// (labels + descriptions, in control order), and the knowledge base schedule
// summary. The card-level one-liners — triggers and replies — live in
// `ruleSummary.ts`, which is what the cards import.
// ---------------------------------------------------------------------------

/**
 * Section titles in the product's vocabulary: what a person
 * reads on a card. `SETTING_LABELS` above stays what the toasts and tests
 * say; the two should converge.
 */
export const SETTING_TITLES: Record<SettingTypename, string> = {
  FuelySettingIncomingMessages: 'AI instructions',
  FuelySettingWhenAIReplies: 'When AI replies',
  FuelySettingMessageDelays: 'Message delays',
  FuelySettingCatalogImages: 'Images',
  FuelySettingBookingRules: 'Booking rules',
  FuelySettingSwitchToHuman: 'Switch to human agents',
  FuelySettingFollowUps: 'Send follow-ups',
  FuelySettingCollectContactInfo: 'Lead qualification',
  FuelySettingPrivateReply: 'Reply in DMs',
  FuelySettingPublicReply: 'Public comment replies',
  FuelySettingKeywords: 'Look for keywords',
  FuelySettingListOfPosts: 'Posts',
  FuelySettingListOfStories: 'Stories',
  FuelySettingListOfAds: 'Ads',
  FuelySettingRefLinks: 'Ref links',
  FuelySettingSendEventsToMeta: 'Send events to Meta',
};

/**
 * The one name a setting has on screen — the product's words (the dashboard's,
 * so a person reading both sees one vocabulary). `SETTING_LABELS` was the earlier
 * name for the same table and is kept as an alias so a toast, a summary line
 * and a section header can never drift apart.
 */
export const SETTING_LABELS = SETTING_TITLES;

/** One line under the title when a section is open — what the setting decides. */
export const SETTING_DESCRIPTIONS: Record<SettingTypename, string> = {
  FuelySettingIncomingMessages: 'What the AI knows about this source and how it answers.',
  FuelySettingWhenAIReplies: 'Whether the AI answers around the clock or only when nobody on the team is at work.',
  FuelySettingMessageDelays: 'Short pauses between messages so replies read like a person typing.',
  FuelySettingCatalogImages: 'When the AI attaches product or service images from the catalog.',
  FuelySettingBookingRules: 'How far the AI goes on its own when someone wants an appointment.',
  FuelySettingSwitchToHuman: 'When the AI hands a conversation to a teammate, and to whom.',
  FuelySettingFollowUps: 'A nudge when the person goes quiet.',
  FuelySettingCollectContactInfo: 'What the AI asks for and where it stores the answer.',
  FuelySettingPrivateReply: 'The direct message the AI sends to someone who commented.',
  FuelySettingPublicReply: 'The reply the AI posts under the comment itself.',
  FuelySettingKeywords: 'Which comments this rule reacts to.',
  FuelySettingListOfPosts: 'Only comments on these posts — or on every post.',
  FuelySettingListOfStories: 'Only replies to these stories — or to every story.',
  FuelySettingListOfAds: 'Only contacts who came from these ads.',
  FuelySettingRefLinks: 'Only contacts who came through these ref links.',
  FuelySettingSendEventsToMeta: 'Conversion events sent to Meta for ad optimisation.',
};

/** An option for a `SegmentedControl` / `RadioGroup` — the value is the enum member. */
export interface EnumOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export const HOW_TO_REPLY_OPTIONS: readonly EnumOption<FuelySettingIncomingMessagesHowToReply>[] = [
  { value: FuelySettingIncomingMessagesHowToReply.UsingAi, label: 'Reply using AI' },
  { value: FuelySettingIncomingMessagesHowToReply.DontReply, label: 'Don’t reply' },
];

export const WHEN_AI_REPLIES_OPTIONS: readonly EnumOption<FuelySettingWhenAiRepliesOptions>[] = [
  {
    value: FuelySettingWhenAiRepliesOptions.Always,
    label: 'Always',
    description: 'The AI answers every message, day and night.',
  },
  {
    value: FuelySettingWhenAiRepliesOptions.OutsideOfWorkingHours,
    label: 'Outside of working hours',
    description: 'The AI answers only when the team is off; during working hours the conversation waits for a person.',
  },
];

export const CATALOG_IMAGES_OPTIONS: readonly EnumOption<FuelySettingCatalogImagesWhenToShow>[] = [
  { value: FuelySettingCatalogImagesWhenToShow.Never, label: 'Never', description: 'Text only.' },
  {
    value: FuelySettingCatalogImagesWhenToShow.OnceMentioned,
    label: 'When a product is first mentioned',
    description: 'The first time a catalog item comes up, its images come with it.',
  },
  {
    value: FuelySettingCatalogImagesWhenToShow.WhenAsked,
    label: 'When asked',
    description: 'Only when the person asks to see it.',
  },
];

/** Least to most autonomous, then "off" — the order the radio shows. */
export const BOOKING_RULES_OPTIONS: readonly EnumOption<FuelySettingBookingRulesAutonomyLevel>[] = [
  {
    value: FuelySettingBookingRulesAutonomyLevel.CollectIntents,
    label: 'Collect intents',
    description: 'The AI notes what the person wants; a teammate books it.',
  },
  {
    value: FuelySettingBookingRulesAutonomyLevel.BookWithTeammatesApproval,
    label: 'Book with a teammate’s approval',
    description: 'The AI proposes a slot; a teammate approves before it is booked.',
  },
  {
    value: FuelySettingBookingRulesAutonomyLevel.BookWithTeammatesReview,
    label: 'Book with a teammate’s review',
    description: 'The AI books; a teammate reviews it afterwards.',
  },
  {
    value: FuelySettingBookingRulesAutonomyLevel.BookWithFullAutonomy,
    label: 'Book with full autonomy',
    description: 'The AI books on its own.',
  },
  {
    value: FuelySettingBookingRulesAutonomyLevel.DontBook,
    label: 'Don’t book',
    description: 'The AI answers questions but never books.',
  },
];

export const SWITCH_TO_HUMAN_OPTIONS: readonly EnumOption<FuelySettingSwitchToHumanHowToSwitch>[] = [
  { value: FuelySettingSwitchToHumanHowToSwitch.SwitchToTeammates, label: 'Switch to teammates' },
  { value: FuelySettingSwitchToHumanHowToSwitch.DontSwitch, label: 'Don’t switch' },
];

export const COLLECT_INFO_OPTIONS: readonly EnumOption<FuelySettingCollectContactInfoHowToCollect>[] = [
  { value: FuelySettingCollectContactInfoHowToCollect.CollectInfo, label: 'Collect info' },
  { value: FuelySettingCollectContactInfoHowToCollect.DoNotCollectInfo, label: 'Don’t collect' },
];

export const FOLLOW_UPS_OPTIONS: readonly EnumOption<FuelySettingFollowUpsHowToSend>[] = [
  { value: FuelySettingFollowUpsHowToSend.Send, label: 'Send' },
  { value: FuelySettingFollowUpsHowToSend.DontSend, label: 'Don’t send' },
];

export const PUBLIC_REPLY_OPTIONS: readonly EnumOption<FuelySettingPublicReplyHowToReply>[] = [
  { value: FuelySettingPublicReplyHowToReply.UsingAi, label: 'Reply using AI' },
  { value: FuelySettingPublicReplyHowToReply.ExactText, label: 'Reply with exact text' },
  { value: FuelySettingPublicReplyHowToReply.DontReply, label: 'Don’t reply' },
];

export const PRIVATE_REPLY_OPTIONS: readonly EnumOption<FuelySettingPrivateReplyHowToReply>[] = [
  { value: FuelySettingPrivateReplyHowToReply.UsingAi, label: 'Reply using AI' },
  { value: FuelySettingPrivateReplyHowToReply.ExactText, label: 'Reply with exact text' },
  { value: FuelySettingPrivateReplyHowToReply.DontReply, label: 'Don’t reply' },
];

export const KEYWORDS_OPTIONS: readonly EnumOption<FuelySettingKeywordsReactTo>[] = [
  { value: FuelySettingKeywordsReactTo.AnyComment, label: 'Any comment' },
  { value: FuelySettingKeywordsReactTo.CommentThatContains, label: 'Comment that contains' },
  { value: FuelySettingKeywordsReactTo.CommentThatExactlyMatches, label: 'Comment that exactly matches' },
  { value: FuelySettingKeywordsReactTo.CommentThatDoesNotContain, label: 'Comment that doesn’t contain' },
];

/** One day of the knowledge-base schedule (`fuelyConfig.knowledgeBase.businessHoursSchedule.workingHours`). */
export interface WorkingDay {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

const WEEK_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * "Mon–Sat 10:00–19:00", or "Mon–Fri 09:00–18:00, Sat 10:00–14:00" — runs of
 * consecutive enabled days that share hours, in Monday-first order whatever
 * order the API answered in. Null when no day is enabled (the editor warns).
 */
export function summarizeSchedule(days: readonly WorkingDay[] | null | undefined): string | null {
  if (!days || days.length === 0) return null;
  const byDay = new Map(days.map((d) => [d.day, d] as const));
  const ordered = WEEK_ORDER.map((day) => byDay.get(day)).filter((d): d is WorkingDay => d !== undefined);
  const runs: { from: string; to: string; hours: string }[] = [];
  for (const day of ordered) {
    if (!day.enabled) continue;
    const hours = `${day.start}–${day.end}`;
    const last = runs[runs.length - 1];
    if (last && last.hours === hours && WEEK_ORDER.indexOf(last.to) === WEEK_ORDER.indexOf(day.day) - 1) {
      last.to = day.day;
    } else {
      runs.push({ from: day.day, to: day.day, hours });
    }
  }
  if (runs.length === 0) return null;
  return runs.map((run) => `${run.from === run.to ? run.from : `${run.from}–${run.to}`} ${run.hours}`).join(', ');
}

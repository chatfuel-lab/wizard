import type { ComponentType } from 'react';
import {
  IconBolt,
  IconCalendar,
  IconClipboardList,
  IconClock,
  IconHand,
  IconHourglass,
  IconImage,
  IconLayoutGrid,
  IconLink,
  IconMegaphone,
  IconMessage,
  IconMessageCircle,
  IconRepeat,
  IconSparkles,
  IconStory,
  IconTag,
} from '~ui';
import type { KnownSettingTypename } from '../../types';

type Glyph = ComponentType<{ size?: number; className?: string }>;

/**
 * One glyph per setting, so a row is recognisable before its title is read —
 * the same glyph on the Default card and on every rule card. Filters (the
 * triggers a rule owns) come first in the table only for reading order; the
 * card groups decide the on-screen order.
 */
export const SETTING_ICONS: Record<KnownSettingTypename, Glyph> = {
  FuelySettingIncomingMessages: IconSparkles,
  FuelySettingWhenAIReplies: IconClock,
  FuelySettingMessageDelays: IconHourglass,
  FuelySettingCatalogImages: IconImage,
  FuelySettingBookingRules: IconCalendar,
  FuelySettingSwitchToHuman: IconHand,
  FuelySettingFollowUps: IconRepeat,
  FuelySettingCollectContactInfo: IconClipboardList,
  FuelySettingPublicReply: IconMessageCircle,
  FuelySettingPrivateReply: IconMessage,
  FuelySettingKeywords: IconTag,
  FuelySettingListOfPosts: IconLayoutGrid,
  FuelySettingListOfStories: IconStory,
  FuelySettingListOfAds: IconMegaphone,
  FuelySettingRefLinks: IconLink,
};

/** A typename the module does not know (`FuelySettingSendEventsToMeta` today). */
export const UNKNOWN_SETTING_ICON: Glyph = IconBolt;

export function settingIcon(typename: string): Glyph {
  return (SETTING_ICONS as Record<string, Glyph | undefined>)[typename] ?? UNKNOWN_SETTING_ICON;
}

import type { ComponentType } from 'react';
import {
  IconGlobe,
  IconImage,
  IconLink,
  IconMegaphone,
  IconMessage,
  IconMessageCircle,
  IconStory,
  IconTarget,
  type IconProps,
} from '~ui';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';

/**
 * One glyph per source, so a row is recognisable before it is read.
 *
 * By what a contact DID, not by which platform they did it on: the platform is
 * already the group heading above the row, and repeating it eighteen times
 * would say nothing the eye has not already been told. Three quarters of the
 * short labels repeat across the groups, and this is what tells them apart.
 */
const GLYPHS: Record<FuelyAutomationScope, ComponentType<IconProps>> = {
  [FuelyAutomationScope.All]: IconGlobe,

  [FuelyAutomationScope.InstagramDirectMessages]: IconMessageCircle,
  [FuelyAutomationScope.InstagramPostComments]: IconMessage,
  [FuelyAutomationScope.InstagramAdComments]: IconMegaphone,
  [FuelyAutomationScope.InstagramStoryReplies]: IconStory,
  [FuelyAutomationScope.InstagramIgMeLinks]: IconLink,
  [FuelyAutomationScope.InstagramClickFromAds]: IconTarget,

  [FuelyAutomationScope.WhatsAppDirectMessages]: IconMessageCircle,
  [FuelyAutomationScope.WhatsAppClickFromAds]: IconTarget,
  [FuelyAutomationScope.WhatsAppClickFromPosts]: IconImage,

  [FuelyAutomationScope.FacebookDirectMessages]: IconMessageCircle,
  [FuelyAutomationScope.FacebookPostComments]: IconMessage,
  [FuelyAutomationScope.FacebookMMeLinks]: IconLink,
  [FuelyAutomationScope.FacebookClickFromAds]: IconTarget,

  [FuelyAutomationScope.TikTokDirectMessages]: IconMessageCircle,
  [FuelyAutomationScope.TikTokPostComments]: IconMessage,
  [FuelyAutomationScope.TikTokClickFromAds]: IconTarget,

  [FuelyAutomationScope.WebWidgetDirectMessage]: IconMessageCircle,
};

export function ScopeGlyph({ scope, size = 14 }: { scope: FuelyAutomationScope; size?: number }) {
  const Glyph = GLYPHS[scope] ?? IconMessageCircle;
  return <Glyph size={size} />;
}

import type { ComponentType } from 'react';
import {
  IconCalendar,
  IconKanban,
  IconMessage,
  IconMessageCircle,
  IconSparkles,
  IconTag,
  IconUser,
  type IconProps,
} from '~ui';
import type { TriggerId } from '../lib/eventKinds';

/** One glyph per trigger, so a row is recognisable before it is read. */
const GLYPHS: Record<TriggerId, ComponentType<IconProps>> = {
  keywords: IconMessageCircle,
  firstMessage: IconMessage,
  property: IconTag,
  booking: IconCalendar,
  status: IconKanban,
  handoff: IconUser,
  prompt: IconSparkles,
};

export function TriggerIcon({ trigger, size = 16 }: { trigger: TriggerId; size?: number }) {
  const Glyph = GLYPHS[trigger];
  return <Glyph size={size} />;
}

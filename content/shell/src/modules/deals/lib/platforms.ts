import { Platform } from '~api/generated/deals/graphql';
import type { TagProps } from '~ui';

/**
 * A copy of the contacts module's file, not an import: the module boundaries
 * forbids a module reaching outside its own subtree, and each module's
 * generated `Platform` enum is its own type.
 */

/** botAttributes requires an explicit platform list — "all" spelled out. */
export const ALL_PLATFORMS: Platform[] = [
  Platform.Facebook,
  Platform.Instagram,
  Platform.Tiktok,
  Platform.Whatsapp,
  Platform.Widget,
];

const BY_TYPENAME: Record<string, { label: string; tone: NonNullable<TagProps['tone']> }> = {
  FacebookContact: { label: 'Facebook', tone: 'accent' },
  InstagramContact: { label: 'Instagram', tone: 'danger' },
  TikTokContact: { label: 'TikTok', tone: 'neutral' },
  WhatsappContact: { label: 'WhatsApp', tone: 'success' },
  WidgetContact: { label: 'Widget', tone: 'warning' },
  UnavailableContact: { label: 'Restricted', tone: 'neutral' },
};

export function platformOf(typename: string | undefined): {
  label: string;
  tone: NonNullable<TagProps['tone']>;
} {
  return (typename && BY_TYPENAME[typename]) || { label: '—', tone: 'neutral' };
}

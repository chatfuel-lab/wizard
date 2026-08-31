/**
 * Channel metadata, keyed by the contact's `__typename`.
 *
 * A copy of the same table in the deals module rather than an import: a module
 * may not import another module's source (validator pass 10), and the two are
 * free to disagree — deals labels a restricted contact "Restricted", this one
 * names the channel it could not read.
 */
import { Platform } from '~api/generated/contacts/graphql';
import type { TagProps } from '~ui';

export const ALL_PLATFORMS: readonly Platform[] = [
  Platform.Facebook,
  Platform.Instagram,
  Platform.Tiktok,
  Platform.Whatsapp,
  Platform.Widget,
];

export const PLATFORM_LABELS: Record<Platform, string> = {
  [Platform.Facebook]: 'Facebook',
  [Platform.Instagram]: 'Instagram',
  [Platform.Tiktok]: 'TikTok',
  [Platform.Whatsapp]: 'WhatsApp',
  [Platform.Widget]: 'Web widget',
};

interface PlatformMeta {
  label: string;
  tone: TagProps['tone'];
  platform: Platform | null;
}

const BY_TYPENAME: Record<string, PlatformMeta> = {
  WhatsappContact: { label: 'WhatsApp', tone: 'success', platform: Platform.Whatsapp },
  InstagramContact: { label: 'Instagram', tone: 'accent', platform: Platform.Instagram },
  FacebookContact: { label: 'Facebook', tone: 'accent', platform: Platform.Facebook },
  TikTokContact: { label: 'TikTok', tone: 'neutral', platform: Platform.Tiktok },
  WidgetContact: { label: 'Web widget', tone: 'warning', platform: Platform.Widget },
  UnavailableContact: { label: 'Restricted', tone: 'neutral', platform: null },
};

const UNKNOWN: PlatformMeta = { label: 'Unknown', tone: 'neutral', platform: null };

export const platformOf = (typename: string): PlatformMeta => BY_TYPENAME[typename] ?? UNKNOWN;

/** The platform enum a row belongs to, for client-side channel narrowing. */
export const platformEnumOf = (typename: string): Platform | null => platformOf(typename).platform;

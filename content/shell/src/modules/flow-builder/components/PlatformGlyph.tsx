import type { ReactElement } from 'react';
import { IconFacebook, IconGlobe, IconInstagram, IconTikTok, IconWhatsApp, IconWidget } from '~ui';
import { Platform } from '~api/generated/flow-builder/graphql';

const GLYPH: Record<string, (props: { size?: number; className?: string }) => ReactElement> = {
  [Platform.Instagram]: IconInstagram,
  [Platform.Whatsapp]: IconWhatsApp,
  [Platform.Facebook]: IconFacebook,
  [Platform.Tiktok]: IconTikTok,
  [Platform.Widget]: IconWidget,
};

/* Static, not interpolated: Tailwind only ships classes it can read. */
const TEXT: Record<string, string> = {
  [Platform.Instagram]: 'text-channel-instagram',
  [Platform.Whatsapp]: 'text-channel-whatsapp',
  [Platform.Facebook]: 'text-channel-facebook',
  [Platform.Tiktok]: 'text-channel-tiktok',
  [Platform.Widget]: 'text-channel-widget',
};

export const PLATFORM_LABELS: Record<string, string> = {
  [Platform.Instagram]: 'Instagram',
  [Platform.Whatsapp]: 'WhatsApp',
  [Platform.Facebook]: 'Facebook',
  [Platform.Tiktok]: 'TikTok',
  [Platform.Widget]: 'Website widget',
};

export interface PlatformGlyphProps {
  platform: string;
  size?: number;
  className?: string;
}

/**
 * The flow's channel, in its own colour. A platform the schema grew after this
 * build gets the neutral globe rather than nothing — the dock still works, it
 * just cannot name the channel.
 */
export function PlatformGlyph({ platform, size = 14, className = '' }: PlatformGlyphProps) {
  const Icon = GLYPH[platform] ?? IconGlobe;
  const tone = TEXT[platform] ?? 'text-text-muted';
  return (
    <span
      title={PLATFORM_LABELS[platform] ?? platform}
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
    >
      <Icon size={size} className={tone} />
    </span>
  );
}

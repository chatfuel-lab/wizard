import type { ComponentType } from 'react';
import { IconFacebook, IconInstagram, IconSparkles, IconTikTok, IconWhatsApp, IconWidget } from '~ui';
import { PLATFORM_KEYS, type Platform, type PlatformKey } from '../../lib/scopes';

/* Full class names, not `text-channel-${key}` — Tailwind only emits what it can read. */
const TINT: Record<PlatformKey, string> = {
  instagram: 'bg-channel-instagram-soft text-channel-instagram',
  whatsapp: 'bg-channel-whatsapp-soft text-channel-whatsapp',
  facebook: 'bg-channel-facebook-soft text-channel-facebook',
  tiktok: 'bg-channel-tiktok-soft text-channel-tiktok',
  widget: 'bg-channel-widget-soft text-channel-widget',
};

const GLYPH: Record<PlatformKey, ComponentType<{ size?: number; className?: string }>> = {
  instagram: IconInstagram,
  whatsapp: IconWhatsApp,
  facebook: IconFacebook,
  tiktok: IconTikTok,
  widget: IconWidget,
};

const SIZES = {
  sm: { box: 'size-6', icon: 14 },
  md: { box: 'size-8', icon: 16 },
  lg: { box: 'size-10', icon: 20 },
} as const;

/** The platform glyph in its tinted circle; `null` (the All scope / Default) is the sparkle on accent. */
export function PlatformGlyph({
  platform,
  size = 'md',
  className = '',
}: {
  platform: Platform | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const key = platform ? PLATFORM_KEYS[platform] : null;
  const Icon = key ? GLYPH[key] : IconSparkles;
  const tint = key ? TINT[key] : 'bg-accent-soft text-accent';
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${SIZES[size].box} ${tint} ${className}`}
    >
      <Icon size={SIZES[size].icon} />
    </span>
  );
}

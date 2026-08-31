import type { ReactElement } from 'react';
import { IconFacebook, IconInstagram, IconTikTok, IconWhatsApp, IconWidget } from '~ui';
import type { PreviewPlatform } from '../../lib/automationsParams';
import { PLATFORM_LABELS } from '../../lib/preview';

const GLYPH: Record<PreviewPlatform, (props: { size?: number; className?: string }) => ReactElement> = {
  instagram: IconInstagram,
  whatsapp: IconWhatsApp,
  facebook: IconFacebook,
  tiktok: IconTikTok,
  widget: IconWidget,
};

/* Static, not interpolated: Tailwind only ships classes it can read. */
const TEXT: Record<PreviewPlatform, string> = {
  instagram: 'text-channel-instagram',
  whatsapp: 'text-channel-whatsapp',
  facebook: 'text-channel-facebook',
  tiktok: 'text-channel-tiktok',
  widget: 'text-channel-widget',
};
const SOFT: Record<PreviewPlatform, string> = {
  instagram: 'bg-channel-instagram-soft',
  whatsapp: 'bg-channel-whatsapp-soft',
  facebook: 'bg-channel-facebook-soft',
  tiktok: 'bg-channel-tiktok-soft',
  widget: 'bg-channel-widget-soft',
};

export interface PlatformGlyphProps {
  platform: PreviewPlatform;
  /** Glyph size in px; the badge circle follows. */
  size?: number;
  /** Draw the tinted circle behind the glyph (a badge) rather than the bare glyph. */
  badge?: boolean;
  /** An on/off dot in the corner — the automation's `enabled`. Omit for none. */
  on?: boolean;
  className?: string;
}

/**
 * The platform glyph on its channel colour, optionally as a badge with the
 * automation's on/off dot — the same mark the Channels rail and the picker
 * rows use, so a platform reads the same everywhere in the module.
 */
export function PlatformGlyph({ platform, size = 14, badge = false, on, className = '' }: PlatformGlyphProps) {
  const Icon = GLYPH[platform];
  const glyph = <Icon size={size} className={TEXT[platform]} />;
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${badge ? `rounded-full ${SOFT[platform]} p-1.5` : ''} ${className}`}
      title={PLATFORM_LABELS[platform]}
    >
      {glyph}
      {on !== undefined ? (
        <span
          aria-label={on ? 'on' : 'off'}
          className={`absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border border-surface-raised ${on ? 'bg-success' : 'bg-text-faint'}`}
        />
      ) : null}
    </span>
  );
}

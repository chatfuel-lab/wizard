import { useState } from 'react';

export type AvatarShape = 'circle' | 'square';

export interface AvatarProps {
  src?: string | null;
  name: string;
  /** Pixel size. Default 36. */
  size?: number;
  /**
   * `square` is the rounded square an ACCOUNT wears — a channel tile, a brand,
   * a page — as against the circle a person wears. Two shapes rather than two
   * components, because everything else about them is identical: the same
   * fallback initials, the same deterministic hue, the same broken-image path.
   */
  shape?: AvatarShape;
}

/*
 * Deterministic color per name, so the same contact always looks the same.
 * Only the HUE lives here — lightness and chroma come from the --avatar-*
 * tokens, which the theme flips for dark mode. That keeps the one place in the
 * design system that needs a color ramp on the tokens-only contract.
 */
const HUES = [272, 350, 150, 85, 230, 305, 15];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function Avatar({ src, name, size = 36, shape = 'circle' }: AvatarProps) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  const corner = shape === 'square' ? 'rounded-card' : 'rounded-full';

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name}
        style={style}
        /* A contact's avatar is hosted wherever the channel put it, which is
           not a host this product chose. Without this the browser sends the
           dashboard's own URL — bot id, workspace id, the conversation being
           read — to that host as a Referer, and the request itself tells it
           the operator is looking at the thread right now. */
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setBroken(true)}
        className={`shrink-0 object-cover ${corner}`}
      />
    );
  }
  const hue = HUES[hashName(name) % HUES.length];
  return (
    <span
      style={{
        ...style,
        backgroundColor: `oklch(var(--avatar-bg-l) var(--avatar-bg-c) ${hue})`,
        color: `oklch(var(--avatar-fg-l) var(--avatar-fg-c) ${hue})`,
      }}
      className={`flex shrink-0 items-center justify-center font-medium select-none ${corner}`}
      aria-hidden
    >
      <span style={{ fontSize: size * 0.38 }}>{initials(name)}</span>
    </span>
  );
}

/* Status marks, theme switches, playback and the canvas tools. */
import { base, type IconProps } from './base';

export const IconCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** Double check — read/delivered ticks. */
export const IconChecks = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 6 7 17l-4-4" />
    <path d="m22 10-7.5 7.5L13 16" />
  </svg>
);

export const IconWarning = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

export const IconInfo = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
);

export const IconHeart = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19 14c1.5-1.5 2-3.2 2-5a5 5 0 0 0-9-3 5 5 0 0 0-9 3c0 1.8.5 3.5 2 5l7 7Z" />
  </svg>
);

export const IconBolt = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
  </svg>
);

export const IconPlay = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 3 14 9-14 9V3Z" />
  </svg>
);

/** A follow-up, something that comes back around. */
export const IconRepeat = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);

/* ── theme ─────────────────────────────────────────────────────────────── */

export const IconSun = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const IconMoon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

/** "Follow the system" glyph: a display. */
export const IconMonitor = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

/* ── canvas ────────────────────────────────────────────────────────────── */

/** Fit the scene to the viewport. Four corners pulling outward. */
export const IconMaximize = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

/** The select tool. An arrow cursor, which is what it selects with. */
export const IconPointer = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m4 3 6.5 17 2.5-7 7-2.5Z" />
  </svg>
);

/** The pan tool. */
export const IconHand = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 11V6a1.5 1.5 0 0 0-3 0" />
    <path d="M15 10V4.5a1.5 1.5 0 0 0-3 0V10" />
    <path d="M12 10V5.5a1.5 1.5 0 0 0-3 0V13" />
    <path d="M9 11.5V8a1.5 1.5 0 0 0-3 0v6a7 7 0 0 0 7 7h1a7 7 0 0 0 7-7v-3" />
  </svg>
);

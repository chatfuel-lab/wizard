/* ── channels ──────────────────────────────────────────────────────────
   Platform glyphs, drawn on the same 24-box stroke grammar as everything
   else in this set — outlines in currentColor, never the brand's filled
   mark — so a row of five reads as one set, and a `text-channel-*` glyph
   on its `bg-channel-*-soft` circle is the whole badge. Simplified to what
   survives 16px: the shapes are recognisable, not trademark-exact. */
import { base, type IconProps } from './base';

/** Rounded square, lens, flash dot. */
export const IconInstagram = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.5 6.5h.01" />
  </svg>
);

/** Round speech bubble with a handset inside. */
export const IconWhatsApp = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21z" />
    <path d="M9 8.5v1.5a5 5 0 0 0 5 5h1.5" />
  </svg>
);

/** The "f". */
export const IconFacebook = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M17 3h-2.5A4.5 4.5 0 0 0 10 7.5V10H7.5v4H10v7h4v-7h3l1-4h-4V7.5a1 1 0 0 1 1-1h2z" />
  </svg>
);

/** The note glyph — stem, head, and the hook off the top. */
export const IconTikTok = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 3v11.5a4 4 0 1 1-4-4" />
    <path d="M14 3a5 5 0 0 0 5 5" />
  </svg>
);

/**
 * The website chat widget: a square bubble with three dots. Square, not
 * round, on purpose — the round bubble with a tail is WhatsApp's silhouette,
 * and the two sit side by side in every channel row.
 */
export const IconWidget = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 10h.01" />
    <path d="M12 10h.01" />
    <path d="M16 10h.01" />
  </svg>
);

/** A story ring — the dashed avatar ring Instagram draws around an unseen story. */
export const IconStory = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" strokeDasharray="4 3" />
    <circle cx="12" cy="12" r="5" />
  </svg>
);

/** An ad, an announcement. */
export const IconMegaphone = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m3 11 18-5v12L3 14v-3z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);

/* ── assistant ─────────────────────────────────────────────────────────── */

export const IconSparkles = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v0l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
    <path d="M19 15v4" />
    <path d="M17 17h4" />
  </svg>
);

/**
 * The assistant's own mark.
 *
 * `IconSparkles` was doing this job, and two others: it is also the automations
 * glyph and the "AI Agent" nav group's. Three different things reading as one
 * is not a shortage of icons, it is the assistant having no identity in a
 * product whose nav has an AI section — so the coworker gets a face and the
 * sparkles go back to meaning "generated".
 */
export const IconAssistant = (p: IconProps) => (
  <svg {...base(p)}>
    <rect width="16" height="12" x="4" y="8" rx="3" />
    <path d="M12 4.5V8" />
    <circle cx="12" cy="3.5" r="1.5" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M9 13h.01" />
    <path d="M15 13h.01" />
    <path d="M9.5 16.5h5" />
  </svg>
);

/**
 * An arrow going INTO a frame — "take me to this screen".
 *
 * The mirror of `IconExternal`, which is an arrow leaving one, and the pair is
 * the distinction a frontend action needs: `navigate` moves the operator
 * inside the dashboard, a link in assistant prose sends them out of it.
 */
export const IconNavigate = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="m10 17 5-5-5-5" />
    <path d="M15 12H3" />
  </svg>
);

/** A wrench — a tool call with no better glyph of its own. */
export const IconTool = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

/**
 * A filled square — stop, as every transport control has drawn it for fifty
 * years. `IconClose` was the alternative and it reads as "dismiss this", which
 * at 14px beside a streaming message is the wrong promise: interrupting a
 * generation keeps the partial answer, it does not throw it away.
 */
export const IconStop = (p: IconProps) => (
  <svg {...base(p)}>
    <rect width="12" height="12" x="6" y="6" rx="2" fill="currentColor" />
  </svg>
);

/**
 * Concentric rings around a centre — a conversion: the one moment in a
 * conversation that an advertiser is paying to reach. `IconBolt` was the
 * alternative and it already means "an automation ran"; a target says what the
 * automation was aiming at.
 */
export const IconTarget = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

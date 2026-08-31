/**
 * What the two controls at the bottom of the composer say and how they are
 * drawn.
 *
 * They read as one object — a time on the left, the action on the right, joined
 * down the middle — because they are one decision: WHEN this goes out. The
 * primary is not a menu of options, it states the consequence of the time
 * beside it, so setting a time changes what the button says rather than adding
 * a second button that is always the wrong one.
 *
 * Where nothing can honour a time there is no left half, and then the primary
 * is a button in its own right with both its corners. That is the part that has
 * to be decided here rather than in the markup: a primary left with a flat left
 * edge and nothing against it is a control that looks broken, and it is exactly
 * what happens when the join is written as a constant and the other half is
 * conditional.
 */

import type { Band } from '~ui';

/** Which of the two things the primary button means when it is pressed. */
export type PublishIntent = 'schedule' | 'publish';

export interface FooterControls {
  /**
   * Whether the footer is a split control at all. False leaves the primary a
   * plain rounded button, because the half it would have been joined to is
   * absent.
   */
  split: boolean;
  /**
   * Whether the footer draws its own Cancel.
   *
   * Only where there is room for it. The panel already closes three other ways
   * — its own close button, Escape, and the scrim — so in a column narrow
   * enough that a fourth would push the strip onto a second row, the fourth is
   * the one that goes. A footer that wraps puts the primary somewhere different
   * from where it was a moment ago, which is worse than a button somebody has
   * two other ways to press.
   */
  cancel: boolean;
  intent: PublishIntent;
  primaryLabel: string;
}

export interface FooterOptions {
  /** The time on the draft, ISO 8601 — or null for "as soon as I press it". */
  scheduledAt: string | null;
  /** Whether anything in this deployment could make a post go out later. */
  canSchedule: boolean;
  /** A publish already in flight. The label holds still while it runs. */
  publishing?: boolean;
  /** The container the composer opened into, not the window. */
  band: Band;
}

export function footerControls({ scheduledAt, canSchedule, publishing = false, band }: FooterOptions): FooterControls {
  const intent: PublishIntent = scheduledAt !== null ? 'schedule' : 'publish';
  return {
    split: canSchedule,
    cancel: band === 'wide' || band === 'inline',
    intent,
    primaryLabel: publishing ? 'Publishing' : intent === 'schedule' ? 'Schedule post' : 'Publish now',
  };
}

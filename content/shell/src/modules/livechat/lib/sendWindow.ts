import { Platform } from '~api/generated/livechat/graphql';
import { messageDirection } from './direction';
import type { MessageEntry } from './threadStore';

/**
 * Whether a reply can be written at all, before it is written.
 *
 * Every platform limit in this product surfaces AFTER the fact, on the message,
 * through `messageUpdated` — `messageErrors.ts` is the file that turns those
 * into sentences. That is the right place for most of them, because most of
 * them are not knowable in advance: a rate limit, a paused template, a number
 * Meta decided not to deliver to.
 *
 * WhatsApp's 24-hour customer service window is the exception, and it is the
 * one that matters most. It is a pure function of the clock and of when the
 * contact last wrote, both of which are already on screen. An operator who is
 * not told will type a paragraph, send it, watch it sit there, and only then
 * read that the window closed — and the fix at that point is a template, which
 * is not something you reach by retrying the same text.
 */

export const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface SendWindow {
  /** The composer is usable. */
  open: boolean;
  /**
   * Why it is not — short enough to be the shut box's placeholder, which is
   * where it is shown. Not a paragraph under the composer: the template icon
   * beside the box is the way back, and it says so by being the one control
   * still lit. Set only when closed.
   */
  reason?: string;
}

const OPEN: SendWindow = { open: true };

/**
 * When the contact last wrote, or null if this thread does not show it.
 *
 * Walks from the newest end, so it stops at the first inbound message rather
 * than scanning history the operator has paged in. Optimistic sends have no
 * node and are outbound by construction, so they are skipped rather than
 * treated as unknown.
 */
export function lastInboundTime(entries: readonly MessageEntry[]): string | null {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const node = entries[i]!.node;
    if (node && messageDirection(node) === 'in') return node.sentTime;
  }
  return null;
}

/**
 * The window, from the platform and the last thing the contact said.
 *
 * Two rules, and the second is the one worth stating.
 *
 * WhatsApp only. The other four channels have windows too — Instagram's reply
 * window, TikTok's ten messages per 48 hours — and this build cannot compute
 * either honestly: TikTok's is a COUNT over a period, and the count depends on
 * history that may not be loaded. A gate that is right most of the time is
 * worse than no gate, because the times it is wrong it silently forbids a
 * message the operator is allowed to send.
 *
 * And nothing is blocked on ignorance. A thread whose loaded page holds no
 * inbound message at all yields no answer, and no answer means the composer
 * stays open. A false block strands the operator with no way to argue; a false
 * allow costs one message, and `messageErrors.ts` already explains that one on
 * the bubble the moment `messageUpdated` reports it.
 */
export function sendWindow(platform: Platform, lastInboundAt: string | null, now: number): SendWindow {
  if (platform !== Platform.Whatsapp || lastInboundAt === null) return OPEN;
  const at = Date.parse(lastInboundAt);
  if (!Number.isFinite(at)) return OPEN;
  if (now - at < WHATSAPP_WINDOW_MS) return OPEN;
  return {
    open: false,
    reason: '24-hour window closed',
  };
}

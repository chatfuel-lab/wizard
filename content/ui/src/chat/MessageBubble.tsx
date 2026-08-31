import type { ReactNode } from 'react';
/* One import, both meanings: `MessageStatus` is the component in a value
   position and the status union in a type position. See its file header. */
import { MessageStatus } from './MessageStatus';

export interface MessageBubbleProps {
  direction: 'in' | 'out';
  /** Preformatted time label. */
  time?: string;
  /** Shown above 'in' bubbles when present (group chats, operators). */
  senderName?: string;
  status?: MessageStatus;
  /** Delivery failure text (Message.errors[]) — red footnote under the bubble. */
  error?: string;
  /**
   * What sits UNDER the bubble, in its column and at its width cap, before the
   * timestamp: the message's buttons or list options (`MessageActions`).
   * Under, because a button inside the bubble box reads as part of the text —
   * WhatsApp draws them as their own rows, and so does every inbox that shows
   * WhatsApp.
   */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Platform-agnostic bubble shared by livechat, the test chat (directions
 * inverted there — the reader IS the contact) and coworker. The payload (text,
 * image, fallback chip) is rendered by the caller as children.
 *
 * The delivery glyph is `MessageStatus`, not a private switch: the same five
 * states appear in a thread footer, in a failed-send retry row and in a
 * message detail panel, and they were already drifting apart between the first
 * two.
 */
export function MessageBubble({ direction, time, senderName, status, error, actions, children }: MessageBubbleProps) {
  const out = direction === 'out';
  return (
    <div className={`flex flex-col ${out ? 'items-end' : 'items-start'}`}>
      {senderName && !out ? <span className="mb-0.5 px-1 text-xs text-text-muted">{senderName}</span> : null}
      <div
        className={`max-w-[75%] rounded-bubble px-3 py-2 text-sm break-words ${
          out
            ? 'rounded-br-sm bg-bubble-out text-bubble-out-fg'
            : 'rounded-bl-sm border border-border bg-bubble-in text-bubble-in-fg'
        }`}
      >
        {children}
      </div>
      {/* Chips gather towards the bubble's own edge — the right for an
          outgoing message — so a short bubble and its buttons read as one
          thing rather than a bubble and a row that starts elsewhere. */}
      {actions ? <div className={`mt-1 w-full max-w-[75%] ${out ? '[&>*]:justify-end' : ''}`}>{actions}</div> : null}
      <span
        className={`mt-0.5 flex items-center gap-1 px-1 text-micro ${
          status === 'failed' ? 'text-danger' : 'text-text-faint'
        }`}
      >
        {time}
        {out && status ? <MessageStatus status={status} /> : null}
      </span>
      {error ? <span className="max-w-[75%] px-1 text-xs text-danger">{error}</span> : null}
    </div>
  );
}

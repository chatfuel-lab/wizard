import type { ReactNode } from 'react';
import { IconBellOff } from '../icons';
import { Avatar } from '../primitives/Avatar';
import { Badge } from '../primitives/Badge';

export interface ConversationAssignee {
  name: string;
  avatarUrl?: string | null;
}

export interface ConversationListItemProps {
  /**
   * What the row is called.
   *
   * A node rather than a string, because a rail that searches its own list
   * computes the character ranges the query matched and then has nowhere to put
   * them: the ranking survives and the underline does not. Marked-up text goes
   * here — `highlightRanges` produces exactly the segments it wants.
   *
   * The default avatar takes its initials from this and can only do that while
   * it is a plain string, so a caller passing markup should say what the avatar
   * is. See `avatar`.
   */
  name: ReactNode;
  avatarUrl?: string | null;
  /**
   * What stands to the left of the lines.
   *
   * Left out, a 40px `Avatar` is drawn from `avatarUrl` and the initials of
   * `name` — an inbox of people, which is what this row was first built for.
   *
   * `false` draws nothing and gives the text the width back. That is not a
   * density option: a conversation with an ASSISTANT has no face, and a
   * coloured circle holding the first letters of a server-generated title
   * ("How much should I charge?" → "HM") is decoration that reads as data.
   * Any other node replaces the avatar outright — a module's own mark, a
   * channel glyph — and is rendered as given, so the caller sizes it.
   *
   * Explicit on purpose: an avatar that disappeared because `name` stopped
   * being a string would be a rendering decision made by a type.
   */
  avatar?: ReactNode | false;
  /**
   * The last message, already flattened to a string by the caller. It has to
   * be: a message is a union of a dozen platform payloads, and only the module
   * that fetched it knows whether "📷 Photo" or a caption is the honest
   * summary of the one it got.
   */
  preview?: ReactNode;
  /**
   * Preformatted. Time is the one thing a shared primitive must not decide —
   * the list wants "14:03" today and "Aug 11" before that, which is a locale,
   * a timezone and a "now" that this component has no business holding.
   */
  timestamp?: string;
  unreadCount?: number;
  /**
   * Emphasise the row even at zero — a conversation the operator marked unread
   * by hand has nothing to count but is still waiting for them.
   */
  unread?: boolean;
  assignee?: ConversationAssignee | null;
  /** A third line: platform, status, "wants a human". */
  meta?: ReactNode;
  selected?: boolean;
  muted?: boolean;
  onSelect?: () => void;
  className?: string;
}

/**
 * One row of an inbox.
 *
 * A button, not a link and not a div: selecting a conversation is an in-place
 * state change of the module, it has to be reachable by Tab and by Enter, and
 * `aria-current` is what tells a screen reader which of two hundred rows is the
 * open one. (`aria-selected` would be the better word and is invalid outside a
 * listbox, which this is not — the rows are not options and the list scrolls
 * independently of the thread beside it.)
 *
 * Three lines is the maximum, and the third is optional, because the row height
 * is what decides how much of an inbox fits on a screen. Everything that could
 * become a fourth line — SLA timers, tags, channel icons — belongs in `meta`,
 * which the module composes.
 *
 * Two of the props are wider than an inbox needs and both were widened by its
 * second consumer, an assistant rail: `name` takes a node so a search hit can
 * be underlined, and `avatar` can be turned off so a chat with software is not
 * given a face. Neither changes anything for a caller that passes a string and
 * leaves the avatar alone.
 */
export function ConversationListItem({
  name,
  avatarUrl,
  avatar,
  preview,
  timestamp,
  unreadCount = 0,
  unread,
  assignee,
  meta,
  selected = false,
  muted = false,
  onSelect,
  className = '',
}: ConversationListItemProps) {
  const emphasise = (unread ?? unreadCount > 0) && !selected;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={`flex w-full items-start gap-3 border-b border-border-subtle px-3 py-2.5 text-left transition-colors duration-fast ease-standard focus-visible:focus-ring ${
        selected ? 'bg-row-selected hover:bg-row-selected-hover' : 'hover:bg-row-hover'
      }${className ? ` ${className}` : ''}`}
    >
      {avatar === false ? null : avatar === undefined ? (
        /* `''` rather than a cast when the name is markup: `Avatar` answers
           "?" for it, which looks like the mistake it is, instead of taking
           the initials of whatever text happened to be first in the tree. */
        <Avatar src={avatarUrl} name={typeof name === 'string' ? name : ''} size={40} />
      ) : (
        <span className="shrink-0">{avatar}</span>
      )}

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={`min-w-0 flex-1 truncate text-sm ${
              muted ? 'text-text-muted' : 'text-text'
            } ${emphasise ? 'font-semibold' : 'font-medium'}`}
          >
            {name}
          </span>
          {muted ? (
            <span className="shrink-0 text-text-faint" title="Muted">
              <IconBellOff size={12} />
            </span>
          ) : null}
          {timestamp ? (
            <span className={`shrink-0 tabular-nums text-micro ${emphasise ? 'text-accent' : 'text-text-faint'}`}>
              {timestamp}
            </span>
          ) : null}
        </span>

        <span className="mt-0.5 flex items-center gap-2">
          <span className={`min-w-0 flex-1 truncate text-xs ${emphasise ? 'text-text' : 'text-text-muted'}`}>
            {preview}
          </span>
          {/* A muted row keeps its count and loses its colour. */}
          <Badge count={unreadCount} tone={muted ? 'muted' : 'accent'} />
        </span>

        {meta || assignee ? (
          <span className="mt-1 flex items-center gap-2">
            {meta ? (
              <span className="min-w-0 flex-1 truncate text-nano text-text-faint">{meta}</span>
            ) : (
              <span className="flex-1" />
            )}
            {assignee ? (
              <span className="flex shrink-0 items-center gap-1 rounded-chip bg-surface-sunken py-0.5 pr-1.5 pl-0.5 text-nano text-text-muted">
                <Avatar src={assignee.avatarUrl} name={assignee.name} size={16} />
                <span className="max-w-24 truncate">{assignee.name}</span>
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </button>
  );
}

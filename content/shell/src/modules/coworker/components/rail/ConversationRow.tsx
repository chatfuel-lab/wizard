import type { ReactNode } from 'react';
import {
  ConversationListItem,
  highlightRanges,
  IconPin,
  markdownToPlainText,
  MenuButton,
  shortTime,
  type MenuItem,
  type TextRange,
} from '~ui';
import type { RailRow } from '../../lib/chatListStore';

export interface ConversationRowProps {
  row: RailRow;
  selected: boolean;
  onSelect: () => void;
  onRename: () => void;
  onPin: (pinned: boolean) => void;
  /**
   * Say "pinned" on the row itself. Off under the Pinned heading, where the
   * heading already said it; on while searching, where there are no headings.
   */
  showPinned?: boolean;
}

/**
 * The third line, and it is usually nothing.
 *
 * A rail where every row carries a status line is a rail where none of them is
 * read, so only the two states that change what pressing the row means get one:
 * the assistant is working in there, or it is blocked waiting for this
 * operator. Returned as a node rather than rendered as a component because
 * `ConversationListItem` reserves the line for a truthy `meta`, and a component
 * that renders null is still truthy — that is an empty third line on every row.
 */
function rowState(row: RailRow, showPinned: boolean): ReactNode {
  const { state } = row;
  const pending = state.pendingAction?.__typename;

  /* A dot and a word, in the row's own muted colour. These used to be amber,
     red and indigo sentences, and three coloured lines down a list of three
     chats is a list that is entirely status — the colour said "alarm" about
     something the operator had chosen to leave open. The dot carries the
     difference; the row carries the reading. */
  if (pending === 'CoworkerToolApprovalRequest') {
    return (
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
        Waiting for you
      </span>
    );
  }
  if (pending === 'CoworkerUserMessageRejected') {
    return (
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
        Message rejected
      </span>
    );
  }
  if (state.isAgentLoopActive) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent motion-safe:animate-pulse" />
        Working…
      </span>
    );
  }
  if (showPinned && row.pinned) {
    return (
      <span className="flex items-center gap-1">
        <IconPin size={10} />
        Pinned
      </span>
    );
  }
  return null;
}

/**
 * The title, with the part the search matched marked.
 *
 * The rail's matcher already knew this — `filterItems` returns the character
 * ranges alongside the score — and the ranges used to be computed and thrown
 * away, because the primitive took a string. So a ranked list arrived in an
 * order the reader had no way to account for: the third row is above the
 * fourth, and nothing on either of them says why.
 *
 * `<mark>` rather than a styled span: it is the element that means "this is
 * here because you looked for it", and a screen reader says so. Unstyled it
 * is a yellow highlighter in both themes, so it takes the accent pair.
 */
function Title({ text, ranges }: { text: string; ranges: readonly TextRange[] }): ReactNode {
  if (ranges.length === 0) return text;
  return highlightRanges(text, ranges).map((segment, index) =>
    segment.match ? (
      <mark key={index} className="rounded-[2px] bg-accent-soft text-accent">
        {segment.text}
      </mark>
    ) : (
      <span key={index}>{segment.text}</span>
    ),
  );
}

/**
 * One chat in the rail — `~ui`'s `ConversationListItem`, not a row of its own.
 *
 * The module used to hand-roll a two-line button here, which is how it ended up
 * with its own hover colour, its own focus behaviour and no `aria-current`
 * while the rest of the system had all three. The one thing the primitive
 * cannot do is carry a control, because it *is* a button and a button does not
 * nest — so the `⋯` menu is a sibling laid over its top-right corner, revealed
 * on hover and on focus-within, and painted with the row's own background so it
 * replaces the timestamp rather than sitting on top of it.
 *
 * No avatar. Every row in this rail is a conversation with the same piece of
 * software, so a face is not identity — and the one the primitive would draw is
 * the initials of a server-generated sentence in a colour hashed from it: "How
 * is my pipeline doing?" becomes a purple HI. That is decoration that reads as
 * data, and it costs 52px of a rail that lives in a 400px popover.
 */
export function ConversationRow({
  row,
  selected,
  onSelect,
  onRename,
  onPin,
  showPinned = false,
}: ConversationRowProps) {
  const menu: MenuItem[] = [
    { id: 'rename', label: 'Rename…', onSelect: onRename },
    {
      id: 'pin',
      label: row.pinned ? 'Unpin' : 'Pin to the top',
      checked: row.pinned,
      onSelect: () => onPin(!row.pinned),
    },
  ];

  return (
    <li className="group/row relative">
      <ConversationListItem
        name={<Title text={row.title} ranges={row.titleMatch} />}
        avatar={false}
        /* The preview is a message, and a message is markdown: the raw source
           put `**Deals**` and an opening ```json fence into a one-line summary
           in practice. Flattened here rather than upstream because the
           thread wants the source and only this row wants it spoken. */
        preview={row.preview === null ? 'No messages yet' : markdownToPlainText(row.preview)}
        timestamp={shortTime(row.state.updatedAt)}
        /* Approximate, and the API says so: `unreadMessagesCountFromAssistant`
           increments on every assistant message including the invisible ones a
           tool call produces, so a single answer can arrive as "4". It is shown
           anyway — the count is wrong by a few, and "something came back while
           you were away" is the thing the row has to say. The read marker is
           all-or-nothing (guide.md), so there is no finer number to be had. */
        unreadCount={row.state.unreadMessagesCountFromAssistant}
        selected={selected}
        onSelect={onSelect}
        meta={rowState(row, showPinned)}
      />
      {/* Hover and focus-within bring it back for a pointer and for a Tab user;
          below the compact band neither happens, so it stays out for good —
          Tailwind compiles `hover:` inside `@media (hover: hover)`, and an
          opacity-0 element still takes pointer events (deals' lesson). The
          background matches the row in all four of its states so the control
          replaces the timestamp instead of overprinting it. */}
      <span
        className={`absolute right-1 top-1 rounded-control opacity-0 transition-opacity duration-fast ease-standard focus-within:opacity-100 group-hover/row:opacity-100 @max-compact:opacity-100 ${
          selected
            ? 'bg-row-selected group-hover/row:bg-row-selected-hover'
            : 'bg-surface-raised group-hover/row:bg-row-hover'
        }`}
      >
        <MenuButton items={menu} label={`Actions for ${row.title}`} />
      </span>
    </li>
  );
}

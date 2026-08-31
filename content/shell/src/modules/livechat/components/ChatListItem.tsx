import { Avatar, Badge, MessageStatus, highlightRanges, shortTime } from '~ui';
import { nameHighlight } from '../lib/inboxList';
import { PLATFORM_LABEL } from '../lib/platform';
import { previewOf, previewStatus } from '../lib/preview';
import type { ChatNode } from '../types';
import { SHAPE_GLYPH } from './bubbles/DescribedBubble';

/**
 * The second line: the last message in one line, with the shape's glyph for
 * anything that is not plain text and the delivery tick for an outgoing
 * message. All of it decided in `lib/preview.ts`; this only draws it.
 */
function Preview({ chat }: { chat: ChatNode }) {
  const last = chat.conversation?.lastMessage;
  const preview = previewOf(last);
  const status = previewStatus(last);
  const Glyph = preview.icon ? SHAPE_GLYPH[preview.icon] : null;
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1 text-xs text-text-muted">
      {status ? <MessageStatus status={status} /> : null}
      {Glyph ? <Glyph size={12} className="shrink-0" /> : null}
      <span className="truncate">{preview.text}</span>
    </span>
  );
}

export interface ChatListItemProps {
  chat: ChatNode;
  selected: boolean;
  onSelect: (id: string) => void;
  /** The active search text. Highlighting only — the server decided membership. */
  query?: string;
  /** Set on one rendered row so the virtual list can learn its height. */
  rowRef?: (element: HTMLButtonElement | null) => void;
}

export function ChatListItem({ chat, selected, onSelect, query = '', rowRef }: ChatListItemProps) {
  /* Empty unless the query occurs in the name verbatim. A row can be here
     because its PHONE matched, and marking up the name in that case would tell
     the reader something untrue about why they are looking at it. */
  const ranges = nameHighlight(chat.name, query);

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={() => onSelect(chat.id)}
      className={`flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left transition-colors ${
        selected ? 'bg-accent-soft' : 'hover:bg-surface-hover'
      }`}
    >
      <Avatar src={chat.profilePictureUrl} name={chat.name} size={40} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium text-text">
            {ranges.length === 0
              ? chat.name
              : highlightRanges(chat.name, ranges).map((segment, index) =>
                  segment.match ? (
                    /* Colour and weight, no background — the same spelling
                       Combobox and the command palette use. A tinted mark would
                       be invisible on the selected row, whose own background is
                       `bg-accent-soft`, and that is the row a reader is most
                       likely to be looking at after clicking a search hit. */
                    <mark key={index} className="bg-transparent font-semibold text-accent">
                      {segment.text}
                    </mark>
                  ) : (
                    <span key={index}>{segment.text}</span>
                  ),
                )}
          </span>
          <span className="shrink-0 text-micro text-text-faint">{shortTime(chat.lastConversationMessageTime)}</span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <Preview chat={chat} />
          <Badge count={chat.unreadMessagesCount} />
        </span>
        <span className="mt-0.5 block text-nano text-text-faint">
          {chat.conversation ? PLATFORM_LABEL[chat.conversation.platform] : null}
          {/* Open is the normal state and says nothing; the other two are
              the ones that change what pressing the row means — the bot has
              it, or nobody does. */}
          {chat.conversation?.status === 'automated' ? ' · automated' : ''}
          {chat.conversation?.status === 'closed' ? ' · closed' : ''}
          {chat.unhandledSwitchToHuman ? ' · wants a human' : ''}
        </span>
      </span>
    </button>
  );
}

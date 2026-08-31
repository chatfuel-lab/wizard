import { CoworkerMessageRole } from '~api/generated/coworker/graphql';
import { messageText } from '../lib/messages';
import type { MessageViewProps } from './contracts';
import { MessageAffordances } from './thread/MessageAffordances';
import { MessageAttachments } from './thread/MessageAttachments';
import { MessageContent } from './thread/MessageContent';

/**
 * One thing that was said — by the operator, or by the assistant.
 *
 * The two sides are drawn differently on purpose, and the asymmetry is the
 * whole design decision in this file.
 *
 * The operator's messages are short, one thought each, and they are the half of
 * the thread that has a delivery state — so they sit in a block, right-aligned,
 * the way a sent thing reads. But a *quiet* block: the saturated accent bubble
 * this used to draw is right in a messaging inbox, where the two speakers are
 * two people and the colour tells you which is which at a glance down a list of
 * chats. Here the two speakers are a person and a tool, the thread is read as a
 * document, and a wall of brand-coloured rectangles down the right-hand side is
 * the loudest thing on a screen that should be almost silent.
 *
 * The assistant's are not blocks at all. They are markdown: headings, bullet
 * lists, tables of numbers, fenced JSON. A bubble at 75% of the column starves
 * a code fence of width in a narrow pane, and its rounded box fights every
 * block element inside it. So an answer is simply prose, at the width of the
 * column, with nothing drawn around it.
 *
 * And no name above it. There is exactly one assistant in this thread and its
 * name is on the panel it lives in; labelling every answer "Coworker" is a
 * caption on the only photograph in the room.
 */

const SEND_FAILED = 'Not sent — check your connection, and that you still have access to this bot.';

export function MessageView({ message, grouped, pending, failed, onRetry, compact }: MessageViewProps) {
  const text = messageText(message);
  /* Parsed here as well as in `threadRows`, because the frozen props carry the
     node rather than the row. `timeOfDay` renders '' for a NaN, so a malformed
     `Time` costs a label and never an exception. */
  const at = Date.parse(message.time);

  if (message.role === CoworkerMessageRole.User) {
    return (
      /* `group` and padding rather than margin: the affordance row below reveals
         on hover of the whole message, and the list measures rows by
         `offsetHeight`, which counts padding and ignores margins. A margin here
         would make every row a few pixels shorter than the virtualizer thinks
         it is, and the error accumulates down a long thread. */
      <div className={`group flex flex-col items-end ${grouped ? 'pt-1' : 'pt-4'}`}>
        <div
          className={`max-w-[85%] rounded-bubble bg-surface-sunken px-3.5 py-2.5 text-body text-text ${
            pending ? 'opacity-60' : ''
          } ${failed ? 'border border-danger' : ''}`}
        >
          {text ? <MessageContent text={text} compact={compact} /> : null}
          <MessageAttachments attachments={message.attachments} />
        </div>
        {failed ? <p className="mt-1 text-meta text-danger">{SEND_FAILED}</p> : null}
        <MessageAffordances at={at} text={text} align="end" onRetry={failed ? onRetry : undefined} />
      </div>
    );
  }

  return (
    <div className={`group ${grouped ? 'pt-1' : 'pt-4'}`}>
      <div className="text-text">
        {text ? <MessageContent text={text} compact={compact} /> : null}
        <MessageAttachments attachments={message.attachments} />
      </div>
      <MessageAffordances at={at} text={text} align="start" />
    </div>
  );
}

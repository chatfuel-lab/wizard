import { IconAssistant, StreamingText } from '~ui';
import { MessageContent } from './MessageContent';

/**
 * The answer as it is being written.
 *
 * Drawn exactly like a finished one — same column, same width cap, same
 * components — so the moment `CoworkerMessageAdded` replaces the buffer the
 * text does not reflow. A streaming state that looks different from its own
 * result makes the thread jump on every reply, which is the tell that it is a
 * separate code path; here it is the same components with a caret on the end.
 *
 * The one thing a finished answer does not carry is the name above it: while
 * the words are still arriving it says who is writing them, and it is the
 * module's own name, the one on the rail and on the page header.
 *
 * `text` is everything received so far, not the latest chunk — the hook already
 * accumulates and batches, and `StreamingText` reveals the difference at a
 * bounded number of characters a frame so a burst of chunks does not arrive as
 * a slab. It also reconciles a SHORTER authoritative text without taking
 * anything back off the screen, which is the interrupted case: stopping a run
 * persists the partial content, and un-writing words somebody has already read
 * would be the interface disagreeing with itself.
 *
 * The caret comes back from `StreamingText` as a node rather than being drawn
 * here, and goes into `Markdown`'s `trailing`, which is the only place that
 * knows where the last word is. There is no `done`: a stream exists in the
 * store only while it is running, and the message replacing it is a different
 * row.
 */
export function StreamingMessage({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className="pt-2">
      <div className="mb-1 flex items-center gap-1.5 text-micro font-medium text-text-muted">
        <IconAssistant size={12} className="text-accent" />
        Copilot
      </div>
      {/* `aria-live="polite"` and nothing else: the list itself is aria-live
          off, because a virtualized log would re-announce the whole thread on
          every scroll frame. This one node is the exception — it is the part a
          reader who cannot see it needs read out, and it is one node. */}
      <div className="max-w-[68ch] text-text" aria-live="polite" aria-atomic="false">
        <StreamingText
          text={text}
          render={(visible, caret) => <MessageContent text={visible} trailing={caret} compact={compact} />}
        />
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { IconInfo, Popover } from '~ui';
import { MAX_CONTACTS, MAX_CONVERSATIONS } from '../../lib/gapScanPolicy';

/** Long enough that crossing the link on the way somewhere else does not open it. */
const OPEN_DELAY_MS = 120;
/** Long enough to travel from the trigger into the panel without it closing. */
const CLOSE_DELAY_MS = 160;

/**
 * The blind spots, one hover away.
 *
 * They have to be reachable, because a report that hides what it cannot see
 * reads as a census; they just do not have to be read first.
 *
 * Hover AND click AND focus all open it: hover is the fast path, click is the
 * touch path, focus is the keyboard path. Both timers exist for one reason
 * each - opening on a pointer that was only passing through is a flicker, and
 * closing the instant the pointer leaves the trigger makes the panel
 * unreachable, since the gap between them is not part of either.
 */
export function GapLimits() {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const schedule = (next: boolean, delay: number) => {
    cancel();
    timer.current = window.setTimeout(() => setOpen(next), delay);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="bottom-start"
      /* A hover panel must not take the focus it never asked for. */
      trapFocus={false}
      aria-label="What this scan cannot see"
      className="max-w-sm p-3"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          onMouseEnter={() => schedule(true, OPEN_DELAY_MS)}
          onMouseLeave={() => schedule(false, CLOSE_DELAY_MS)}
          onFocus={() => {
            cancel();
            setOpen(true);
          }}
          onBlur={() => schedule(false, 0)}
          className="inline-flex items-center gap-1.5 rounded-chip text-xs text-text-muted transition-colors duration-fast ease-standard hover:text-text focus-visible:focus-ring"
        >
          <IconInfo size={13} />
          What this cannot see
        </button>
      )}
    >
      <div onMouseEnter={cancel} onMouseLeave={() => schedule(false, CLOSE_DELAY_MS)}>
        <ul className="flex flex-col gap-2 text-xs leading-relaxed text-text-muted">
          <li>
            <span className="font-medium text-text">Hand-offs a teammate already opened.</span> Chatfuel clears the flag
            the moment somebody opens the chat. Chats a person still owns are found; one that was opened and handed back
            to the AI is not.
          </li>
          <li>
            <span className="font-medium text-text">Anything older than the {MAX_CONTACTS} most recent chats</span>, or
            past the {MAX_CONVERSATIONS}th hand-off. The API pages a chat list and has no search for
            &ldquo;conversations that went wrong&rdquo;.
          </li>
          <li>
            <span className="font-medium text-text">Questions that were not typed.</span> A voice note, a photo or a
            button press carries no text, so the chat is counted and the question is not.
          </li>
          <li>
            <span className="font-medium text-text">Meaning.</span> Questions are grouped by the words they share, not
            by what they mean. Read the samples before writing an answer.
          </li>
        </ul>
      </div>
    </Popover>
  );
}

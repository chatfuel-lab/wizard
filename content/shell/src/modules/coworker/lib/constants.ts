export const CONVERSATIONS_PAGE_SIZE = 30;
export const MESSAGES_PAGE_SIZE = 50;

/**
 * Resilience pattern from the skill guide: no event for ~15s while a loop is
 * active → refetch state. isAgentLoopActive can still read true after the loop
 * has ended, and a loop that never starts says nothing —
 * so after LOOP_STUCK_MS without events we stop showing the typing indicator
 * and say the loop is stuck, with a way out.
 */
export const STALL_REFETCH_MS = 15_000;
export const LOOP_STUCK_MS = 120_000;

/**
 * How often the accumulated streaming chunks are handed to React.
 *
 * A short answer arrives as hundreds of chunks. One `setState` per chunk is
 * that many renders of the whole thread — with a virtualized
 * list, a measurement pass and a scroll correction on each — for text that a
 * reader perceives as a single smooth fill either way. So chunks land in a ref
 * and a timer hands over whatever accumulated.
 *
 * 60ms rather than a `requestAnimationFrame`: rAF is one flush per frame, which
 * is still 60 renders a second and no less work than the chunks themselves
 * caused; and rAF stops entirely in a background tab, so a thread left running
 * behind another window would hold its buffer until the operator came back.
 * A timer keeps filling, at ~16 renders a second, which is under the ~100ms
 * that reads as instant and cheap enough not to matter.
 */
export const CHUNK_FLUSH_MS = 60;

/**
 * How long after a message the next one from the same author still belongs to
 * it — the same author, in a row, drawn as one block rather than four.
 *
 * Three minutes because that is roughly the span of one exchange with an
 * assistant: a question, a run, an answer, a follow-up. Beyond it the two are
 * separate thoughts and the second deserves its own timestamp.
 *
 * A run of tool steps always breaks the group, whatever the clock says —
 * something happened between those two sentences and the thread has to show it.
 */
export const GROUP_WINDOW_MS = 3 * 60_000;

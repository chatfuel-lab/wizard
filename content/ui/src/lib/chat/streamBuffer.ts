/**
 * What a streamed message shows on this frame.
 *
 * ## The measurement this exists for
 *
 * 208 streaming chunks arrived for three short answers in practice.
 * The module appends each one to React state as it lands, so a two-sentence
 * reply re-renders the thread seventy times — and each of those renders
 * re-parses the markdown, re-measures the virtualized list and re-runs its
 * bottom-anchoring decision. The chunks are not the problem; treating each of
 * them as a render is.
 *
 * So the arriving text and the visible text are separated. Chunks accumulate
 * into `received` at whatever rate the socket delivers them, which costs a
 * string concatenation; `revealed` moves once per animation frame, which costs
 * a render. Sixty renders a second is the ceiling however fast the server talks.
 *
 * ## Why the reveal is paced rather than instant
 *
 * Because chunk arrival is lumpy and reading is not. Chunks come in bursts —
 * six in one frame, none for the next four — and a buffer that simply shows
 * everything it has produces text that arrives in visible slabs. Revealing a
 * bounded number of characters per frame turns the same bytes into an even
 * flow, at the cost of trailing the socket by a few tens of milliseconds.
 *
 * That trade is only acceptable while the trailing stays small, which is what
 * `catchUpAt` is for: past a backlog that big the pacing is abandoned and
 * everything is shown at once. Without it a long answer that arrives in one
 * burst — the polling client's case, where the whole message lands complete —
 * would type itself out for ten seconds after it had already been received.
 *
 * Under `prefers-reduced-motion` there is no pacing at all: the component
 * passes `instant`, and the text simply appears. An animated reveal is motion,
 * and the person asked not to be shown any.
 *
 * ## Why it is a module with tests
 *
 * Three of the rules below are invisible to any test a component could have —
 * they are about what happens between two frames — and every one of them was a
 * real bug in some streaming chat somewhere: text that un-reveals when the
 * authoritative message replaces the deltas, a caret left blinking on a
 * finished message, and a stream that never settles because the last partial
 * frame revealed zero characters.
 */

export interface StreamState {
  /** Everything received so far, in arrival order. */
  received: string;
  /** How many characters of `received` are on screen. Never decreases. */
  revealed: number;
  /** The server said this message is finished. No more chunks are coming. */
  ended: boolean;
}

export const EMPTY_STREAM: StreamState = { received: '', revealed: 0, ended: false };

/** A stream that is already whole — a message loaded from history. */
export function settledStream(text: string): StreamState {
  return { received: text, revealed: text.length, ended: true };
}

/** One `CoworkerMessageStreamingChunk`. Chunks are deltas, so this appends. */
export function receiveChunk(state: StreamState, chunk: string): StreamState {
  if (chunk === '') return state;
  return { ...state, received: state.received + chunk };
}

/**
 * The authoritative full message arrived and replaces the accumulated deltas.
 *
 * `CoworkerMessageAdded` carries the whole message and the guide says to
 * overwrite the buffer with it — chunks can be lost, reordered or duplicated,
 * and the server's copy is the one that is right.
 *
 * The subtlety is `revealed`: the authoritative text can be SHORTER than what
 * has already been shown (a stream interrupted by `stopStreaming` persists only
 * the partial content, and a duplicated chunk makes the buffer longer than the
 * truth). Letting `revealed` stand would index past the end; recomputing it
 * from the new length would take characters back off the screen, which reads as
 * the assistant retracting what it just said. So it is clamped, never reduced
 * below what a reader has already seen except where the text itself is gone.
 */
export function replaceText(state: StreamState, text: string): StreamState {
  return { ...state, received: text, revealed: Math.min(state.revealed, text.length) };
}

/** The loop finished. Whatever is still buffered gets revealed, then it settles. */
export function endStream(state: StreamState): StreamState {
  return state.ended ? state : { ...state, ended: true };
}

export interface AdvanceOptions {
  /**
   * Characters revealed per frame. Default 8 — about 480 characters a second,
   * which outruns every model this renders while still smoothing a burst.
   */
  charsPerFrame?: number;
  /**
   * Backlog past which pacing is abandoned and everything is shown. Default
   * 400 characters: roughly a paragraph, which is the point at which typing it
   * out stops feeling live and starts feeling slow.
   */
  catchUpAt?: number;
  /** Reveal everything now. Reduced motion, or a message that is already whole. */
  instant?: boolean;
}

/**
 * Move the reveal on by one frame.
 *
 * Idempotent once there is nothing left to show, so a component may call it
 * every frame without checking; `advance(state) === state` is the signal to
 * stop scheduling frames, and identity is the test rather than a comparison of
 * fields because that is what a React state setter bails out on.
 */
export function advance(state: StreamState, options: AdvanceOptions = {}): StreamState {
  const pending = state.received.length - state.revealed;
  if (pending <= 0) return state;

  const { charsPerFrame = 8, catchUpAt = 400, instant = false } = options;
  /* A non-positive rate would reveal nothing forever and the caret would blink
     under a finished message until the tab was closed. */
  const rate = Number.isFinite(charsPerFrame) && charsPerFrame > 0 ? Math.floor(charsPerFrame) : 8;

  if (instant || pending >= catchUpAt) {
    return { ...state, revealed: state.received.length };
  }
  return { ...state, revealed: Math.min(state.revealed + rate, state.received.length) };
}

/** What to render this frame. */
export function visibleText(state: StreamState): string {
  return state.revealed >= state.received.length ? state.received : state.received.slice(0, state.revealed);
}

/** Nothing left to reveal and nothing left to arrive. */
export function isSettled(state: StreamState): boolean {
  return state.ended && state.revealed >= state.received.length;
}

/**
 * Whether the caret belongs on screen.
 *
 * The rule, stated as code: never on finalized text. A message the
 * reader scrolls back to two days later must not look like it is still being
 * written, and a message whose last chunk has landed but is still revealing
 * must — because it is.
 */
export function showCaret(state: StreamState): boolean {
  return !isSettled(state);
}

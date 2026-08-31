import { useEffect, useRef, useState, type ReactNode } from 'react';
import { prefersReducedMotion } from '../lib/interaction/motion';
import { defaultScheduler } from '../lib/interaction/rafThrottle';
import {
  advance,
  isSettled,
  replaceText,
  settledStream,
  showCaret,
  visibleText,
  type StreamState,
} from '../lib/chat/streamBuffer';

export interface StreamingTextProps {
  /**
   * Everything received so far — the accumulated text, not the latest delta.
   * Grow it and the component reveals the difference; replace it wholesale (the
   * authoritative `CoworkerMessageAdded` overwriting the buffered chunks) and
   * it reconciles without taking anything back off the screen.
   */
  text: string;
  /** The loop finished. Everything shows, and the caret goes. */
  done?: boolean;
  /**
   * How the revealed text is drawn. The default is preformatted plain text.
   *
   * `caret` is the second argument rather than something this component
   * positions, because only the renderer knows where the end of the text is:
   * pass it to `Markdown`'s `trailing` and it sits after the last word;
   * ignore it and there is no caret. See the note below.
   */
  render?: (visible: string, caret: ReactNode) => ReactNode;
  /** Characters revealed per frame. Default 8. */
  charsPerFrame?: number;
  /** Fires once, when the last character reaches the screen. */
  onSettled?: () => void;
  className?: string;
}

/**
 * A message that is still being written.
 *
 * ## The two problems, and which half solves which
 *
 * **Too many renders.** A short answer arrives as hundreds of chunks, and the
 * module sets React state per chunk — so a two-sentence reply
 * re-renders the thread seventy times, each of which re-parses markdown and
 * re-runs the virtualized list's measurement. Here the chunks land in a plain
 * object and only the frame loop sets state, so the ceiling is one render per
 * animation frame however fast the socket talks.
 *
 * **Lumpy text.** Chunks arrive in bursts, and text that appears in slabs reads
 * as stuttering rather than as writing. The reveal is paced to a bounded number
 * of characters per frame, with a catch-up so a long answer that arrives all at
 * once is not typed out for ten seconds afterwards. All of that is
 * `lib/chat/streamBuffer.ts`, tested, because it is a decision about what to show at
 * a moment in time and a component cannot be asked about that in a node-only
 * vitest.
 *
 * ## Why the caret is handed to the renderer
 *
 * A caret has to sit after the final character. Rendered as a sibling of the
 * content it lands *under* it, because the last thing markdown produces is a
 * paragraph and a paragraph is a block box. Only the thing that rendered the
 * content knows which element holds the last word — so the caret is passed in
 * and `Markdown` puts it inside its own last block through `trailing`.
 *
 * The other half of the rule is `showCaret` in the buffer: it is on whenever
 * the message is unfinished OR still revealing, and off the instant both are
 * true. A message read back from history two days later must not look like it
 * is being written right now.
 */
export function StreamingText({
  text,
  done = false,
  render,
  charsPerFrame = 8,
  onSettled,
  className = '',
}: StreamingTextProps) {
  /* Read once per mount rather than per frame. matchMedia is cheap and this
     runs sixty times a second; somebody who changes the setting mid-message
     gets the new behaviour on the next one. */
  const [reducedMotion] = useState(prefersReducedMotion);

  const [state, setState] = useState<StreamState>(() =>
    /* A message that arrives finished — every one loaded from history — is
       shown whole. Typing out yesterday's answers on mount would be a
       decoration pretending to be a live event. */
    done ? settledStream(text) : { received: text, revealed: 0, ended: false },
  );

  /* The prop is the authoritative text; `replaceText` clamps the reveal rather
     than recomputing it, so a shorter correction (an interrupted stream
     persists only its partial content) never un-reveals what was read. */
  useEffect(() => {
    setState((previous) => (previous.received === text ? previous : replaceText(previous, text)));
  }, [text]);

  useEffect(() => {
    setState((previous) => (previous.ended === done ? previous : { ...previous, ended: done }));
  }, [done]);

  useEffect(() => {
    const options = { charsPerFrame, instant: reducedMotion };
    /* Identity is the signal: `advance` returns the same object when there is
       nothing left to reveal, which is exactly when no further frame should be
       booked. Comparing fields instead would keep the loop alive forever. */
    if (advance(state, options) === state) return;
    const handle = defaultScheduler.request(() => setState((previous) => advance(previous, options)));
    return () => defaultScheduler.cancel(handle);
  }, [state, charsPerFrame, reducedMotion]);

  /* Once, on the edge. The caller uses it to stop pinning the scroller to the
     bottom, and being told twice would fight a reader who scrolled away. */
  const settledRef = useRef(isSettled(state));
  useEffect(() => {
    const settled = isSettled(state);
    if (settled && !settledRef.current) onSettled?.();
    settledRef.current = settled;
  }, [state, onSettled]);

  const visible = visibleText(state);
  const caret = showCaret(state) ? (
    <span
      aria-hidden
      className={`ml-0.5 inline-block h-[1em] w-[0.45em] rounded-[1px] bg-text-muted align-[-0.1em] ${
        reducedMotion ? '' : 'animate-caret'
      }`}
    />
  ) : null;

  return (
    <div className={`min-w-0 ${className}`}>
      {render ? (
        render(visible, caret)
      ) : (
        <p className="whitespace-pre-wrap break-words text-body leading-relaxed text-text">
          {visible}
          {caret}
        </p>
      )}
    </div>
  );
}

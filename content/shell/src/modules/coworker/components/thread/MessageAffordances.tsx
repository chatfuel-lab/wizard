import { useEffect, useState } from 'react';
import { IconCheck, IconCopy, IconRefresh } from '~ui';

/* Time of day only, and one formatter for the whole thread.
 *
 * Not the shared `shortTime`: that one answers "today, or which day?",
 * which is the question a conversation LIST asks — and it is the rail's
 * formatter, so changing it there would change the rail. Inside a thread the
 * day separator above the row has already said which day it is, and repeating
 * "Aug 11" under a message that sits under a heading reading "Aug 11" tells the
 * reader nothing they can use. An Intl formatter is expensive to construct and
 * this one is asked the same question for every row, so it is built once. */
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

export function timeOfDay(at: number): string {
  return Number.isFinite(at) ? TIME_FORMAT.format(at) : '';
}

const COPIED_MS = 1500;

export interface MessageAffordancesProps {
  /** Epoch ms — the row's own `at`, already parsed and already defended. */
  at: number;
  /** What the copy control puts on the clipboard. Empty hides it. */
  text: string;
  /** Right-aligned under an outgoing bubble, left under an assistant answer. */
  align: 'start' | 'end';
  /** The send failed; the row offers a way to try again. */
  onRetry?: () => void;
}

/**
 * The row under a message: when it was said, and what can be done with it.
 *
 * Hidden until the pointer or the keyboard is on the message. A thread where
 * every row carries a visible timestamp and a visible button reads as a table
 * of messages rather than a conversation — and the two things here are both
 * things a reader wants *occasionally* and never wants to look at.
 *
 * `opacity`, not `hidden`: a control that does not exist until hover cannot be
 * reached by Tab at all, and `focus-within` on the wrapper is what brings this
 * row back for a keyboard. It also keeps the row's height reserved, so hovering
 * a message does not push the rest of the thread down by 16px.
 *
 * A failure is the exception and stays visible: the whole point of that state
 * is that the operator has to see it without going looking.
 */
export function MessageAffordances({ at, text, align, onRetry }: MessageAffordancesProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
    } catch {
      /* No clipboard outside a secure context, and an operator may refuse it.
         The text is on screen and selectable either way. */
    }
  };

  const control =
    'flex items-center gap-1 rounded-control px-1 py-0.5 text-micro text-text-faint transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-surface-hover hover:text-text-muted';

  /* One opacity class, chosen here rather than two in the attribute: `opacity-0`
     and `opacity-100` have equal specificity, so which of them wins is decided
     by their order in Tailwind's generated stylesheet, not by their order in
     this string. */
  const reveal = onRetry
    ? 'opacity-100'
    : 'opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100 group-focus-within:opacity-100';

  return (
    <div className={`mt-0.5 flex items-center gap-1 ${reveal} ${align === 'end' ? 'justify-end' : ''}`}>
      <span className="px-1 text-micro text-text-faint">{timeOfDay(at)}</span>
      {text ? (
        <button
          type="button"
          onClick={() => void copy()}
          className={control}
          aria-label={copied ? 'Copied' : 'Copy message'}
        >
          {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      ) : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className={`${control} text-danger hover:text-danger`}>
          <IconRefresh size={12} />
          Try again
        </button>
      ) : null}
    </div>
  );
}

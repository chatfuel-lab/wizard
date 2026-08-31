/**
 * The two decisions a chat composer gets wrong.
 *
 * Both are one expression each, and both were inline in `chat/Composer.tsx`
 * until an attachment could be the entire message — at which point
 * `value.trim() === ''` stopped meaning "nothing to send" and started meaning
 * "no text", which are different things and only one of them should disable
 * the button.
 */

export interface SendGateInput {
  text: string;
  /** Files already staged. A message can be attachments and no text at all. */
  attachmentCount?: number;
  /** The composer itself is unavailable: no permission, 24-hour window closed. */
  disabled?: boolean;
  /** Composer is fine, sending is momentarily impossible — an upload in flight. */
  sending?: boolean;
}

/**
 * Whether the send button does anything.
 *
 * `disabled` and `sending` are kept apart because they look the same to the
 * button and read completely differently to the person: one is "you cannot
 * write here", the other is "wait a second". The composer greys the whole
 * surface for the first and only the button for the second.
 */
export function canSend({ text, attachmentCount = 0, disabled = false, sending = false }: SendGateInput): boolean {
  if (disabled || sending) return false;
  return text.trim() !== '' || attachmentCount > 0;
}

/**
 * The height a growing textarea should take.
 *
 * The clamp is the easy half. The half that bites is that `contentHeight` has
 * to be read AFTER the element's height is reset to `auto` — scrollHeight never
 * shrinks below the height already set, so a composer that only ever grows is
 * the signature of having skipped that reset. `chat/Composer.tsx` does it in a
 * layout effect; this function assumes it was done.
 *
 * Both bounds come from `getComputedStyle`, which answers 'none' for an unset
 * max-height and therefore NaN. That has to mean "no ceiling" rather than
 * "clamp to the floor": the second reading collapses the box to one line and
 * takes the text with it, which is a far worse failure than a tall composer.
 */
export function nextComposerHeight(contentHeight: number, minHeight: number, maxHeight: number): number {
  const floor = Number.isFinite(minHeight) ? Math.max(minHeight, 0) : 0;
  const ceiling = Number.isFinite(maxHeight) ? Math.max(maxHeight, floor) : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(contentHeight)) return floor;
  return Math.min(Math.max(contentHeight, floor), ceiling);
}

export interface TextInsertion {
  value: string;
  /** Where the caret goes afterwards: just past what was inserted. */
  caret: number;
}

/**
 * Text put into a draft from outside the keyboard — an emoji, a saved reply.
 *
 * It goes where the caret is and replaces whatever is selected, which is what
 * typing the same characters would have done; anything else reads as the
 * picker being broken. The caret lands after the insertion so a second pick
 * follows the first rather than preceding it.
 *
 * The selection is taken from the element rather than tracked, and this is
 * about which element has focus: the button that opened the picker has it,
 * not the textarea, but a textarea keeps its `selectionStart` and
 * `selectionEnd` while unfocused, so the position the operator left is still
 * there to be read. Out-of-range and inverted selections are tolerated
 * because a stale value can be either.
 */
export function insertText(value: string, start: number, end: number, text: string): TextInsertion {
  const clamp = (n: number) => Math.min(Math.max(Number.isFinite(n) ? n : value.length, 0), value.length);
  const from = Math.min(clamp(start), clamp(end));
  const to = Math.max(clamp(start), clamp(end));
  return {
    value: `${value.slice(0, from)}${text}${value.slice(to)}`,
    caret: from + text.length,
  };
}

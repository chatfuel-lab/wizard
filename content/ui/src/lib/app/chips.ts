/**
 * The chip editor's judgement, as pure functions.
 *
 * `forms/ChipInput.tsx` owns the DOM — the draft box, the focus calls, the
 * live region. Everything it has to DECIDE lives here: how a paste splits, what
 * "the same keyword" means, which of a batch of eight fit into the three slots
 * left, and where focus lands after a chip is removed. Node-only vitest can
 * reason about all of it without a render.
 *
 * Positions in the roving order are plain numbers: chips are `0 … count-1`
 * and the draft input is `count` — one past the last chip, which is where it
 * sits on screen. `nextFocusIndex` and `focusAfterRemove` speak that
 * vocabulary; the component turns an index into a `.focus()` call.
 */

/** Typed or pasted text splits into chips at any of these. */
export const DEFAULT_SEPARATORS = /[,\n;]/;

export type ChipRejectReason = 'empty' | 'too-long' | 'invalid' | 'duplicate' | 'limit';

export interface ChipRejection {
  /** The item as it was offered, before normalisation. */
  item: string;
  reason: ChipRejectReason;
  /** What the field should say. `validate`'s own message for 'invalid'. */
  message: string;
}

export interface AcceptOptions {
  maxItems?: number;
  /** Per chip, counted in code points — an emoji is one, not two. */
  maxLength?: number;
  /** A message when the item is not acceptable, null when it is. Runs on the normalised item. */
  validate?: (item: string) => string | null;
  /** Default: trim. Applied before every other rule, so `validate` and dedupe see the stored form. */
  normalize?: (item: string) => string;
  /** Default true, and case-insensitive: "Sale" and "sale" are one keyword. */
  dedupe?: boolean;
}

export interface AcceptResult {
  /** `current` plus every accepted item, in the order offered. */
  next: string[];
  /** The normalised items that made it in. */
  accepted: string[];
  rejected: ChipRejection[];
}

/**
 * Splits raw text into candidate chips. Empty and whitespace-only pieces are
 * dropped here so a trailing comma or a blank line never becomes a chip; the
 * pieces themselves are NOT trimmed — that is `normalizeItem`'s job, and a
 * custom `normalize` may want the raw form.
 *
 * `separators` must not contain capture groups: `String.split` would splice
 * the captures into the result.
 */
export function splitInput(text: string, separators: RegExp = DEFAULT_SEPARATORS): string[] {
  if (text === '') return [];
  return text.split(separators).filter((piece) => piece.trim() !== '');
}

/** True when `text` holds at least one separator — the paste-vs-type decision. */
export function hasSeparator(text: string, separators: RegExp = DEFAULT_SEPARATORS): boolean {
  /* A stateful (g/y) regex would remember lastIndex between calls; test on a
     fresh copy so a caller's flags cannot make the second answer differ from
     the first. */
  return new RegExp(separators.source, separators.flags.replace(/[gy]/g, '')).test(text);
}

export function normalizeItem(item: string, normalize?: (item: string) => string): string {
  return normalize ? normalize(item) : item.trim();
}

/** Length as the user counts it: one per code point, so "👍" is 1, not 2. */
export function itemLength(item: string): number {
  return Array.from(item).length;
}

const fold = (item: string): string => item.toLocaleLowerCase();

export function isDuplicate(list: readonly string[], item: string, caseInsensitive = true): boolean {
  if (!caseInsensitive) return list.includes(item);
  const needle = fold(item);
  return list.some((existing) => fold(existing) === needle);
}

export function rejectionMessage(
  reason: Exclude<ChipRejectReason, 'invalid'>,
  options: Pick<AcceptOptions, 'maxItems' | 'maxLength'>,
): string {
  switch (reason) {
    case 'empty':
      return 'Nothing to add';
    case 'too-long':
      return `Keep each item under ${options.maxLength ?? 0} characters`;
    case 'duplicate':
      return 'Already added';
    case 'limit':
      return `Up to ${options.maxItems ?? 0} ${options.maxItems === 1 ? 'item' : 'items'}`;
  }
}

/**
 * Folds `incoming` into `current`, one item at a time and in order, so a
 * pasted batch of eight into a field with three slots left accepts the first
 * three and rejects the rest with 'limit' — never a silent truncation, never
 * an all-or-nothing refusal.
 *
 * Rules run in this order for each item: normalise, empty, too-long, validate,
 * duplicate (against `current` AND the items accepted so far in this same
 * batch — a paste of "a, a" yields one chip), limit. Limit is last so a full
 * field still tells the user "already added" about a duplicate rather than
 * the less useful "up to N".
 */
export function acceptItems(
  current: readonly string[],
  incoming: readonly string[],
  options: AcceptOptions = {},
): AcceptResult {
  const { maxItems, maxLength, validate, normalize, dedupe = true } = options;
  const next = [...current];
  const accepted: string[] = [];
  const rejected: ChipRejection[] = [];

  for (const raw of incoming) {
    const item = normalizeItem(raw, normalize);
    if (item === '') {
      rejected.push({ item: raw, reason: 'empty', message: rejectionMessage('empty', options) });
      continue;
    }
    if (maxLength !== undefined && itemLength(item) > maxLength) {
      rejected.push({ item: raw, reason: 'too-long', message: rejectionMessage('too-long', options) });
      continue;
    }
    const message = validate?.(item) ?? null;
    if (message !== null) {
      rejected.push({ item: raw, reason: 'invalid', message });
      continue;
    }
    if (dedupe && isDuplicate(next, item)) {
      rejected.push({ item: raw, reason: 'duplicate', message: rejectionMessage('duplicate', options) });
      continue;
    }
    if (maxItems !== undefined && next.length >= maxItems) {
      rejected.push({ item: raw, reason: 'limit', message: rejectionMessage('limit', options) });
      continue;
    }
    next.push(item);
    accepted.push(item);
  }

  return { next, accepted, rejected };
}

/**
 * One line for the field to show about a batch: the message when every
 * rejection says the same thing (with a count when there were several), a
 * plain count when the reasons differ. Empty pieces — the blank a trailing
 * comma leaves — are not rejections anyone needs to hear about, so they are
 * left out; null when nothing else was rejected.
 */
export function rejectionSummary(rejected: readonly ChipRejection[]): string | null {
  const real = rejected.filter((rejection) => rejection.reason !== 'empty');
  const first = real[0];
  if (first === undefined) return null;
  if (real.length === 1) return first.message;
  const uniform = real.every((rejection) => rejection.message === first.message);
  return uniform ? `${first.message} (${real.length} items)` : `${real.length} items not added`;
}

/** Where the keyboard is when a key arrives. */
export interface ChipFocusContext {
  /** Number of chips. The input's position is `count`. */
  count: number;
  /** Chip index, or `count` for the input. */
  focused: number;
  /** The draft box has no text. Backspace on an empty draft steps onto the chips. */
  inputEmpty: boolean;
  /** The caret sits at position 0 with nothing selected. ← from there steps onto the chips. */
  caretAtStart: boolean;
}

/**
 * The next position for a movement key, or null when the key is not a move
 * from here — so the caller leaves the event alone and the browser keeps its
 * own behaviour (← inside typed text moves the caret; → on the input does
 * nothing of ours).
 *
 * No wrap: ← on the first chip stays; → on the last chip lands on the input,
 * and → on the input is not ours. Home / End on a chip go to the first chip
 * and the input. Escape on a chip returns to the input, which is the way back
 * for a user who arrowed out and wants to type again.
 */
export function nextFocusIndex(key: string, ctx: ChipFocusContext): number | null {
  const { count, focused, inputEmpty, caretAtStart } = ctx;
  const onInput = focused >= count;

  if (onInput) {
    if (count === 0) return null;
    if (key === 'ArrowLeft' && caretAtStart) return count - 1;
    if (key === 'Backspace' && inputEmpty) return count - 1;
    return null;
  }

  switch (key) {
    case 'ArrowLeft':
      return focused > 0 ? focused - 1 : null;
    case 'ArrowRight':
      return focused + 1;
    case 'Home':
      return focused === 0 ? null : 0;
    case 'End':
    case 'Escape':
      return count;
    default:
      return null;
  }
}

/**
 * Where focus lands once chip `index` is gone, in the NEW order (count − 1
 * chips, then the input). Backspace reads as "delete backwards": focus steps
 * to the previous chip, or stays at 0 — which, once the last chip is gone, is
 * the input. Delete reads as "delete forwards": focus stays put, on whatever
 * moved into this slot, or on the input when the removed chip was last.
 */
export function focusAfterRemove(count: number, index: number, key: 'Backspace' | 'Delete'): number {
  const remaining = Math.max(0, count - 1);
  if (key === 'Backspace') return Math.min(Math.max(0, index - 1), remaining);
  return Math.min(index, remaining);
}

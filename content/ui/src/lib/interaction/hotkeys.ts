/**
 * Keyboard shortcut matching, as pure functions.
 *
 * `lib/interaction/layers.ts` opens by naming the problem this file finishes: every module
 * grows its own window keydown listener, and they all fire at once. Layers
 * fixed that for Escape; this fixes it for everything else — one listener, one
 * matcher, and a resolution the tests can reason about without a DOM.
 *
 * A spec is one or more space-separated steps: `mod+k`, `?`, `escape`,
 * `shift+arrowup`, or the two-step sequence `g b`.
 */

export type HotkeyScope = 'always' | 'not-typing';

/** The parts of a KeyboardEvent this file needs — so tests need no DOM. */
export interface HotkeyEventLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export interface HotkeyStep {
  /** Normalised key: 'k', '?', '1', 'escape', 'arrowup', 'space'. */
  key: string;
  /** ⌘ on Apple platforms, Ctrl elsewhere — matched as either, never both. */
  mod: boolean;
  shift: boolean;
  alt: boolean;
}

export interface HotkeyBinding<T extends string = string> {
  id: T;
  keys: string;
  /** Default 'not-typing': the binding stands down inside inputs. */
  scope?: HotkeyScope;
}

export interface ParsedBinding<T extends string = string> {
  id: T;
  steps: HotkeyStep[];
  scope: HotkeyScope;
}

/** How long a half-typed sequence (`g` waiting for `b`) stays live. */
export const SEQUENCE_TIMEOUT_MS = 1200;

const MOD_TOKENS = new Set(['mod', 'meta', 'cmd', 'command', 'ctrl', 'control']);
const SHIFT_TOKENS = new Set(['shift']);
const ALT_TOKENS = new Set(['alt', 'option', 'opt']);

/** Keys that are only ever held, never pressed on their own. */
const MODIFIER_KEYS = new Set(['shift', 'control', 'alt', 'meta', 'capslock', 'altgraph', 'os']);

/** Input types that hold no text, so a shortcut over them is safe. */
const NON_TEXT_INPUT = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image']);

export function normalizeKey(key: string): string {
  if (key === ' ' || key === 'Spacebar') return 'space';
  return key.toLowerCase();
}

export function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.has(normalizeKey(key));
}

/** One step, e.g. `mod+shift+k`. */
function parseStep(spec: string): HotkeyStep {
  const parts = spec.split('+').filter((part) => part.length > 0);
  const step: HotkeyStep = { key: '', mod: false, shift: false, alt: false };

  for (const raw of parts) {
    const token = raw.toLowerCase();
    if (MOD_TOKENS.has(token)) step.mod = true;
    else if (SHIFT_TOKENS.has(token)) step.shift = true;
    else if (ALT_TOKENS.has(token)) step.alt = true;
    else step.key = normalizeKey(raw);
  }

  /* A `+` on its own ("mod++") loses its key to the split above. */
  if (step.key === '' && spec.endsWith('+')) step.key = '+';
  return step;
}

export function parseHotkey(spec: string): HotkeyStep[] {
  return spec
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map(parseStep);
}

export function parseBindings<T extends string>(bindings: readonly HotkeyBinding<T>[]): ParsedBinding<T>[] {
  return bindings.map((binding) => ({
    id: binding.id,
    steps: parseHotkey(binding.keys),
    scope: binding.scope ?? 'not-typing',
  }));
}

export function matchStep(event: HotkeyEventLike, step: HotkeyStep): boolean {
  if (normalizeKey(event.key) !== step.key) return false;
  if ((event.metaKey || event.ctrlKey) !== step.mod) return false;
  if (event.altKey !== step.alt) return false;
  /* A printable character already encodes Shift — `?` IS Shift+/, and the
   * event arrives as `?` with shiftKey true. Demanding a shift match there
   * would make every punctuation binding unreachable. Named keys carry no such
   * encoding, and Shift+ArrowUp has to stay distinct from ArrowUp. */
  if (step.key.length > 1 && event.shiftKey !== step.shift) return false;
  return true;
}

/**
 * Whether a keystroke landing here is being typed into something.
 *
 * Takes the three facts rather than an element so it stays testable: a `select`
 * counts (type-ahead is how you drive one), a checkbox does not.
 */
export function isTypingTarget(tagName: string, isContentEditable: boolean, type?: string): boolean {
  if (isContentEditable) return true;
  const tag = tagName.toLowerCase();
  if (tag === 'textarea' || tag === 'select') return true;
  if (tag !== 'input') return false;
  return !NON_TEXT_INPUT.has((type ?? 'text').toLowerCase());
}

/** A sequence in progress: which bindings are still in the running, and how far. */
export interface HotkeyPending<T extends string = string> {
  candidates: T[];
  depth: number;
  at: number;
}

export interface HotkeyResolution<T extends string = string> {
  fired: T | null;
  pending: HotkeyPending<T> | null;
  /** The event was ours — the caller preventDefaults and stops looking. */
  consumed: boolean;
}

/**
 * Resolve one keystroke against the bindings.
 *
 * `now` is a parameter, not a `Date.now()` call, for the same reason the deals
 * reducer takes one: a function that reads the clock cannot be tested.
 */
export function resolveHotkey<T extends string>(
  bindings: readonly ParsedBinding<T>[],
  event: HotkeyEventLike,
  pending: HotkeyPending<T> | null,
  now: number,
  typing: boolean,
): HotkeyResolution<T> {
  /* Holding Shift to reach the second half of a sequence must not cancel it. */
  if (isModifierKey(event.key)) return { fired: null, pending, consumed: false };

  const live = pending !== null && now - pending.at <= SEQUENCE_TIMEOUT_MS ? pending : null;
  const usable = bindings.filter((binding) => binding.scope === 'always' || !typing);
  const pool = live ? usable.filter((binding) => live.candidates.includes(binding.id)) : usable;
  const depth = live ? live.depth : 0;

  const matched = pool.filter((binding) => binding.steps.length > depth && matchStep(event, binding.steps[depth]));

  if (matched.length === 0) {
    /* Mid-sequence and nothing matched: the keystroke may still be the START of
     * a sequence. `g` `g` `b` has to fire `g b`, not swallow the second `g`. */
    if (live) return resolveHotkey(bindings, event, null, now, typing);
    return { fired: null, pending: null, consumed: false };
  }

  /* An exact match wins over a longer one that shares its prefix, so a binding
   * on `g` makes `g b` unreachable. Do not register both. */
  const exact = matched.find((binding) => binding.steps.length === depth + 1);
  if (exact) return { fired: exact.id, pending: null, consumed: true };

  return {
    fired: null,
    pending: { candidates: matched.map((binding) => binding.id), depth: depth + 1, at: now },
    consumed: true,
  };
}

/**
 * Roving-tabindex arithmetic for menus, listboxes and segmented controls: one
 * Tab stop for the whole group, arrow keys to move inside it.
 *
 * Pure index math — the DOM half (refs, focus calls) is hooks/useRovingFocus.ts.
 */

export type Orientation = 'vertical' | 'horizontal' | 'both';

export type RovingAction = { type: 'move'; index: number } | { type: 'none' };

export interface RovingOptions {
  orientation?: Orientation;
  /** Wrap past the ends. Default true. */
  loop?: boolean;
  /** Indexes that cannot be focused (separators, disabled items). */
  disabled?: readonly number[];
}

function isDisabled(index: number, disabled: readonly number[] | undefined): boolean {
  return disabled !== undefined && disabled.includes(index);
}

/**
 * First enabled index at or after `from`, walking in `step` direction.
 * Returns -1 when every candidate is disabled.
 */
export function seekEnabled(count: number, from: number, step: 1 | -1, options?: RovingOptions): number {
  if (count <= 0) return -1;
  const loop = options?.loop ?? true;
  let index = from;
  for (let attempts = 0; attempts < count; attempts += 1) {
    if (index < 0 || index >= count) {
      if (!loop) return -1;
      index = ((index % count) + count) % count;
    }
    if (!isDisabled(index, options?.disabled)) return index;
    index += step;
  }
  return -1;
}

function handles(key: string, orientation: Orientation): boolean {
  const vertical = key === 'ArrowDown' || key === 'ArrowUp';
  const horizontal = key === 'ArrowRight' || key === 'ArrowLeft';
  if (orientation === 'vertical') return vertical;
  if (orientation === 'horizontal') return horizontal;
  return vertical || horizontal;
}

/**
 * Maps a key press to the next index. Returns `{type:'none'}` for keys this
 * group does not own, so the caller can leave the event alone — an arrow key
 * in a horizontal toolbar must still scroll the page vertically.
 */
export function rovingAction(key: string, count: number, current: number, options?: RovingOptions): RovingAction {
  if (count <= 0) return { type: 'none' };
  const orientation = options?.orientation ?? 'vertical';
  const loop = options?.loop ?? true;

  if (key === 'Home') {
    const index = seekEnabled(count, 0, 1, { ...options, loop: false });
    return index === -1 ? { type: 'none' } : { type: 'move', index };
  }
  if (key === 'End') {
    const index = seekEnabled(count, count - 1, -1, { ...options, loop: false });
    return index === -1 ? { type: 'none' } : { type: 'move', index };
  }
  if (!handles(key, orientation)) return { type: 'none' };

  const step: 1 | -1 = key === 'ArrowDown' || key === 'ArrowRight' ? 1 : -1;
  const from = current < 0 ? (step === 1 ? 0 : count - 1) : current + step;
  if (!loop && (from < 0 || from >= count)) return { type: 'none' };

  const index = seekEnabled(count, from, step, options);
  return index === -1 || index === current ? { type: 'none' } : { type: 'move', index };
}

/**
 * Type-ahead: jump to the next item whose label starts with the typed buffer.
 * Searching starts AFTER the current item so repeatedly typing "s" cycles
 * through every item starting with s, which is what every native menu does.
 */
export function typeaheadIndex(
  labels: readonly string[],
  buffer: string,
  current: number,
  options?: RovingOptions,
): number {
  const needle = buffer.trim().toLowerCase();
  if (!needle) return -1;
  const count = labels.length;
  /* A repeated single character means "next match", not "re-match myself". */
  const repeated = needle.length > 1 && [...needle].every((char) => char === needle[0]);
  const query = repeated ? needle[0]! : needle;
  const start = current < 0 ? 0 : current + 1;

  for (let offset = 0; offset < count; offset += 1) {
    const index = (start + offset) % count;
    if (isDisabled(index, options?.disabled)) continue;
    if (labels[index]!.trim().toLowerCase().startsWith(query)) return index;
  }
  return -1;
}

/**
 * A stack of open dismissible layers (dialogs, drawers, popovers, menus).
 *
 * Without this, one Escape press closes every open layer at once: each one has
 * its own window keydown listener and they all fire. Layers register here and
 * only the top of the stack reacts.
 *
 * Module-level on purpose — layers nest across component trees and portals, so
 * React context would not see all of them.
 */

const stack: string[] = [];

export function pushLayer(id: string): void {
  /* Re-pushing an existing id must not create a duplicate: an effect can
   * re-run without the matching pop (StrictMode, a changed dep). */
  const existing = stack.indexOf(id);
  if (existing !== -1) stack.splice(existing, 1);
  stack.push(id);
}

export function popLayer(id: string): void {
  const index = stack.indexOf(id);
  if (index !== -1) stack.splice(index, 1);
}

export function isTopLayer(id: string): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id;
}

/**
 * Is `id` open above `than`? False when either is not open at all.
 *
 * What lets surfaces nest: a press inside a popover that was opened FROM a
 * popover is not an outside press for the one underneath, even though the
 * two are portalled siblings and neither contains the other in the DOM. The
 * stack knows which came later, and later means on top.
 */
export function isLayerAbove(id: string, than: string): boolean {
  const above = stack.indexOf(id);
  const below = stack.indexOf(than);
  return above !== -1 && below !== -1 && above > below;
}

/** How many layers are currently open — used to ref-count the scroll lock. */
export function layerCount(): number {
  return stack.length;
}

/** True when this layer is the bottom-most one, i.e. it owns the background. */
export function isBottomLayer(id: string): boolean {
  return stack.length > 0 && stack[0] === id;
}

/** Test-only: drop every layer. */
export function resetLayers(): void {
  stack.length = 0;
}

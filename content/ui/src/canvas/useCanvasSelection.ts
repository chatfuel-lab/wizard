import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * Canvas selection — the pure rules, and a thin hook over them.
 *
 * The rules are separated out because every one of them is a decision that can
 * be wrong, and vitest here is node-only: a rule living inside a component is a
 * rule nothing can check. They are also the rules that a canvas gets subtly
 * wrong more often than any other part of it.
 */

const EMPTY: ReadonlySet<string> = new Set();

/**
 * What a pointer-down on a node means for the selection.
 *
 * Additive (shift or ⌘) toggles, which is uncontroversial. The plain case has
 * one wrinkle that every editor handles the same way and that a naive
 * implementation gets wrong: pressing on a node that is ALREADY part of a
 * multi-selection must not collapse the selection to it, because the gesture
 * that starts that way is almost always "drag all of these". Collapsing on
 * press means a group drag is impossible — the first pixel of movement has
 * already thrown the group away.
 *
 * The collapse still has to happen for a plain click, so it moves to release:
 * see `collapseSelection`.
 */
export function nextSelection(current: ReadonlySet<string>, id: string, additive: boolean): ReadonlySet<string> {
  if (additive) {
    const next = new Set(current);
    if (!next.delete(id)) next.add(id);
    return next;
  }
  if (current.has(id)) return current;
  return new Set([id]);
}

/**
 * The other half of the rule above: a plain click that did NOT turn into a drag
 * collapses a multi-selection to the one node that was clicked.
 *
 * Applied on pointer-up, and only when the pointer never exceeded the drag
 * threshold. A selection that already is exactly this node is returned
 * unchanged, so the common case costs no render.
 */
export function collapseSelection(current: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (current.size === 1 && current.has(id)) return current;
  return new Set([id]);
}

/**
 * What a marquee means. Additive adds to what was already selected; plain
 * replaces it, including replacing it with nothing when the marquee caught
 * nothing — a rubber band dragged over empty canvas is how a user clears a
 * selection.
 */
export function marqueeSelection(
  current: ReadonlySet<string>,
  hits: readonly string[],
  additive: boolean,
): ReadonlySet<string> {
  if (!additive) return new Set(hits);
  const next = new Set(current);
  for (const id of hits) next.add(id);
  return next;
}

/**
 * Drop ids that no longer exist.
 *
 * Called after every server refetch, because a block deleted in another tab is
 * still in this tab's selection and would then be dragged, deleted or renamed
 * by id. The identity guarantee is the load-bearing part: when nothing was
 * dropped the SAME set comes back, so the effect that calls this can set state
 * unconditionally without looping forever. Returning a fresh equal set instead
 * is an infinite render, and it is the kind that only appears once there is
 * something selected.
 */
export function pruneSelection(
  current: ReadonlySet<string>,
  alive: ReadonlySet<string> | readonly string[],
): ReadonlySet<string> {
  const living = Array.isArray(alive) ? new Set(alive) : (alive as ReadonlySet<string>);
  let dropped = false;
  for (const id of current) {
    if (!living.has(id)) {
      dropped = true;
      break;
    }
  }
  if (!dropped) return current;
  const next = new Set<string>();
  for (const id of current) if (living.has(id)) next.add(id);
  return next;
}

export interface CanvasSelection {
  selected: ReadonlySet<string>;
  isSelected: (id: string) => boolean;
  /** Pointer-down semantics — see `nextSelection`. */
  press: (id: string, additive: boolean) => void;
  /** Pointer-up-without-drag semantics — see `collapseSelection`. */
  release: (id: string) => void;
  marquee: (hits: readonly string[], additive: boolean) => void;
  /** Keep only ids that still exist. Cheap and idempotent. */
  prune: (alive: ReadonlySet<string> | readonly string[]) => void;
  replace: (ids: readonly string[]) => void;
  clear: () => void;
}

export interface UseCanvasSelectionOptions {
  initial?: readonly string[];
  onChange?: (selected: ReadonlySet<string>) => void;
}

/** The rules above, wired to a `useState`. */
export function useCanvasSelection(options?: UseCanvasSelectionOptions): CanvasSelection {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(options?.initial ?? []));
  const changeRef = useRef(options?.onChange);
  changeRef.current = options?.onChange;

  const commit = useCallback((next: ReadonlySet<string>, previous: ReadonlySet<string>) => {
    if (next === previous) return previous;
    changeRef.current?.(next);
    return next;
  }, []);

  return useMemo(
    () => ({
      selected,
      isSelected: (id: string) => selected.has(id),
      press: (id, additive) => setSelected((current) => commit(nextSelection(current, id, additive), current)),
      release: (id) => setSelected((current) => commit(collapseSelection(current, id), current)),
      marquee: (hits, additive) => setSelected((current) => commit(marqueeSelection(current, hits, additive), current)),
      prune: (alive) => setSelected((current) => commit(pruneSelection(current, alive), current)),
      replace: (ids) => setSelected((current) => commit(new Set(ids), current)),
      clear: () => setSelected((current) => (current.size === 0 ? current : commit(EMPTY, current))),
    }),
    [selected, commit],
  );
}

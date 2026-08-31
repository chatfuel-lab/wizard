/**
 * Breadcrumb collapsing.
 *
 * A record page's trail is short (module / view / record) but the record's own
 * name is arbitrary server text, so the trail can still overflow a narrow
 * panel. Two separate mechanisms handle that, and they must not be confused:
 * this file drops ITEMS out of the middle, and the component truncates the
 * TEXT of the ones that survive. Dropping items is a decision — which ones,
 * and whether it is worth doing at all — so it is the half that lives here.
 */

export interface TrailItem {
  /** Stable key. Not the label: two steps can carry the same words. */
  id: string;
  label: string;
}

export type TrailSlot<T> = { kind: 'item'; item: T; index: number } | { kind: 'ellipsis'; hidden: T[] };

/**
 * The first item and the last item always survive: the first is where "up"
 * goes, the last is where you are. So two is the floor, whatever a caller asks
 * for.
 */
export const MIN_VISIBLE_ITEMS = 2;

/**
 * The trail as it should render: the first item, an ellipsis standing for what
 * was dropped, then the tail.
 *
 * The middle is what goes, because in this product the middle is the saved
 * view — worth naming, but the one step a person can also reach from the
 * module's own nav.
 *
 * Collapsing only fires when it hides at least two items. An ellipsis standing
 * in for a single item costs a click and saves nothing: it is one slot
 * replaced by one slot, which is the mistake every hand-rolled breadcrumb
 * makes on the width where it first collapses.
 */
export function collapseTrail<T>(items: readonly T[], maxItems: number): TrailSlot<T>[] {
  const all = items.map((item, index): TrailSlot<T> => ({ kind: 'item', item, index }));
  const limit = Math.max(Math.floor(maxItems), MIN_VISIBLE_ITEMS);
  if (items.length <= limit + 1) return all;

  const tail = limit - 1;
  const hidden = items.slice(1, items.length - tail);
  return [all[0]!, { kind: 'ellipsis', hidden }, ...all.slice(items.length - tail)];
}

/**
 * What the ellipsis says it stands for, for its accessible name and its title.
 * A control labelled only "…" tells a screen reader nothing at all.
 */
export function hiddenTrailLabel(hidden: readonly TrailItem[]): string {
  if (hidden.length === 0) return '';
  const steps = hidden.length === 1 ? 'step' : 'steps';
  return `Show ${hidden.length} hidden ${steps}: ${hidden.map((item) => item.label).join(', ')}`;
}

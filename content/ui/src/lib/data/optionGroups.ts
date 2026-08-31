/**
 * Grouping a flat option list into labelled runs.
 *
 * A picker's arrow keys walk a single index space, and headers are not in it —
 * they cannot be highlighted, chosen, or landed on by Enter. So the only safe
 * way to render them is to fix the ORDER first and hand the renderer the
 * positions a header belongs above; anything that interleaves headers into the
 * same array it indexes has to subtract them again at every read, and one of
 * those subtractions is always missed.
 *
 * That is the whole reason this is a separate pure step rather than a `map`
 * inside the component: the arithmetic — which index Enter commits, which id
 * `aria-activedescendant` points at — is the part that can be wrong, and here
 * it can be tested.
 */

export interface OptionGroupRun {
  label: string;
  /** First index of the run in the returned order. */
  from: number;
  count: number;
}

export interface GroupedOptions<T> {
  /**
   * Render order: everything that declared no group first, then each group in
   * the order its first member appeared, stable within a group.
   */
  order: T[];
  /** One per header, in render order. Empty when nothing declared a group. */
  runs: OptionGroupRun[];
}

/**
 * Ungrouped options lead, and never get a header of their own.
 *
 * Inventing "Other" for them would name a category the caller did not: in the
 * contacts field picker the ungrouped run is the record's own columns, which
 * are the ones a person is looking for, not a leftover bin. Putting them first
 * with no header is also what makes this additive — an option list with no
 * groups at all comes back untouched, header-free, in the order it arrived.
 *
 * A group is emitted only when something is under it. Filtering removes
 * options, not groups, so the alternative is an orphan header standing over
 * nothing every time a query excludes a whole category.
 */
export function groupOptions<T>(options: readonly T[], groupOf: (option: T) => string | undefined): GroupedOptions<T> {
  const ungrouped: T[] = [];
  /* Map, for its insertion order: groups appear in the order the caller's list
   * first mentions them, which is the one ordering the caller controls. */
  const buckets = new Map<string, T[]>();

  for (const option of options) {
    const label = groupOf(option);
    /* An empty string is not a group name — it would render a header with no
     * text in it, which is a stripe of blank space nobody can explain. */
    if (label === undefined || label === '') {
      ungrouped.push(option);
      continue;
    }
    const bucket = buckets.get(label);
    if (bucket === undefined) buckets.set(label, [option]);
    else bucket.push(option);
  }

  if (buckets.size === 0) return { order: [...options], runs: [] };

  const order = [...ungrouped];
  const runs: OptionGroupRun[] = [];
  for (const [label, bucket] of buckets) {
    runs.push({ label, from: order.length, count: bucket.length });
    order.push(...bucket);
  }
  return { order, runs };
}

/**
 * Where the ungrouped run ends — the first index that has a header above it,
 * or the length when there are no headers at all.
 */
export function ungroupedCount<T>(grouped: GroupedOptions<T>): number {
  return grouped.runs[0]?.from ?? grouped.order.length;
}

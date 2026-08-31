/**
 * The arithmetic behind the filter menus (`BookingsFilterMenus`): what one
 * click on a checkbox does to a list where "nothing selected" means "all".
 *
 * That convention is what the URL wants (`?specialist=` absent = everyone) and
 * it has one sharp edge: from the all-ticked state, unticking one entry must
 * mean "everything but this one" — toggling the empty list would instead
 * narrow to the single thing the user just rejected (deals' stage-menu lesson).
 * And ticking the last missing entry goes back to "all", i.e. an empty list,
 * so the URL drops the key again. Pure; the component only renders.
 */

/**
 * Next selection after clicking `id`. `all` is every offered id in canonical
 * order; `selected` is the current list (empty = all). The result is in
 * canonical order and empty when it would cover everything.
 */
export function toggleFilterEntry(all: readonly string[], selected: readonly string[], id: string): string[] {
  const current = selected.length === 0 ? [...all] : [...selected];
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  if (all.every((x) => next.includes(x))) return [];
  return all.filter((x) => next.includes(x));
}

/**
 * The trigger's label: the "all" word, one or two names, or `First +N`.
 * An id with no name (a filter left in the URL for something that no longer
 * exists) prints the id rather than vanishing — the filter is still applied.
 */
export function filterGroupLabel(
  selected: readonly string[],
  nameOf: (id: string) => string | undefined,
  allLabel: string,
): string {
  if (selected.length === 0) return allLabel;
  const names = selected.map((id) => nameOf(id) ?? id);
  return names.length <= 2 ? names.join(', ') : `${names[0]} +${names.length - 1}`;
}

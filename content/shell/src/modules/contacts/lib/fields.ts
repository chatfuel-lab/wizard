/**
 * The Fields surface's rules: how a catalog entry reads, how the table sorts
 * and searches, what a bot-wide default actually does to the rest of the
 * module, and the two addresses the surface navigates to.
 *
 * Three API facts shape the whole file, and they are why this is an
 * administration screen rather than a CRUD screen:
 *
 * 1. **There is no create-field and no rename.** The only way a field comes
 *    into existence is `contactAttributeUpdate` writing a value on one contact
 *    — the API creates it on the spot as `type: custom, dataType: string` and
 *    it is filterable immediately. So this surface cannot offer "New field",
 *    and a control that pretends otherwise would be a lie.
 * 2. **A field dies when its last value does.** Deleting the last contact's
 *    value removes the attribute from the bot catalog altogether, which is why
 *    the table's "Contacts" column is also a life expectancy.
 * 3. **A bot-wide default is the most destructive control in the module.**
 *    `botAttributeCreateDefaultVal` makes EVERY contact read the field as
 *    non-empty — including the ones that never carried it — so every
 *    `is empty` filter in every saved view silently starts matching nobody.
 *    `defaultConsequence` is that sentence, computed from the real counts, and
 *    it is a test rather than a promise.
 *
 * Sorting and searching are client-side on purpose: `botAttributes` can order
 * by name or contacts-count only, the catalog is already fully loaded by
 * `useAttributeCatalog` (100 × 5 pages), and a round trip per header click
 * would be slower and no more truthful.
 */
import { AttributeDataType, AttributeType } from '~api/generated/contacts/graphql';
import type { CatalogEntry } from '../hooks/useAttributeCatalog';

// ---------------------------------------------------------------------------
// Reading an entry
// ---------------------------------------------------------------------------

/**
 * What the storage type means in words. `datetime` is the one worth spelling
 * out: the SDL says the value is a millisecond timestamp held as a string, so
 * "Date" would over-promise a calendar type the API does not have.
 */
export const DATA_TYPE_LABELS: Record<AttributeDataType, string> = {
  [AttributeDataType.String]: 'Text',
  [AttributeDataType.Long]: 'Whole number',
  [AttributeDataType.Double]: 'Decimal number',
  [AttributeDataType.Boolean]: 'True / false',
  [AttributeDataType.Datetime]: 'Timestamp',
};

export const dataTypeLabel = (dataType: AttributeDataType): string => DATA_TYPE_LABELS[dataType];

export const hasDefault = (entry: Pick<CatalogEntry, 'defaultValue'>): boolean =>
  entry.defaultValue !== null && entry.defaultValue !== '';

/** The aliases worth showing beside a name: the ones that are not the name. */
export function otherNames(entry: Pick<CatalogEntry, 'name' | 'aliases'>): string[] {
  const seen = new Set<string>();
  for (const alias of entry.aliases) {
    const trimmed = alias.alias.trim();
    if (trimmed !== '' && trimmed !== entry.name && !seen.has(trimmed)) seen.add(trimmed);
  }
  return [...seen];
}

// ---------------------------------------------------------------------------
// Searching and filtering the catalog
// ---------------------------------------------------------------------------

/** Which half of the catalog the toolbar is showing. */
export type FieldScope = 'all' | 'custom' | 'system';

export const FIELD_SCOPES: readonly FieldScope[] = ['all', 'custom', 'system'];

export const FIELD_SCOPE_LABELS: Record<FieldScope, string> = {
  all: 'All',
  custom: 'Custom',
  system: 'System',
};

export function inScope(entry: Pick<CatalogEntry, 'type'>, scope: FieldScope): boolean {
  if (scope === 'all') return true;
  return scope === 'custom' ? entry.type === AttributeType.Custom : entry.type === AttributeType.System;
}

/** Name and aliases, case-insensitive, substring. */
export function matchesQuery(entry: Pick<CatalogEntry, 'name' | 'aliases'>, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  if (entry.name.toLowerCase().includes(needle)) return true;
  return entry.aliases.some((alias) => alias.alias.toLowerCase().includes(needle));
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/** Structurally `~ui`'s `SortState`; declared here so the lib pulls in no UI. */
export interface FieldSort {
  key: string;
  dir: 'asc' | 'desc';
}

export const FIELD_SORT_KEYS = ['name', 'type', 'dataType', 'usersCount', 'flowsCount', 'defaultValue'] as const;

export type FieldSortKey = (typeof FIELD_SORT_KEYS)[number];

const compareText = (a: string, b: string): number => a.localeCompare(b, undefined, { sensitivity: 'base' });

/**
 * Sorts a copy. Two rules that are decisions rather than defaults:
 *
 * - **A null count sorts last in both directions.** `usersCount` is nullable
 *   because the API sometimes declines to count; "unknown" is not "zero" and
 *   must not lead an ascending sort as if it were the emptiest field.
 * - **Name is the tiebreak, always**, so a re-sort by a coarse column (type,
 *   stored-as) never reshuffles rows that compare equal.
 */
export function sortEntries(entries: readonly CatalogEntry[], sort: FieldSort | null): CatalogEntry[] {
  const rows = [...entries];
  if (sort === null) return rows;
  const sign = sort.dir === 'asc' ? 1 : -1;

  const nullable = (value: number | null): { known: boolean; value: number } => ({
    known: value !== null,
    value: value ?? 0,
  });

  rows.sort((a, b) => {
    let delta: number;
    switch (sort.key as FieldSortKey) {
      case 'name':
        delta = compareText(a.name, b.name);
        break;
      case 'type':
        delta = compareText(a.type, b.type);
        break;
      case 'dataType':
        delta = compareText(a.dataType, b.dataType);
        break;
      case 'usersCount': {
        const left = nullable(a.usersCount);
        const right = nullable(b.usersCount);
        if (left.known !== right.known) return left.known ? -1 : 1;
        delta = left.value - right.value;
        break;
      }
      case 'flowsCount':
        delta = a.flowsCount - b.flowsCount;
        break;
      case 'defaultValue':
        delta = compareText(a.defaultValue ?? '', b.defaultValue ?? '');
        break;
      default:
        delta = 0;
    }
    return delta === 0 ? compareText(a.name, b.name) : delta * sign;
  });
  return rows;
}

/** Search + scope + sort in the order the toolbar reads left to right. */
export function visibleFields(
  entries: readonly CatalogEntry[],
  options: { query: string; scope: FieldScope; sort: FieldSort | null },
): CatalogEntry[] {
  return sortEntries(
    entries.filter((entry) => inScope(entry, options.scope) && matchesQuery(entry, options.query)),
    options.sort,
  );
}

// ---------------------------------------------------------------------------
// The default value — the one control that changes what every filter means
// ---------------------------------------------------------------------------

export type DefaultAction = 'set' | 'update' | 'remove';

export function defaultAction(entry: Pick<CatalogEntry, 'defaultValue'>, next: string): DefaultAction {
  if (next.trim() === '') return 'remove';
  return hasDefault(entry) ? 'update' : 'set';
}

/**
 * How many contacts the default would newly cover: everyone that does not
 * carry the field today. Null when the catalog declined to count, because a
 * confirm dialog that says "0 contacts" when it means "unknown" is worse than
 * one that admits it does not know.
 */
export function contactsGainingDefault(
  entry: Pick<CatalogEntry, 'usersCount'>,
  totalContacts: number | null,
): number | null {
  if (entry.usersCount === null || totalContacts === null) return null;
  return Math.max(0, totalContacts - entry.usersCount);
}

/**
 * The sentence the confirm dialog leads with. It names the consequence that is
 * invisible everywhere else in the module: a default makes the field non-empty
 * for contacts that never had it, so `is empty` stops matching them and
 * `is not empty` starts matching everyone.
 */
export function defaultConsequence(
  entry: Pick<CatalogEntry, 'name' | 'usersCount' | 'defaultValue'>,
  totalContacts: number | null,
  next: string,
): string {
  const action = defaultAction(entry, next);
  if (action === 'remove') {
    return `Removing the default leaves “${entry.name}” empty again for every contact that never carried a value of its own.`;
  }
  const gaining = contactsGainingDefault(entry, totalContacts);
  const who =
    gaining === null
      ? 'Every contact on this bot'
      : gaining === 0
        ? 'Every contact on this bot already carries a value, so nothing changes today — but every contact added from now on'
        : `${gaining.toLocaleString()} contact${gaining === 1 ? '' : 's'} that ${gaining === 1 ? 'does' : 'do'} not carry “${entry.name}” today`;
  return `${who} will read “${entry.name}” as “${next.trim()}”. From then on “${entry.name} is empty” matches nobody and “${entry.name} is not empty” matches everybody — in this list, in every saved view, and in every flow that branches on it.`;
}

/** Whether the button may fire at all: an unchanged value is not a write. */
export function canApplyDefault(entry: Pick<CatalogEntry, 'defaultValue'>, next: string): boolean {
  const trimmed = next.trim();
  const current = entry.defaultValue ?? '';
  if (trimmed === current.trim()) return false;
  return !(trimmed === '' && current === '');
}

// ---------------------------------------------------------------------------
// The two navigation actions
// ---------------------------------------------------------------------------

/**
 * The URL key this surface uses to hand a column to the list.
 *
 * `ContactsViewProps` carries no way to switch view and no way to reach the
 * list's column set — bookings' view contract has an `onParams` patch, this
 * module's does not — and `writeContactsParams` copies through every key it
 * does not own, so the address bar is the only bus the two surfaces share.
 * The list reads `cols` as attribute column keys (`attr:<name>`, the spelling
 * `lib/tableColumns.ts` already uses) appended to whatever it is showing.
 */
export const COLUMNS_PARAM = 'cols';

/** Comma-joined `attr:<name>` keys, de-duplicated, order preserved. */
export function addColumnParam(existing: string | null, key: string): string {
  const seen = (existing ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
  if (!seen.includes(key)) seen.push(key);
  return seen.join(',');
}

export interface ListRouteOptions {
  /** An attribute column key to request, e.g. `attr:company`. */
  addColumn?: string;
  /** The module the list belongs to; 'contacts' unless a caller says otherwise. */
  moduleId?: string;
}

/**
 * The current query rewritten to "the contacts list".
 *
 * Pure string → string so the two actions are tested rather than trusted.
 *
 * The list has no view segment of its own — '/contacts' IS the list — so the
 * caller navigates to the module root with what this returns. `contact` and
 * `tab` are dropped, and `peek`, a key this module no longer writes but an old
 * link may still carry: arriving at the list with a record page still open
 * would hide the thing we navigated for. A stale `view=` goes with them.
 */
export function listRoute(currentSearch: string, options: ListRouteOptions = {}): string {
  const params = new URLSearchParams(currentSearch.replace(/^\?/, ''));

  params.delete('view');
  params.delete('contact');
  params.delete('peek');
  params.delete('tab');
  if (options.addColumn) {
    params.set(COLUMNS_PARAM, addColumnParam(params.get(COLUMNS_PARAM), options.addColumn));
  }

  const query = params.toString();
  return `/${options.moduleId ?? 'contacts'}${query === '' ? '' : `?${query}`}`;
}

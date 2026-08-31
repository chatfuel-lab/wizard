/**
 * The one filter model every contacts surface reads, and the pure helpers over
 * it.
 *
 * It is deliberately larger than either engine can honour on its own:
 * `contactsConnection` can express the groups and the sort but not a text
 * search, a stage, an assignee or "unread"; `contactChatsConnection` can
 * express exactly those four and nothing else. `lib/queryPlan.ts` decides
 * which half the server gets and which half is applied to the rows that came
 * back — this file only says what the user asked for.
 *
 * Keeping one model is what makes a filter survive a view switch, and it is
 * what saved views serialize.
 */
import {
  AttrFilterDefaultOperator,
  BoolOperator,
  ContactAssigneeFilterType,
  Platform,
  SalesStageV2,
  Sort,
  type ContactAssigneeFilter,
} from '~api/generated/contacts/graphql';

// ---------------------------------------------------------------------------
// Assignee
// ---------------------------------------------------------------------------

/**
 * Assignee is a key rather than a free-form predicate because it is not an
 * attribute: the API takes a `ContactAssigneeFilter`, and `u:<UserAccountID>`
 * carries the one id that filter needs. The member list is already fetched for
 * the owner picker, so the key resolves to a name without another request.
 */
export type AssigneeFilterKey = 'Any' | 'Unassigned' | 'FuelyAI' | `u:${string}`;

export const ASSIGNEE_PRESETS = ['Any', 'Unassigned', 'FuelyAI'] as const;

export const ASSIGNEE_PRESET_LABELS: Record<(typeof ASSIGNEE_PRESETS)[number], string> = {
  Any: 'Anyone',
  Unassigned: 'Unassigned',
  FuelyAI: 'Assigned to AI',
};

export const userAssigneeKey = (userAccountId: string): AssigneeFilterKey => `u:${userAccountId}`;

export function assigneeUserId(key: AssigneeFilterKey): string | null {
  return key.startsWith('u:') ? key.slice(2) : null;
}

export function toAssigneeFilter(key: AssigneeFilterKey): ContactAssigneeFilter {
  const userId = assigneeUserId(key);
  if (userId) return { type: ContactAssigneeFilterType.AssigneeId, assigneeID: userId };
  if (key === 'Unassigned') return { type: ContactAssigneeFilterType.Unassigned };
  if (key === 'FuelyAI') return { type: ContactAssigneeFilterType.FuelyAi };
  return { type: ContactAssigneeFilterType.Any };
}

// ---------------------------------------------------------------------------
// Attribute predicates and groups
// ---------------------------------------------------------------------------

/**
 * One attribute predicate. `values` is empty for IS_EMPTY / IS_NOT_EMPTY —
 * the SDL's `comparableValues` is a list and those two operators ignore it
 * (sending one anyway is `attr_filter_comparable_values_not_allowed`).
 *
 * A multi-value list is an OR inside the predicate: in practice, two values
 * on one CONTAINS matched exactly what two CONTAINS predicates joined by OR
 * matched.
 */
export interface AttrPredicate {
  id: string;
  name: string;
  operator: AttrFilterDefaultOperator;
  values: string[];
}

/**
 * A group of predicates joined by ONE operator, and groups themselves are
 * joined by another. That is the whole shape the API allows: `SegmentInput`
 * has a single `resultOperator`, and the second level comes from
 * `FilterInput.byInFlightSegment`, which nests a segment inside a filter slot.
 * Nesting deeper than that is possible (depth 3 answered live) but there is no
 * question a third level asks that two cannot, so the builder stops at two.
 */
export interface FilterGroup {
  id: string;
  operator: BoolOperator;
  predicates: AttrPredicate[];
}

export interface SortSpec {
  /** An attribute name — the API cannot sort by anything else. */
  name: string;
  direction: Sort;
}

export interface ContactsFilter {
  /** Free text over name and phone. Server-side only under the chats engine. */
  q: string;
  assignee: AssigneeFilterKey;
  /** Empty means every stage — which is what the API means by `[]` too. */
  stages: SalesStageV2[];
  unreadOnly: boolean;
  /** ISO instants bounding the last message. Chats engine only. */
  since: string | null;
  until: string | null;
  /** Channels. Only the segment engine takes them as an argument. */
  platforms: Platform[];
  groupOperator: BoolOperator;
  groups: FilterGroup[];
  sort: SortSpec | null;
}

export const ALL_STAGES: readonly SalesStageV2[] = [
  SalesStageV2.New,
  SalesStageV2.Sorting,
  SalesStageV2.Ready,
  SalesStageV2.WorkingOn,
  SalesStageV2.Won,
  SalesStageV2.Lost,
];

export const ALL_PLATFORMS: readonly Platform[] = [
  Platform.Facebook,
  Platform.Instagram,
  Platform.Tiktok,
  Platform.Whatsapp,
  Platform.Widget,
];

export const EMPTY_FILTER: ContactsFilter = {
  q: '',
  assignee: 'Any',
  stages: [],
  unreadOnly: false,
  since: null,
  until: null,
  platforms: [...ALL_PLATFORMS],
  groupOperator: BoolOperator.And,
  groups: [],
  sort: null,
};

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------

/** Every operator, in the order the editor offers them. */
export const OPERATORS: readonly AttrFilterDefaultOperator[] = [
  AttrFilterDefaultOperator.Is,
  AttrFilterDefaultOperator.IsNot,
  AttrFilterDefaultOperator.Contains,
  AttrFilterDefaultOperator.StartsWith,
  AttrFilterDefaultOperator.Gt,
  AttrFilterDefaultOperator.Lt,
  AttrFilterDefaultOperator.IsEmpty,
  AttrFilterDefaultOperator.IsNotEmpty,
];

export const OPERATOR_LABELS: Record<AttrFilterDefaultOperator, string> = {
  [AttrFilterDefaultOperator.Is]: 'is',
  [AttrFilterDefaultOperator.IsNot]: 'is not',
  [AttrFilterDefaultOperator.Contains]: 'contains',
  [AttrFilterDefaultOperator.StartsWith]: 'starts with',
  [AttrFilterDefaultOperator.Gt]: 'is after / greater than',
  [AttrFilterDefaultOperator.Lt]: 'is before / less than',
  [AttrFilterDefaultOperator.IsEmpty]: 'is empty',
  [AttrFilterDefaultOperator.IsNotEmpty]: 'is not empty',
};

/** Takes no value at all. */
export function isNullary(operator: AttrFilterDefaultOperator): boolean {
  return operator === AttrFilterDefaultOperator.IsEmpty || operator === AttrFilterDefaultOperator.IsNotEmpty;
}

/**
 * Compares against one value; the rest accept a list. GT/LT are ranges and
 * STARTS_WITH has no sensible list form.
 */
export function isSingleValued(operator: AttrFilterDefaultOperator): boolean {
  return (
    operator === AttrFilterDefaultOperator.Gt ||
    operator === AttrFilterDefaultOperator.Lt ||
    operator === AttrFilterDefaultOperator.StartsWith
  );
}

/**
 * The operators whose answer is approximate, because the server compares every
 * typed interpretation of the value at once (the SDL's own example: "001717…"
 * satisfies `starts_with "00"` and `greater_than "500"` simultaneously).
 */
export function isRangeOperator(operator: AttrFilterDefaultOperator): boolean {
  return operator === AttrFilterDefaultOperator.Gt || operator === AttrFilterDefaultOperator.Lt;
}

// ---------------------------------------------------------------------------
// Reading the model
// ---------------------------------------------------------------------------

/** A predicate the server can actually be asked about. */
export function isUsablePredicate(predicate: AttrPredicate): boolean {
  if (predicate.name.trim() === '') return false;
  if (isNullary(predicate.operator)) return true;
  return predicate.values.some((value) => value.trim() !== '');
}

/** The groups reduced to what is worth sending: empty groups disappear. */
export function usableGroups(filter: ContactsFilter): FilterGroup[] {
  return filter.groups
    .map((group) => ({ ...group, predicates: group.predicates.filter(isUsablePredicate) }))
    .filter((group) => group.predicates.length > 0);
}

export const hasPredicates = (filter: ContactsFilter): boolean => usableGroups(filter).length > 0;

export const isPlatformSubset = (filter: ContactsFilter): boolean =>
  filter.platforms.length > 0 && filter.platforms.length < ALL_PLATFORMS.length;

export function isFilterEmpty(filter: ContactsFilter): boolean {
  return (
    filter.q.trim() === '' &&
    filter.assignee === 'Any' &&
    filter.stages.length === 0 &&
    !filter.unreadOnly &&
    filter.since === null &&
    filter.until === null &&
    !isPlatformSubset(filter) &&
    !hasPredicates(filter) &&
    filter.sort === null
  );
}

/** What the "N filters" pill counts. Sort is not a filter. */
export function activeFilterCount(filter: ContactsFilter): number {
  let count = 0;
  if (filter.q.trim() !== '') count += 1;
  if (filter.assignee !== 'Any') count += 1;
  if (filter.stages.length > 0) count += 1;
  if (filter.unreadOnly) count += 1;
  if (filter.since !== null || filter.until !== null) count += 1;
  if (isPlatformSubset(filter)) count += 1;
  for (const group of usableGroups(filter)) count += group.predicates.length;
  return count;
}

/** The filters only the chats engine can express, as one boolean. */
export function usesChatOnlyFilters(filter: ContactsFilter): boolean {
  return (
    filter.q.trim() !== '' ||
    filter.assignee !== 'Any' ||
    filter.stages.length > 0 ||
    filter.unreadOnly ||
    filter.since !== null ||
    filter.until !== null
  );
}

/** The filters only the segment engine can express. */
export function usesSegmentOnlyFilters(filter: ContactsFilter): boolean {
  return hasPredicates(filter) || filter.sort !== null;
}

// ---------------------------------------------------------------------------
// Editing the model — pure, so the toolbar has no logic in it
// ---------------------------------------------------------------------------

/**
 * The smallest unused `g<n>` / `p<n>`. Deterministic on purpose: ids feed
 * `stableUuid`, and a random one would make every render a new `FilterID`,
 * i.e. a new variables object, i.e. a refetch loop.
 */
function nextId(prefix: string, taken: readonly string[]): string {
  for (let n = 1; ; n += 1) {
    const candidate = `${prefix}${n}`;
    if (!taken.includes(candidate)) return candidate;
  }
}

export const newGroupId = (filter: ContactsFilter): string =>
  nextId(
    'g',
    filter.groups.map((g) => g.id),
  );

export const newPredicateId = (group: FilterGroup): string =>
  nextId(
    'p',
    group.predicates.map((p) => p.id),
  );

export function emptyPredicate(group: FilterGroup, name = ''): AttrPredicate {
  return { id: newPredicateId(group), name, operator: AttrFilterDefaultOperator.Is, values: [''] };
}

export function addGroup(filter: ContactsFilter, name = ''): ContactsFilter {
  const group: FilterGroup = { id: newGroupId(filter), operator: BoolOperator.And, predicates: [] };
  return { ...filter, groups: [...filter.groups, { ...group, predicates: [emptyPredicate(group, name)] }] };
}

export function updateGroup(filter: ContactsFilter, groupId: string, patch: Partial<FilterGroup>): ContactsFilter {
  return {
    ...filter,
    groups: filter.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
  };
}

export function removeGroup(filter: ContactsFilter, groupId: string): ContactsFilter {
  return { ...filter, groups: filter.groups.filter((group) => group.id !== groupId) };
}

export function addPredicate(filter: ContactsFilter, groupId: string, name = ''): ContactsFilter {
  return {
    ...filter,
    groups: filter.groups.map((group) =>
      group.id === groupId ? { ...group, predicates: [...group.predicates, emptyPredicate(group, name)] } : group,
    ),
  };
}

export function updatePredicate(
  filter: ContactsFilter,
  groupId: string,
  predicateId: string,
  patch: Partial<AttrPredicate>,
): ContactsFilter {
  return {
    ...filter,
    groups: filter.groups.map((group) =>
      group.id !== groupId
        ? group
        : {
            ...group,
            predicates: group.predicates.map((predicate) =>
              predicate.id === predicateId ? { ...predicate, ...patch } : predicate,
            ),
          },
    ),
  };
}

/** Removing the last predicate removes the group with it — an empty box is noise. */
export function removePredicate(filter: ContactsFilter, groupId: string, predicateId: string): ContactsFilter {
  return {
    ...filter,
    groups: filter.groups
      .map((group) =>
        group.id !== groupId
          ? group
          : { ...group, predicates: group.predicates.filter((predicate) => predicate.id !== predicateId) },
      )
      .filter((group) => group.predicates.length > 0),
  };
}

/**
 * A predicate for one attribute, as the Fields surface and the audience tiles
 * build it — "show me the contacts that have this field".
 */
export function filterForAttribute(name: string, operator = AttrFilterDefaultOperator.IsNotEmpty): ContactsFilter {
  return {
    ...EMPTY_FILTER,
    groups: [{ id: 'g1', operator: BoolOperator.And, predicates: [{ id: 'p1', name, operator, values: [] }] }],
  };
}

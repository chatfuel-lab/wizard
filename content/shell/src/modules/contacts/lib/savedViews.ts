/**
 * "Your views": a whole `ContactsFilter` — plus the density and the list's
 * column layout — round-tripped through one string.
 *
 * `setUserStorageItem` / `currentUser.userStorageItem` is the ONLY persistence
 * this API has, and it is scoped to the signed-in user. There is no team scope,
 * no sharing, no server-side segment store (`byStoredSegment` fails live) and
 * no validation of what comes back. Three consequences run through this file:
 *
 * 1. **Everything read back is untrusted.** A value written by an older build,
 *    by another tab, or by a person with a console must degrade to a default
 *    rather than throw. Nothing here throws; an entry that cannot be repaired
 *    is dropped.
 * 2. **"Never written" and "written empty" are different.** Deleting your last
 *    view must not resurrect the starter set on the next load, so the parser
 *    reports `empty` — true only when nothing readable was ever stored — and
 *    the hook seeds the starters exactly then.
 * 3. **The UI says "your views".** Implying a teammate can see them would be
 *    the one bug in this feature nobody can find by looking at it.
 *
 * ## Rolling windows
 *
 * A time filter saved as an absolute instant is a lie a month later: a view
 * called "Recently active" would still mean "since 18 August 2026". So a view
 * may carry a `rolling` spec — a number of days and where the recomputed
 * instant goes — and applying the view recomputes it from `now`. Only that one
 * value moves; everything else is stored exactly as the person built it.
 */
import { AttrFilterDefaultOperator, BoolOperator, Platform, SalesStageV2, Sort } from '~api/generated/contacts/graphql';
import {
  asString,
  isRecord,
  nextEntryId,
  parseStoredList,
  removeEntry,
  renameEntry,
  serializeStoredList,
  upsertEntry,
} from '~ui';
import {
  ALL_PLATFORMS,
  ALL_STAGES,
  ASSIGNEE_PRESETS,
  EMPTY_FILTER,
  activeFilterCount,
  usableGroups,
  type AssigneeFilterKey,
  type AttrPredicate,
  type ContactsFilter,
  type FilterGroup,
} from './contactsFilter';
import { DEFAULT_DENSITY, DENSITIES, type Density } from './contactsParams';
import { STAGE_LABELS, describeDays } from './filterLabels';
import { MAX_GROUPS, MAX_PREDICATES } from './filterValidation';
import { PLATFORM_LABELS } from './platforms';
import { DAY as DAY_MS } from './time';

/** Versioned: a future shape change reads back as "nothing stored", not garbage. */
export const SAVED_VIEWS_KEY = 'chatfuel.contacts.saved-views.v1';

export const MAX_SAVED_VIEWS = 40;
export const MAX_NAME_LENGTH = 60;
const MAX_QUERY_LENGTH = 200;
const MAX_VALUES = 20;
const MAX_COLUMNS = 80;

/**
 * The list's reading preferences. Track A owns the table and hands these in;
 * this file only stores them, because a view that restores the filter and not
 * the columns restores half a workspace.
 */
export interface ContactsListLayout {
  /** Column keys, in order. */
  columns: string[];
  /** Keys hidden by the column picker. */
  hidden: string[];
  /** Key → pixel width, from the resize handles. */
  widths: Record<string, number>;
}

export type RollingTarget = { kind: 'since' } | { kind: 'predicate'; groupId: string; predicateId: string };

export interface RollingWindow {
  /** Days back from now. */
  days: number;
  target: RollingTarget;
}

export interface SavedView {
  id: string;
  name: string;
  filter: ContactsFilter;
  density: Density;
  layout: ContactsListLayout | null;
  /** The one value recomputed when the view is applied, or null. */
  rolling: RollingWindow | null;
  /** Epoch ms. Ordering and the menu's caption only. */
  savedAt: number;
  /** Seeded by this module rather than saved by the user. */
  starter?: boolean;
}

export interface StoredViews {
  views: SavedView[];
  /** True when nothing readable was ever stored — the cue to seed the starters. */
  empty: boolean;
}

// ---------------------------------------------------------------------------
// Reading untrusted JSON
// ---------------------------------------------------------------------------

const OPERATORS = new Set<string>(Object.values(AttrFilterDefaultOperator));
const SORTS = new Set<string>(Object.values(Sort));
const BOOL_OPERATORS = new Set<string>(Object.values(BoolOperator));

const asStringList = (value: unknown, cap: number): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string').slice(0, cap) : [];

/** An ISO instant, or null. A value `Date` cannot read is dropped, never sent. */
function sanitizeInstant(value: unknown): string | null {
  const raw = asString(value);
  if (raw === null || raw === '') return null;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function sanitizePredicate(value: unknown, index: number): AttrPredicate | null {
  if (!isRecord(value)) return null;
  const name = asString(value.name)?.trim() ?? '';
  if (name === '') return null;
  const operator = asString(value.operator);
  return {
    id: asString(value.id)?.trim() || `p${index + 1}`,
    name,
    operator:
      operator !== null && OPERATORS.has(operator)
        ? (operator as AttrFilterDefaultOperator)
        : AttrFilterDefaultOperator.Is,
    values: asStringList(value.values, MAX_VALUES),
  };
}

function sanitizeGroups(value: unknown): FilterGroup[] {
  if (!Array.isArray(value)) return [];
  const groups: FilterGroup[] = [];
  let budget = MAX_PREDICATES;

  for (const [index, raw] of value.entries()) {
    if (groups.length >= MAX_GROUPS || budget <= 0) break;
    if (!isRecord(raw)) continue;
    const operator = asString(raw.operator);
    const predicates = (Array.isArray(raw.predicates) ? raw.predicates : [])
      .map(sanitizePredicate)
      .filter((entry): entry is AttrPredicate => entry !== null)
      .slice(0, budget);
    if (predicates.length === 0) continue;
    budget -= predicates.length;
    groups.push({
      id: asString(raw.id)?.trim() || `g${index + 1}`,
      operator: operator !== null && BOOL_OPERATORS.has(operator) ? (operator as BoolOperator) : BoolOperator.And,
      predicates,
    });
  }
  return groups;
}

function sanitizeSort(value: unknown): ContactsFilter['sort'] {
  if (!isRecord(value)) return null;
  const name = asString(value.name)?.trim() ?? '';
  const direction = asString(value.direction);
  if (name === '') return null;
  if (direction === null || !SORTS.has(direction)) return null;
  return { name, direction: direction as Sort };
}

function sanitizeStages(value: unknown): SalesStageV2[] {
  const wanted = new Set(asStringList(value, ALL_STAGES.length * 2));
  // Canonical order, deduped — the same rule the URL parser uses.
  const stages = ALL_STAGES.filter((stage) => wanted.has(stage));
  return stages.length === ALL_STAGES.length ? [] : [...stages];
}

/** A positive list; an empty or unreadable one means "every channel". */
function sanitizePlatforms(value: unknown): Platform[] {
  const wanted = new Set(asStringList(value, ALL_PLATFORMS.length * 2));
  const platforms = ALL_PLATFORMS.filter((platform) => wanted.has(platform));
  return platforms.length === 0 ? [...ALL_PLATFORMS] : [...platforms];
}

function sanitizeAssignee(value: unknown): AssigneeFilterKey {
  const raw = asString(value);
  if (raw === null) return EMPTY_FILTER.assignee;
  if ((ASSIGNEE_PRESETS as readonly string[]).includes(raw)) return raw as AssigneeFilterKey;
  if (raw.startsWith('u:') && raw.length > 2) return raw as AssigneeFilterKey;
  return EMPTY_FILTER.assignee;
}

/** Any value → a filter this module can actually run. Never throws. */
export function sanitizeFilter(value: unknown): ContactsFilter {
  if (!isRecord(value)) return EMPTY_FILTER;
  const groupOperator = asString(value.groupOperator);
  return {
    q: (asString(value.q) ?? '').slice(0, MAX_QUERY_LENGTH),
    assignee: sanitizeAssignee(value.assignee),
    stages: sanitizeStages(value.stages),
    unreadOnly: value.unreadOnly === true,
    since: sanitizeInstant(value.since),
    until: sanitizeInstant(value.until),
    platforms: sanitizePlatforms(value.platforms),
    groupOperator:
      groupOperator !== null && BOOL_OPERATORS.has(groupOperator)
        ? (groupOperator as BoolOperator)
        : EMPTY_FILTER.groupOperator,
    groups: sanitizeGroups(value.groups),
    sort: sanitizeSort(value.sort),
  };
}

function sanitizeLayout(value: unknown): ContactsListLayout | null {
  if (!isRecord(value)) return null;
  const columns = asStringList(value.columns, MAX_COLUMNS);
  const hidden = asStringList(value.hidden, MAX_COLUMNS);
  const widths: Record<string, number> = {};
  if (isRecord(value.widths)) {
    for (const [key, width] of Object.entries(value.widths).slice(0, MAX_COLUMNS)) {
      if (typeof width === 'number' && Number.isFinite(width) && width > 0) widths[key] = width;
    }
  }
  if (columns.length === 0 && hidden.length === 0 && Object.keys(widths).length === 0) return null;
  return { columns, hidden, widths };
}

function sanitizeRolling(value: unknown): RollingWindow | null {
  if (!isRecord(value)) return null;
  const days = typeof value.days === 'number' && Number.isFinite(value.days) ? Math.round(value.days) : 0;
  if (days < 1) return null;
  const target = value.target;
  if (!isRecord(target)) return null;
  if (target.kind === 'since') return { days, target: { kind: 'since' } };
  if (target.kind === 'predicate') {
    const groupId = asString(target.groupId)?.trim() ?? '';
    const predicateId = asString(target.predicateId)?.trim() ?? '';
    if (groupId === '' || predicateId === '') return null;
    return { days, target: { kind: 'predicate', groupId, predicateId } };
  }
  return null;
}

function sanitizeView(value: unknown, index: number, now: number): SavedView | null {
  if (!isRecord(value)) return null;
  const name = (asString(value.name) ?? '').trim().slice(0, MAX_NAME_LENGTH);
  const density = asString(value.density);
  const savedAt = typeof value.savedAt === 'number' && Number.isFinite(value.savedAt) ? value.savedAt : now;
  return {
    id: asString(value.id)?.trim() || `view-${index + 1}`,
    name: name === '' ? 'Untitled view' : name,
    filter: sanitizeFilter(value.filter),
    density:
      density !== null && (DENSITIES as readonly string[]).includes(density) ? (density as Density) : DEFAULT_DENSITY,
    layout: sanitizeLayout(value.layout),
    rolling: sanitizeRolling(value.rolling),
    savedAt,
    ...(value.starter === true ? { starter: true } : {}),
  };
}

/**
 * The stored string → the list, plus whether anything was ever stored.
 *
 * The envelope, the id dedupe and the cap are the shared list core's; what a
 * view MEANS — and how a broken one is repaired rather than thrown — is
 * `sanitizeView` above. Anything unparseable reads as "never stored": losing
 * saved views is recoverable, a crashing menu is not, and re-seeding the
 * starters is the friendlier recovery.
 */
export function parseSavedViews(raw: string | null | undefined, now = Date.now()): StoredViews {
  const { entries, empty } = parseStoredList(raw, (value, index) => sanitizeView(value, index, now), MAX_SAVED_VIEWS);
  return { views: entries, empty };
}

export function serializeSavedViews(views: readonly SavedView[]): string {
  return serializeStoredList(views, MAX_SAVED_VIEWS);
}

// ---------------------------------------------------------------------------
// Rolling windows
// ---------------------------------------------------------------------------

const instantDaysAgo = (days: number, now: number): number => now - days * DAY_MS;

/** The view as it should be applied right now: only the rolling value moves. */
export function resolveSavedFilter(view: SavedView, now = Date.now()): ContactsFilter {
  const { rolling } = view;
  if (!rolling) return view.filter;
  const at = instantDaysAgo(rolling.days, now);

  if (rolling.target.kind === 'since') {
    return { ...view.filter, since: new Date(at).toISOString(), until: null };
  }

  const { groupId, predicateId } = rolling.target;
  return {
    ...view.filter,
    groups: view.filter.groups.map((group) =>
      group.id !== groupId
        ? group
        : {
            ...group,
            predicates: group.predicates.map((predicate) =>
              predicate.id === predicateId ? { ...predicate, values: [String(at)] } : predicate,
            ),
          },
    ),
  };
}

/** A 13-digit millisecond stamp — the wire form `lib/contactsSegment.ts` sends. */
const isMillisecondStamp = (value: string): boolean => /^\d{12,14}$/.test(value.trim());

/**
 * Could this filter be saved as a rolling window? Returns the spec to offer,
 * or null when there is no single time value to move.
 *
 * A bare `since` is the obvious case. The other is a lone greater-than on a
 * timestamp: that is how "active in the last 7 days" is actually expressed,
 * because a window on its own routes to the engine that has no time argument.
 */
export function detectRolling(filter: ContactsFilter, now = Date.now()): RollingWindow | null {
  const daysBetween = (instant: number): number => Math.max(1, Math.round((now - instant) / DAY_MS));

  if (filter.since !== null && filter.until === null) {
    const at = Date.parse(filter.since);
    if (Number.isFinite(at) && at <= now) return { days: daysBetween(at), target: { kind: 'since' } };
  }

  const stamped: { groupId: string; predicate: AttrPredicate }[] = [];
  for (const group of filter.groups) {
    for (const predicate of group.predicates) {
      if (predicate.operator !== AttrFilterDefaultOperator.Gt) continue;
      const [value, ...rest] = predicate.values;
      if (rest.length > 0 || value === undefined || !isMillisecondStamp(value)) continue;
      stamped.push({ groupId: group.id, predicate });
    }
  }
  if (stamped.length !== 1) return null;

  const [only] = stamped;
  const at = Number(only.predicate.values[0]);
  if (!Number.isFinite(at) || at > now) return null;
  return {
    days: daysBetween(at),
    target: { kind: 'predicate', groupId: only.groupId, predicateId: only.predicate.id },
  };
}

// ---------------------------------------------------------------------------
// The starter set
// ---------------------------------------------------------------------------

export interface StarterFieldNames {
  /** The system attribute a WhatsApp number lands in. */
  phone: string;
  /** The system datetime attribute the bot stamps on every interaction. */
  lastSeen: string;
}

/**
 * The names the API returns, and the SDL's own names for those two system
 * attributes. `SavedViewsMenu` overrides them from the live catalog when it has
 * one — an unknown attribute name matches nobody in silence, so getting these
 * right is the difference between a starter view that works and one that reads
 * as "no contacts".
 */
export const DEFAULT_STARTER_FIELDS: StarterFieldNames = {
  phone: 'whatsapp phone',
  lastSeen: 'last seen',
};

const RECENTLY_ACTIVE_DAYS = 7;

/**
 * What a bot with no saved views starts with. Five questions a person actually
 * asks on day one, and every one of them is a filter this API can answer.
 *
 * "Recently active" is a greater-than on `last seen` rather than the bar's
 * last-message window on purpose: a window with nothing else routes to
 * `contactChatsConnection`, which takes no time argument, so it would narrow
 * nothing. As a field condition it is answered by the server.
 */
export function starterViews(now = Date.now(), fields: StarterFieldNames = DEFAULT_STARTER_FIELDS): SavedView[] {
  const base = (id: string, name: string, filter: ContactsFilter, rolling: RollingWindow | null = null): SavedView => ({
    id: `starter-${id}`,
    name,
    filter,
    density: DEFAULT_DENSITY,
    layout: null,
    rolling,
    savedAt: now,
    starter: true,
  });

  const single = (predicate: AttrPredicate): ContactsFilter => ({
    ...EMPTY_FILTER,
    groups: [{ id: 'g1', operator: BoolOperator.And, predicates: [predicate] }],
  });

  return [
    base('unassigned', 'Unassigned', { ...EMPTY_FILTER, assignee: 'Unassigned' }),
    base('unread', 'Unread', { ...EMPTY_FILTER, unreadOnly: true }),
    base('hot-leads', 'Hot leads', {
      ...EMPTY_FILTER,
      stages: [SalesStageV2.Ready, SalesStageV2.WorkingOn],
    }),
    base(
      'no-phone',
      'No phone',
      single({
        id: 'p1',
        name: fields.phone,
        operator: AttrFilterDefaultOperator.IsEmpty,
        values: [],
      }),
    ),
    base(
      'recently-active',
      'Recently active',
      single({
        id: 'p1',
        name: fields.lastSeen,
        operator: AttrFilterDefaultOperator.Gt,
        values: [String(now - RECENTLY_ACTIVE_DAYS * DAY_MS)],
      }),
      { days: RECENTLY_ACTIVE_DAYS, target: { kind: 'predicate', groupId: 'g1', predicateId: 'p1' } },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Editing the list
// ---------------------------------------------------------------------------

/** Stable, readable and collision-free without a uuid dependency. */
export const nextViewId = (views: readonly SavedView[], name: string, now: number): string =>
  nextEntryId(views, name, now);

/** Replace by id, or prepend. Newest first, so a fresh save is visible. */
export const upsertSavedView = (views: readonly SavedView[], view: SavedView): SavedView[] =>
  upsertEntry(views, view, MAX_SAVED_VIEWS);

export const removeSavedView = (views: readonly SavedView[], id: string): SavedView[] => removeEntry(views, id);

export const renameSavedView = (views: readonly SavedView[], id: string, name: string): SavedView[] =>
  renameEntry(views, id, name, MAX_NAME_LENGTH);

// ---------------------------------------------------------------------------
// Matching what is on screen
// ---------------------------------------------------------------------------

const sameList = <T>(a: readonly T[], b: readonly T[]): boolean =>
  a.length === b.length && a.every((entry, index) => entry === b[index]);

const sameSet = <T>(a: readonly T[], b: readonly T[]): boolean =>
  a.length === b.length && a.every((entry) => b.includes(entry));

const samePredicate = (a: AttrPredicate, b: AttrPredicate): boolean =>
  a.name.trim() === b.name.trim() && a.operator === b.operator && sameList(a.values, b.values);

const sameGroup = (a: FilterGroup, b: FilterGroup): boolean =>
  a.operator === b.operator &&
  a.predicates.length === b.predicates.length &&
  a.predicates.every((predicate, index) => samePredicate(predicate, b.predicates[index]));

/**
 * Filter equality ignoring ids — they are local handles, not data — and
 * ignoring predicates the builder would drop anyway, so a half-typed row does
 * not un-tick the view it belongs to.
 */
export function sameFilter(a: ContactsFilter, b: ContactsFilter): boolean {
  const groupsA = usableGroups(a);
  const groupsB = usableGroups(b);
  return (
    a.q.trim() === b.q.trim() &&
    a.assignee === b.assignee &&
    sameSet(a.stages, b.stages) &&
    a.unreadOnly === b.unreadOnly &&
    a.since === b.since &&
    a.until === b.until &&
    sameSet(a.platforms, b.platforms) &&
    a.groupOperator === b.groupOperator &&
    groupsA.length === groupsB.length &&
    groupsA.every((group, index) => sameGroup(group, groupsB[index])) &&
    (a.sort === null
      ? b.sort === null
      : b.sort !== null && a.sort.name === b.sort.name && a.sort.direction === b.sort.direction)
  );
}

/**
 * A rolling view's instant is recomputed on every apply, so comparing it to
 * what is on screen would fail a second later. Both sides are blanked at the
 * same target before they are compared.
 */
function blankRolling(filter: ContactsFilter, rolling: RollingWindow | null): ContactsFilter {
  if (!rolling) return filter;
  if (rolling.target.kind === 'since') return { ...filter, since: null };
  const { groupId, predicateId } = rolling.target;
  return {
    ...filter,
    groups: filter.groups.map((group) =>
      group.id !== groupId
        ? group
        : {
            ...group,
            predicates: group.predicates.map((predicate) =>
              predicate.id === predicateId ? { ...predicate, values: ['*'] } : predicate,
            ),
          },
    ),
  };
}

/** Which saved view the current filter IS, if any — the menu's check mark. */
export function findMatchingView(
  views: readonly SavedView[],
  filter: ContactsFilter,
  now = Date.now(),
): SavedView | null {
  return (
    views.find((view) =>
      sameFilter(blankRolling(resolveSavedFilter(view, now), view.rolling), blankRolling(filter, view.rolling)),
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Describing one
// ---------------------------------------------------------------------------

const ASSIGNEE_CAPTIONS: Record<(typeof ASSIGNEE_PRESETS)[number], string> = {
  Any: 'Anyone',
  Unassigned: 'Unassigned',
  FuelyAI: 'Assigned to AI',
};

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/** The one-line caption under a saved view's name. */
export function describeSavedView(view: SavedView): string {
  const { filter } = view;
  const parts: string[] = [];

  if (filter.q.trim() !== '') parts.push(`“${filter.q.trim()}”`);
  if (filter.assignee !== 'Any') {
    parts.push(ASSIGNEE_CAPTIONS[filter.assignee as (typeof ASSIGNEE_PRESETS)[number]] ?? 'One owner');
  }
  if (filter.stages.length > 0) {
    parts.push(filter.stages.map((stage) => STAGE_LABELS[stage]).join(', '));
  }
  if (filter.unreadOnly) parts.push('Unread');
  if (filter.platforms.length > 0 && filter.platforms.length < ALL_PLATFORMS.length) {
    parts.push(filter.platforms.map((platform) => PLATFORM_LABELS[platform]).join(', '));
  }

  const predicates = usableGroups(filter).reduce((total, group) => total + group.predicates.length, 0);
  if (predicates > 0) parts.push(plural(predicates, 'field condition', 'field conditions'));

  if (view.rolling) parts.push(`rolling ${describeDays(view.rolling.days)}`);
  else if (filter.since !== null || filter.until !== null) parts.push('a fixed time window');

  if (filter.sort !== null) parts.push(`sorted by ${filter.sort.name}`);
  if (view.layout !== null) parts.push('its columns');

  if (parts.length === 0) {
    return activeFilterCount(filter) === 0 ? 'Every contact' : 'No filters';
  }
  return parts.join(' · ');
}

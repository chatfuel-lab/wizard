import { AttrFilterDefaultOperator, Sort, type SalesStageV2 } from '~api/generated/deals/graphql';
import { asString, isRecord, parseStoredList } from '~ui';
import {
  ASSIGNEE_PRESETS,
  EMPTY_FILTER,
  activeFilterCount,
  type AssigneeFilterKey,
  type AttrPredicate,
  type DealsFilter,
} from './dealsFilter';
import { VIEWS, type DealsView } from './dealsParams';
import { STAGES, STAGE_META } from './stages';

/**
 * Saved views: a `DealsFilter` round-tripped through one string.
 *
 * `setUserStorageItem` / `currentUser.userStorageItem` is the **only**
 * persistence this API offers and it is scoped to the signed-in user, so the
 * whole list lives in a single item under `SAVED_VIEWS_KEY`. There is no
 * sharing, no team scope and no server-side validation — which makes this file
 * the only thing standing between a hand-edited storage item and a white
 * screen.
 *
 * **Everything read back is untrusted.** A value written by an older version of
 * this module, by another tab, or by a person with a console, must degrade to
 * the default rather than throw. `parseSavedViews` therefore never throws and
 * never returns a partially-typed object: every field is checked, unknown enum
 * members fall back, and an entry that cannot be repaired is dropped.
 *
 * The list mechanics — the envelope, the id discipline, dedupe, caps, and the
 * edits — are the shared `savedViewsCore` half in the UI package; this file
 * keeps only what a deals view MEANS: the filter vocabulary, its sanitizers,
 * equality, and the captions.
 */

/** Versioned: a future shape change reads back as "no views", not as garbage. */
export const SAVED_VIEWS_KEY = 'chatfuel.deals.saved-views.v1';

export const MAX_SAVED_VIEWS = 50;
export const MAX_NAME_LENGTH = 60;
const MAX_QUERY_LENGTH = 200;
const MAX_PREDICATES = 20;
const MAX_VALUES = 20;

export interface SavedView {
  id: string;
  name: string;
  view: DealsView;
  filter: DealsFilter;
  /** Epoch ms. Only used for ordering and for the menu's caption. */
  savedAt: number;
}

const OPERATORS = new Set<string>(Object.values(AttrFilterDefaultOperator));
const SORTS = new Set<string>(Object.values(Sort));

function sanitizeStages(value: unknown): SalesStageV2[] {
  if (!Array.isArray(value)) return [];
  const wanted = new Set(value.filter((entry): entry is string => typeof entry === 'string'));
  // Canonical order, deduped — the same rule the URL parser uses.
  return STAGES.filter((stage) => wanted.has(stage));
}

function sanitizePredicate(value: unknown, index: number): AttrPredicate | null {
  if (!isRecord(value)) return null;
  const name = asString(value.name)?.trim() ?? '';
  if (name === '') return null;
  const operator = asString(value.operator);
  const values = Array.isArray(value.values)
    ? value.values.filter((entry): entry is string => typeof entry === 'string').slice(0, MAX_VALUES)
    : [];
  return {
    id: asString(value.id) ?? `p${index}`,
    name,
    operator:
      operator !== null && OPERATORS.has(operator)
        ? (operator as AttrFilterDefaultOperator)
        : AttrFilterDefaultOperator.Is,
    values,
  };
}

function sanitizeSort(value: unknown): DealsFilter['sort'] {
  if (!isRecord(value)) return null;
  const attribute = asString(value.attribute)?.trim() ?? '';
  const direction = asString(value.direction);
  if (attribute === '') return null;
  if (direction === null || !SORTS.has(direction)) return null;
  return { attribute, direction: direction as Sort };
}

/** Any value → a filter this module can actually run. Never throws. */
export function sanitizeFilter(value: unknown): DealsFilter {
  if (!isRecord(value)) return EMPTY_FILTER;
  const assignee = asString(value.assignee);
  const predicates = Array.isArray(value.predicates)
    ? value.predicates
        .slice(0, MAX_PREDICATES)
        .map(sanitizePredicate)
        .filter((entry): entry is AttrPredicate => entry !== null)
    : [];
  return {
    assignee:
      assignee !== null &&
      ((ASSIGNEE_PRESETS as readonly string[]).includes(assignee) || (assignee.startsWith('u:') && assignee.length > 2))
        ? (assignee as AssigneeFilterKey)
        : EMPTY_FILTER.assignee,
    q: (asString(value.q) ?? '').slice(0, MAX_QUERY_LENGTH),
    stages: sanitizeStages(value.stages),
    unreadOnly: value.unreadOnly === true,
    predicates,
    sort: sanitizeSort(value.sort),
  };
}

function sanitizeView(value: unknown, index: number, now: number): SavedView | null {
  if (!isRecord(value)) return null;
  const name = (asString(value.name) ?? '').trim().slice(0, MAX_NAME_LENGTH);
  const view = asString(value.view);
  const savedAt = typeof value.savedAt === 'number' && Number.isFinite(value.savedAt) ? value.savedAt : now;
  return {
    id: asString(value.id)?.trim() || `view-${index}`,
    name: name === '' ? 'Untitled view' : name,
    view: view !== null && (VIEWS as readonly string[]).includes(view) ? (view as DealsView) : 'board',
    filter: sanitizeFilter(value.filter),
    savedAt,
  };
}

/**
 * The stored string → the list. Anything unparseable is an empty list: losing
 * saved views is recoverable, a crashing menu is not. The envelope handling,
 * the id dedupe and the cap are `parseStoredList`; this wrapper keeps the
 * shape deals has always returned — the entries themselves.
 */
export function parseSavedViews(raw: string | null | undefined, now = Date.now()): SavedView[] {
  return parseStoredList(raw, (value, index) => sanitizeView(value, index, now), MAX_SAVED_VIEWS).entries;
}

const samePredicate = (a: AttrPredicate, b: AttrPredicate): boolean =>
  a.name === b.name &&
  a.operator === b.operator &&
  a.values.length === b.values.length &&
  a.values.every((value, index) => value === b.values[index]);

/** Filter equality ignoring predicate ids — they are local handles, not data. */
export function sameFilter(a: DealsFilter, b: DealsFilter): boolean {
  return (
    a.assignee === b.assignee &&
    a.q.trim() === b.q.trim() &&
    a.unreadOnly === b.unreadOnly &&
    a.stages.length === b.stages.length &&
    a.stages.every((stage, index) => stage === b.stages[index]) &&
    a.predicates.length === b.predicates.length &&
    a.predicates.every((predicate, index) => samePredicate(predicate, b.predicates[index]!)) &&
    (a.sort === null
      ? b.sort === null
      : b.sort !== null && a.sort.attribute === b.sort.attribute && a.sort.direction === b.sort.direction)
  );
}

/** Which saved view the current state IS, if any — the menu's check mark. */
export function findMatchingView(views: readonly SavedView[], view: DealsView, filter: DealsFilter): SavedView | null {
  return views.find((entry) => entry.view === view && sameFilter(entry.filter, filter)) ?? null;
}

const VIEW_LABELS: Record<DealsView, string> = {
  board: 'Board',
  table: 'Table',
  forecast: 'Forecast',
};

const ASSIGNEE_LABELS: Record<AssigneeFilterKey, string> = {
  Any: 'Anyone',
  Unassigned: 'Unassigned',
  FuelyAI: 'Fuely AI',
};

/** The one-line caption under a saved view's name. */
export function describeSavedView(view: SavedView): string {
  const parts: string[] = [VIEW_LABELS[view.view]];
  const { filter } = view;
  if (filter.assignee !== 'Any') parts.push(ASSIGNEE_LABELS[filter.assignee]);
  if (filter.stages.length > 0) {
    parts.push(filter.stages.map((stage) => STAGE_META[stage].label).join(', '));
  }
  if (filter.q.trim() !== '') parts.push(`“${filter.q.trim()}”`);
  if (filter.unreadOnly) parts.push('Unread');
  if (filter.predicates.length > 0) {
    parts.push(`${filter.predicates.length} attribute filter${filter.predicates.length === 1 ? '' : 's'}`);
  }
  if (filter.sort !== null) parts.push(`sorted by ${filter.sort.attribute}`);
  if (parts.length === 1 && activeFilterCount(filter) === 0) parts.push('no filters');
  return parts.join(' · ');
}

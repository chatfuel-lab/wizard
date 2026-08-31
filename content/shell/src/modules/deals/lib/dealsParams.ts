/**
 * The module's deep links, parsed and serialized in one pure place.
 *
 * The view is a path segment — '/deals/table' — and everything else is a query
 * parameter. The default view has no segment of its own: '/deals' IS the board.
 * A '?view=' from an older link is still read, once, and dropped on the next
 * write.
 *
 * Two rules the whole file exists to hold:
 *
 * 1. **An unknown value falls back silently.** A hand-edited or stale URL must
 *    never white-screen and must never throw — it renders the default.
 * 2. **A default is omitted from the written params.** Otherwise every mount
 *    would rewrite the URL with the full schema and a shared link would carry
 *    six noise parameters.
 *
 * Attribute predicates are deliberately NOT in the URL: they are unbounded in
 * size and would make a link unshareable. They live in saved views, which are
 * JSON in per-user storage.
 */
import { SalesStageV2, Sort } from '~api/generated/deals/graphql';
import {
  ASSIGNEE_PRESETS,
  EMPTY_FILTER,
  assigneeUserId,
  type AssigneeFilterKey,
  type DealsFilter,
} from './dealsFilter';
import { DENSITIES, type Density } from './layout';
import { STAGES } from './stages';

export type DealsView = 'board' | 'table' | 'forecast';

export const VIEWS: readonly DealsView[] = ['board', 'table', 'forecast'];

export const DEFAULT_VIEW: DealsView = 'board';
export const DEFAULT_DENSITY: Density = 'comfortable';

export interface DealsParams {
  view: DealsView;
  /** Contact id of the open deal, or null. */
  deal: string | null;
  density: Density;
  collapsed: SalesStageV2[];
  /** The half of the filter model a URL can honestly carry. */
  filter: DealsFilter;
}

export const DEFAULT_PARAMS: DealsParams = {
  view: DEFAULT_VIEW,
  deal: null,
  density: DEFAULT_DENSITY,
  collapsed: [],
  filter: EMPTY_FILTER,
};

/** `assignee` is lowercase in the URL; the model keys are not. A real person
 *  rides as `u:<UserAccountID>` in both, unchanged. */
const ASSIGNEE_TO_PARAM: Record<(typeof ASSIGNEE_PRESETS)[number], string> = {
  Any: 'any',
  Unassigned: 'unassigned',
  FuelyAI: 'ai',
};

function parseAssignee(raw: string | null): AssigneeFilterKey {
  if (raw === null) return EMPTY_FILTER.assignee;
  if (raw.startsWith('u:') && raw.length > 2) return raw as AssigneeFilterKey;
  return ASSIGNEE_PRESETS.find((key) => ASSIGNEE_TO_PARAM[key] === raw) ?? EMPTY_FILTER.assignee;
}

function writeAssignee(key: AssigneeFilterKey): string | null {
  if (assigneeUserId(key)) return key;
  return key === 'Any' ? null : ASSIGNEE_TO_PARAM[key as (typeof ASSIGNEE_PRESETS)[number]];
}

const oneOf = <T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(raw as T) ? (raw as T) : fallback;

/** Comma list → the allowed members, deduped, in canonical order. Never throws. */
function parseStageList(raw: string | null): SalesStageV2[] {
  if (!raw) return [];
  const wanted = new Set(raw.split(',').map((part) => part.trim()));
  return STAGES.filter((stage) => wanted.has(stage));
}

function parseSort(raw: string | null): DealsFilter['sort'] {
  if (!raw) return null;
  const at = raw.lastIndexOf(':');
  if (at <= 0) return null;
  const attribute = raw.slice(0, at).trim();
  const direction = raw
    .slice(at + 1)
    .trim()
    .toLowerCase();
  if (attribute === '' || (direction !== 'asc' && direction !== 'desc')) return null;
  return { attribute, direction: direction === 'asc' ? Sort.Asc : Sort.Desc };
}

/** The path segment for a view — the default view has none. */
export const viewSegment = (view: DealsView): string => (view === DEFAULT_VIEW ? '' : view);

export function parseDealsParams(params: URLSearchParams, view = ''): DealsParams {
  const assignee = parseAssignee(params.get('assignee'));
  const deal = params.get('deal');

  return {
    view: oneOf(view === '' ? params.get('view') : view, VIEWS, DEFAULT_VIEW),
    deal: deal === null || deal === '' ? null : deal,
    density: oneOf(params.get('density'), DENSITIES, DEFAULT_DENSITY),
    collapsed: parseStageList(params.get('collapsed')),
    filter: {
      assignee,
      q: params.get('q') ?? '',
      stages: parseStageList(params.get('stage')),
      unreadOnly: params.get('unread') === '1',
      predicates: [],
      sort: parseSort(params.get('sort')),
    },
  };
}

/**
 * Rewrites only this module's keys and leaves anything else in `params`
 * untouched — the shell owns the rest of the query string.
 */
export function writeDealsParams(params: URLSearchParams, next: DealsParams): URLSearchParams {
  const out = new URLSearchParams(params);
  const set = (key: string, value: string | null) => {
    if (value === null || value === '') out.delete(key);
    else out.set(key, value);
  };

  /* The view lives in the path now — '/deals/table'. A stale '?view=' is read
     on the way in and deleted here. */
  set('view', null);
  set('deal', next.deal);
  set('density', next.density === DEFAULT_DENSITY ? null : next.density);
  set('collapsed', next.collapsed.length === 0 ? null : next.collapsed.join(','));
  set('assignee', writeAssignee(next.filter.assignee));
  set('q', next.filter.q.trim() === '' ? null : next.filter.q);
  set('stage', next.filter.stages.length === 0 ? null : next.filter.stages.join(','));
  set('unread', next.filter.unreadOnly ? '1' : null);
  set(
    'sort',
    next.filter.sort === null
      ? null
      : `${next.filter.sort.attribute}:${next.filter.sort.direction === Sort.Asc ? 'asc' : 'desc'}`,
  );

  return out;
}

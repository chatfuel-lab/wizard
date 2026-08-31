import type { ChatListFilter } from '~api/domain/livechat';
import { ContactAssigneeFilterType, SalesStageV2, type ContactAssigneeFilter } from '~api/generated/livechat/graphql';

/**
 * What narrows the inbox, in the form the UI holds it.
 *
 * This is NOT `ChatListFilter`. That one is the wire shape and it is built by
 * `~api/domain/livechat`; this one is the shape a set of controls can edit —
 * assignee as a single string key rather than a nested input object, the search
 * box's raw text rather than a nullable field. `toChatListFilter` is the only
 * crossing, so the wire shape is still only ever produced in one place.
 *
 * **Every transition here returns the SAME OBJECT when nothing changed.** That
 * is not a micro-optimisation, it is the correctness property the whole module
 * hangs off: `useChatListStore` keys its query, its subscription and its epoch on
 * the identity of the filter it is handed. A transition that always allocated
 * would make every keystroke anywhere on the page look like a new question —
 * the list would blank, the WebSocket would tear down and re-establish, and the
 * inbox would never settle. So the filter's identity changes when, and only
 * when, the filter did.
 */

/**
 * Assignee as one key. The three presets plus `u:<UserAccountID>` for a real
 * person, which the API expresses as `AssigneeID` + an id.
 */
export type AssigneeKey = 'Any' | 'Unassigned' | 'FuelyAI' | `u:${string}`;

/** The three that exist on every bot; teammates are appended by the picker. */
export const ASSIGNEE_PRESETS = ['Any', 'Unassigned', 'FuelyAI'] as const;

export const ASSIGNEE_PRESET_LABELS: Record<(typeof ASSIGNEE_PRESETS)[number], string> = {
  Any: 'Anyone',
  Unassigned: 'Unassigned',
  FuelyAI: 'Fuely AI',
};

export const userAssigneeKey = (userAccountId: string): AssigneeKey => `u:${userAccountId}`;

/** The UserAccountID a `u:` key carries, or null for the presets. */
export function assigneeUserId(key: AssigneeKey): string | null {
  return key.startsWith('u:') ? key.slice(2) : null;
}

/** The key as the API's own filter input. */
export function toAssigneeFilter(key: AssigneeKey): ContactAssigneeFilter {
  const userId = assigneeUserId(key);
  if (userId) return { type: ContactAssigneeFilterType.AssigneeId, assigneeID: userId };
  if (key === 'Unassigned') return { type: ContactAssigneeFilterType.Unassigned };
  if (key === 'FuelyAI') return { type: ContactAssigneeFilterType.FuelyAi };
  return { type: ContactAssigneeFilterType.Any };
}

/** The six fixed sales stages, pipeline order. */
export const STAGES: readonly SalesStageV2[] = [
  SalesStageV2.New,
  SalesStageV2.Sorting,
  SalesStageV2.Ready,
  SalesStageV2.WorkingOn,
  SalesStageV2.Won,
  SalesStageV2.Lost,
];

export const STAGE_LABELS: Record<SalesStageV2, string> = {
  [SalesStageV2.New]: 'New',
  [SalesStageV2.Sorting]: 'Sorting',
  [SalesStageV2.Ready]: 'Ready',
  [SalesStageV2.WorkingOn]: 'Working on',
  [SalesStageV2.Won]: 'Won',
  [SalesStageV2.Lost]: 'Lost',
};

export interface InboxFilter {
  assignee: AssigneeKey;
  /** Raw search text. Server-side, over contact name and phone. */
  q: string;
  /** Empty means all six — the server reads an empty list as "do not narrow". */
  stages: SalesStageV2[];
  unreadOnly: boolean;
}

export const EMPTY_INBOX_FILTER: InboxFilter = {
  assignee: 'Any',
  q: '',
  stages: [],
  unreadOnly: false,
};

/**
 * The wire shape.
 *
 * `textInputFilter` is null rather than `''` when the box is empty. The SDL
 * types it nullable and an empty string is a value, not an absence — sending
 * one asks the server to match every contact against nothing, and whether that
 * means "everything" or "nothing" is its business, not something to find out in
 * production. Trimmed for the same reason a trailing space should not be a
 * different question.
 */
export function toChatListFilter(filter: InboxFilter): ChatListFilter {
  const q = filter.q.trim();
  return {
    assigneeFilter: toAssigneeFilter(filter.assignee),
    unreadOnly: filter.unreadOnly,
    salesStageV2Filter: [...filter.stages],
    textInputFilter: q === '' ? null : q,
  };
}

/** Nothing is narrowed — whether to offer a "clear" control. */
export function isInboxFilterEmpty(filter: InboxFilter): boolean {
  return filter.assignee === 'Any' && filter.q.trim() === '' && filter.stages.length === 0 && !filter.unreadOnly;
}

/** How many distinct things the reader has narrowed by — the badge on the filter button. */
export function activeFilterCount(filter: InboxFilter): number {
  let count = 0;
  if (filter.assignee !== 'Any') count += 1;
  if (filter.q.trim() !== '') count += 1;
  if (filter.stages.length > 0) count += 1;
  if (filter.unreadOnly) count += 1;
  return count;
}

/** Value equality, so a no-op edit can be recognised as one. */
export function sameInboxFilter(a: InboxFilter, b: InboxFilter): boolean {
  return (
    a.assignee === b.assignee &&
    a.q === b.q &&
    a.unreadOnly === b.unreadOnly &&
    a.stages.length === b.stages.length &&
    a.stages.every((stage, index) => stage === b.stages[index])
  );
}

/* ── transitions ──────────────────────────────────────────────────────────
 * All of them go through `next`, which is what enforces the identity rule in
 * one place instead of in six. A caller cannot forget it, because a caller
 * never writes the object literal itself.
 */

function next(filter: InboxFilter, patch: Partial<InboxFilter>): InboxFilter {
  const candidate = { ...filter, ...patch };
  return sameInboxFilter(filter, candidate) ? filter : candidate;
}

export function withAssignee(filter: InboxFilter, assignee: AssigneeKey): InboxFilter {
  return next(filter, { assignee });
}

export function withQuery(filter: InboxFilter, q: string): InboxFilter {
  return next(filter, { q });
}

export function withUnreadOnly(filter: InboxFilter, unreadOnly: boolean): InboxFilter {
  return next(filter, { unreadOnly });
}

/**
 * Add or remove one stage, in canonical order.
 *
 * The empty list renders as all six ticked, so unticking one has to mean "all
 * but this one". Toggling the empty list directly would instead narrow to the
 * single stage the reader just rejected — the exact opposite of the gesture.
 * Selecting all six collapses back to empty, so "everything" has one spelling
 * on the wire rather than two.
 */
export function toggleStage(filter: InboxFilter, stage: SalesStageV2): InboxFilter {
  const base = filter.stages.length === 0 ? STAGES : filter.stages;
  const wanted = new Set(base);
  if (wanted.has(stage)) wanted.delete(stage);
  else wanted.add(stage);
  const stages = STAGES.filter((entry) => wanted.has(entry));
  return next(filter, { stages: stages.length === STAGES.length ? [] : stages });
}

export function withAllStages(filter: InboxFilter): InboxFilter {
  return next(filter, { stages: [] });
}

/** Back to the unfiltered inbox, preserving identity when it already is. */
export function clearInboxFilter(filter: InboxFilter): InboxFilter {
  return isInboxFilterEmpty(filter) ? filter : EMPTY_INBOX_FILTER;
}

/**
 * A one-line description of what is being shown, for the empty state.
 *
 * An inbox that says only "No conversations" when a filter is on reads as a
 * broken inbox. Naming the filter is the difference between "your product is
 * empty" and "you asked a narrow question".
 */
export function describeInboxFilter(filter: InboxFilter, teamName?: (id: string) => string): string {
  const parts: string[] = [];
  const userId = assigneeUserId(filter.assignee);
  if (userId) parts.push(teamName?.(userId) ?? 'one teammate');
  else if (filter.assignee !== 'Any') {
    parts.push(ASSIGNEE_PRESET_LABELS[filter.assignee as (typeof ASSIGNEE_PRESETS)[number]]);
  }
  if (filter.stages.length > 0) {
    parts.push(filter.stages.map((stage) => STAGE_LABELS[stage]).join(', '));
  }
  if (filter.unreadOnly) parts.push('unread only');
  if (filter.q.trim() !== '') parts.push(`“${filter.q.trim()}”`);
  return parts.join(' · ');
}

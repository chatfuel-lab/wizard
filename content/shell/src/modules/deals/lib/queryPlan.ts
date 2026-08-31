/**
 * The table's routing decision, as one pure function.
 *
 * One filter model goes in; `{ engine, vars, clientFilters, caveats, live }`
 * comes out. Everything the view does downstream — which document to send,
 * which subscription to open, what to filter after the fact, what to warn
 * about — is read off that object, so the honesty of this view is a unit test
 * rather than a comment.
 *
 * ## Why there are two engines at all
 *
 * `contactChatsConnection` (engine B) takes a *list* of stages and searches
 * server-side over name and phone, and `contactsChatUpdates` keeps it live. It
 * is the default and it is strictly better — but it has no `orderBy` and no
 * attribute predicates.
 *
 * `contactsConnection` + `SegmentInput` (engine C) has both, and pays for them:
 * `SegmentInput` cannot reach `salesStageV2`, so the result is contacts rather
 * than deals; there is no subscription for that shape, so the list goes stale;
 * custom attributes always report `dataType: string`, so `orderBy` is text
 * order; and a range predicate ORs the typed interpretations of its value.
 *
 * Four costs, four caveat strings, each emitted **only when it is true**. Every
 * one of them is asserted in `queryPlan.test.ts` — that is what stops the bar
 * from drifting into either lies or boilerplate.
 *
 * ## The one caveat this file will not write
 *
 * Whether `contactChatsConnection` returns a deal that never had a conversation
 * is not stated in the SDL. So it is not asserted: `countGapCaveat` *measures*
 * it, by comparing the chat count against the sum of `DealsTotals` over the
 * stages in play, and says nothing unless the two are comparable and actually
 * differ. `totalsComparable` is that gate — `DealsByStagesFilter` carries only
 * an assignee filter, so a text search or an unread filter makes the two
 * numbers describe different sets and the gap unattributable.
 */
import {
  type ContactAssigneeFilter,
  type ContactChatsCountFilter,
  type ContactSearchOrderByInput,
  type Platform,
  type SalesStageV2,
  type SegmentInput,
} from '~api/generated/deals/graphql';
import { needsAttributeEngine, usablePredicates, type DealsFilter, toAssigneeFilter } from './dealsFilter';
import { buildSegment, isRangeOperator, sortFloorPredicate } from './dealsSegment';
import { ALL_PLATFORMS } from './platforms';
import { STAGES } from './stages';

export type TableEngine = 'chats' | 'segment';

/**
 * Engine B's variables — the connection's and the subscription's, minus paging,
 * in one object. `DealsTableUpdates` takes exactly these, which is what makes
 * "the subscription's arguments must match the connection's" structural rather
 * than a rule someone has to remember.
 */
export interface ChatsVars {
  assigneeFilter: ContactAssigneeFilter;
  unreadOnly: boolean;
  stages: SalesStageV2[];
  textInputFilter: string | null;
  fieldNames: string[];
}

/** Engine C's variables, minus paging. There is no subscription to lock to. */
export interface SegmentVars {
  platforms: Platform[];
  segment: SegmentInput | null;
  orderBy: ContactSearchOrderByInput | null;
  fieldNames: string[];
}

/**
 * What the server could not express and the view has to apply to the rows that
 * happened to load. Always empty under engine B — that is the point of it
 * being the default.
 */
export interface ClientFilters {
  /** Empty means no client-side stage narrowing. */
  stages: SalesStageV2[];
  unreadOnly: boolean;
  /** Lower-cased and trimmed; `''` means no client-side text match. */
  q: string;
}

export const NO_CLIENT_FILTERS: ClientFilters = { stages: [], unreadOnly: false, q: '' };

export type CaveatId = 'contacts' | 'sortFloor' | 'clientSide' | 'stale' | 'textSort' | 'range' | 'gap';

export interface Caveat {
  id: CaveatId;
  text: string;
}

interface PlanShared {
  clientFilters: ClientFilters;
  caveats: Caveat[];
  /**
   * Whether `DealsTableCount` and the `DealsTotals` sum describe the same set,
   * and a difference between them can therefore be attributed to anything.
   */
  totalsComparable: boolean;
}

export interface ChatsPlan extends PlanShared {
  engine: 'chats';
  vars: ChatsVars;
  live: true;
}

export interface SegmentPlan extends PlanShared {
  engine: 'segment';
  vars: SegmentVars;
  live: false;
  totalsComparable: false;
}

export type QueryPlan = ChatsPlan | SegmentPlan;

export interface PlanInput {
  filter: DealsFilter;
  /** The deal-field attribute names to select; from `useDealFields`. */
  fieldNames: string[];
}

const CONTACTS_TEXT =
  'Attribute filters cannot reach the sales stage, so this list is contacts rather than deals — a contact that has never been a deal can appear in it.';

const STALE_TEXT =
  'Live updates are off in this mode: no subscription exists for an attribute search. Use Refresh to pick up changes.';

/** `['stage', 'search']` → `'stage and search'`. */
function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** The count filter and the connection are built from the same object — by construction. */
export function countFilterOf(vars: ChatsVars): ContactChatsCountFilter {
  return {
    assigneeFilter: vars.assigneeFilter,
    unreadOnly: vars.unreadOnly,
    salesStageV2Filter: vars.stages,
    textInputFilter: vars.textInputFilter,
  };
}

export function planQuery({ filter, fieldNames }: PlanInput): QueryPlan {
  const predicates = usablePredicates(filter);
  const sort = filter.sort;
  const q = filter.q.trim();
  /* An empty stage selection means all six. That IS the engine-B unlock:
   * `salesStageV2Filter` is a list here, so one query isolates deals across
   * every stage instead of the board's six. */
  const stages = filter.stages.length === 0 ? [...STAGES] : [...filter.stages];

  if (!needsAttributeEngine(filter)) {
    return {
      engine: 'chats',
      vars: {
        assigneeFilter: toAssigneeFilter(filter.assignee),
        unreadOnly: filter.unreadOnly,
        stages,
        textInputFilter: q === '' ? null : q,
        fieldNames,
      },
      clientFilters: NO_CLIENT_FILTERS,
      caveats: [],
      live: true,
      totalsComparable: q === '' && !filter.unreadOnly,
    };
  }

  const caveats: Caveat[] = [{ id: 'contacts', text: CONTACTS_TEXT }];

  /* A sort with nothing to narrow the set would order every contact on the bot
   * by an attribute most of them do not have, and blanks sort first. Flooring
   * it with IS_NOT_EMPTY is the difference between a useful sort and a page of
   * dashes — and it is stated rather than done quietly. */
  const sent = predicates.length === 0 && sort !== null ? [sortFloorPredicate(sort.attribute)] : predicates;
  if (predicates.length === 0 && sort !== null) {
    caveats.push({
      id: 'sortFloor',
      text: `Only contacts that have “${sort.attribute}” are listed: sorting with no filter would return every contact, most with nothing to sort by.`,
    });
  }

  const clientSide = [
    filter.stages.length > 0 ? 'stage' : '',
    q !== '' ? 'search' : '',
    filter.unreadOnly ? 'unread' : '',
  ].filter((word) => word !== '');
  if (clientSide.length > 0) {
    caveats.push({
      id: 'clientSide',
      text: `Applied to loaded rows only: ${joinWords(clientSide)}. The total counts every contact the attribute filter matches, so it will read higher than the list.`,
    });
  }

  caveats.push({ id: 'stale', text: STALE_TEXT });

  if (sort !== null) {
    caveats.push({
      id: 'textSort',
      text: `Sorting by “${sort.attribute}” is text order — custom attributes are stored as text, so “9” comes after “1000”.`,
    });
  }

  const ranged = sent.filter((predicate) => isRangeOperator(predicate.operator));
  if (ranged.length > 0) {
    const names = joinWords([...new Set(ranged.map((predicate) => `“${predicate.name.trim()}”`))]);
    caveats.push({
      id: 'range',
      text: `Range filters on ${names} are approximate: the server compares the value as text, whole number, decimal and date at once, and keeps the row if any of those matches.`,
    });
  }

  return {
    engine: 'segment',
    vars: {
      platforms: [...ALL_PLATFORMS],
      segment: buildSegment(sent),
      orderBy: sort === null ? null : { orderBy: sort.attribute, direction: sort.direction },
      fieldNames,
    },
    clientFilters: {
      stages: [...filter.stages],
      unreadOnly: filter.unreadOnly,
      q: q.toLowerCase(),
    },
    caveats,
    live: false,
    totalsComparable: false,
  };
}

/** The shape `applyClientFilters` needs — every contact typename satisfies it. */
export interface FilterableRow {
  name: string;
  salesStageV2?: SalesStageV2 | null;
  unreadMessagesCount: number;
  phone?: string;
}

/**
 * The narrowing the server could not do. Under engine B this is the identity
 * function, and the early return keeps the array's identity with it.
 */
export function applyClientFilters<T extends FilterableRow>(rows: T[], filters: ClientFilters): T[] {
  const { stages, unreadOnly, q } = filters;
  if (stages.length === 0 && !unreadOnly && q === '') return rows;
  const wanted = new Set<string>(stages);
  return rows.filter((row) => {
    if (wanted.size > 0 && !(row.salesStageV2 && wanted.has(row.salesStageV2))) return false;
    if (unreadOnly && row.unreadMessagesCount <= 0) return false;
    if (q !== '') {
      const haystack = `${row.name} ${row.phone ?? ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** `DealsTotals` summed over the stages in play — all six when none are chosen. */
export function stageTotal(
  totals: Record<SalesStageV2, number> | null,
  stages: readonly SalesStageV2[],
): number | null {
  if (totals === null) return null;
  const wanted = stages.length === 0 ? STAGES : stages;
  return wanted.reduce((sum, stage) => sum + (totals[stage] ?? 0), 0);
}

/**
 * The measured version of "deals with no conversation".
 *
 * Nothing is asserted unless all three hold: the route is engine B, the two
 * numbers describe the same set (`totalsComparable`), and the chat count is
 * actually the smaller one. A chat count *above* the totals sum is not a
 * finding either — it means the two queries disagree in the other direction,
 * and inventing prose for that would be exactly the guess this replaces.
 */
export function countGapCaveat(plan: QueryPlan, chatCount: number | null, total: number | null): Caveat | null {
  if (!plan.totalsComparable) return null;
  if (chatCount === null || total === null) return null;
  if (chatCount >= total) return null;
  const missing = total - chatCount;
  return {
    id: 'gap',
    text: `Showing ${chatCount} of ${total} deals; ${missing} ${missing === 1 ? 'has' : 'have'} no conversation.`,
  };
}

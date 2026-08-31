/**
 * The contacts list's routing decision, as one pure function.
 *
 * One filter model goes in; `{engine, vars, clientFilters, caveats, live}`
 * comes out, and everything downstream — which document to send, whether to
 * open a subscription, what to narrow after the fact, what to warn about — is
 * read off that object. The honesty of the list is therefore a unit test
 * rather than a promise.
 *
 * ## Why the default engine is NOT the live one
 *
 * `contactChatsConnection` is live, searches server-side over name and phone,
 * and filters by assignee / unread / stage. `contactsConnection` does none of
 * that. Deals defaults to the chat engine for exactly that reason.
 *
 * Contacts must not. The
 * chat engine lists only contacts that HAVE a conversation. A contact created
 * by `whatsappContactCreateV2` — the API's only create, and what a CSV import
 * produces — comes back with `conversation: null` and is invisible there:
 * `contactsCount` and `contactChatsCountV2` diverge by exactly the contacts
 * that have never messaged — present in the segment engine's list and search,
 * absent from the chat engine's.
 *
 * A contacts list that hides a third of the address book is wrong in a way no
 * caveat can repair, so the segment engine is the floor and the chat engine is
 * an opt-in the user reaches by asking for something only it can answer.
 */
import type {
  ContactAssigneeFilter,
  ContactSearchOrderByInput,
  Platform,
  SalesStageV2,
  SegmentInput,
} from '~api/generated/contacts/graphql';
import {
  ALL_PLATFORMS,
  isPlatformSubset,
  isRangeOperator,
  toAssigneeFilter,
  usableGroups,
  usesChatOnlyFilters,
  usesSegmentOnlyFilters,
  type AssigneeFilterKey,
  type ContactsFilter,
} from './contactsFilter';
import { buildSegment } from './contactsSegment';

export type ContactsEngine = 'segment' | 'chats';

/** Engine "segment" — `contactsConnection`. No subscription exists for it. */
export interface SegmentVars {
  platforms: Platform[];
  segment: SegmentInput | null;
  orderBy: ContactSearchOrderByInput | null;
  attrNames: string[];
}

/**
 * Engine "chats" — the connection's arguments and the subscription's, minus
 * paging, in ONE object. `ContactsChatUpdates` takes exactly these, which is
 * what makes "the subscription must match the query" structural instead of a
 * rule someone has to remember.
 */
export interface ChatsVars {
  assigneeFilter: ContactAssigneeFilter;
  unreadOnly: boolean;
  stages: SalesStageV2[];
  textInputFilter: string | null;
  attrNames: string[];
}

/**
 * What the server could not express and the view has to apply to the rows that
 * happened to load. Always empty under the engine that owns the filter.
 */
export interface ClientFilters {
  platforms: Platform[];
  stages: SalesStageV2[];
  unreadOnly: boolean;
  assignee: AssigneeFilterKey;
  /** Lower-cased and trimmed; '' means no client-side text match. */
  text: string;
  since: string | null;
  until: string | null;
}

export interface Caveat {
  id: string;
  text: string;
}

export interface QueryPlan {
  engine: ContactsEngine;
  segmentVars: SegmentVars | null;
  chatsVars: ChatsVars | null;
  clientFilters: ClientFilters;
  caveats: Caveat[];
  /** True only when a subscription exists for these exact vars. */
  live: boolean;
}

const NO_CLIENT_FILTERS: ClientFilters = {
  platforms: [],
  stages: [],
  unreadOnly: false,
  assignee: 'Any',
  text: '',
  since: null,
  until: null,
};

export const hasClientFilters = (filters: ClientFilters): boolean =>
  filters.platforms.length > 0 ||
  filters.stages.length > 0 ||
  filters.unreadOnly ||
  filters.assignee !== 'Any' ||
  filters.text !== '' ||
  filters.since !== null ||
  filters.until !== null;

/**
 * Sorting by a custom attribute is text order, always: every custom attribute
 * reports `dataType: string` (SDL, and confirmed by the live catalog — all 15
 * custom attributes are strings), so "1000" sorts before "9".
 */
function sortCaveat(filter: ContactsFilter, dataTypeOf: (name: string) => string | undefined): Caveat | null {
  if (!filter.sort) return null;
  const dataType = dataTypeOf(filter.sort.name);
  if (dataType === 'long' || dataType === 'double' || dataType === 'datetime') return null;
  return {
    id: 'text-sort',
    text: `Sorted by “${filter.sort.name}” as text — the API stores custom fields as strings, so 1000 sorts before 9.`,
  };
}

export interface PlanInput {
  filter: ContactsFilter;
  /** Attribute names the visible columns need. */
  attrNames: string[];
  /** Catalog lookup, for the honesty of the sort caveat. */
  dataTypeOf?: (name: string) => string | undefined;
}

export function planQuery({ filter, attrNames, dataTypeOf = () => undefined }: PlanInput): QueryPlan {
  const caveats: Caveat[] = [];
  const chatOnly = usesChatOnlyFilters(filter);
  const segmentOnly = usesSegmentOnlyFilters(filter);

  /* The chat engine is reached only when the user asked for something only it
     can answer AND asked for nothing the segment engine owns. Anything else —
     including the empty filter — stays on the engine that can see every
     contact. */
  const engine: ContactsEngine = chatOnly && !segmentOnly ? 'chats' : 'segment';

  if (engine === 'chats') {
    const clientFilters: ClientFilters = {
      ...NO_CLIENT_FILTERS,
      platforms: isPlatformSubset(filter) ? [...filter.platforms] : [],
    };

    caveats.push({
      id: 'no-conversation',
      text: 'Filtering by conversation state shows only contacts that have a conversation — a contact added by import or by hand appears here once it has chatted.',
    });
    if (clientFilters.platforms.length > 0) {
      caveats.push({
        id: 'platform-client',
        text: 'The channel filter is applied to the rows already loaded — this engine takes no channel argument.',
      });
    }
    if (filter.sort) {
      caveats.push({
        id: 'no-sort',
        text: 'Sorting is off while a conversation filter is on: this engine has no sort, and its order is “last message first”.',
      });
    }

    return {
      engine,
      segmentVars: null,
      chatsVars: {
        assigneeFilter: toAssigneeFilter(filter.assignee),
        unreadOnly: filter.unreadOnly,
        stages: [...filter.stages],
        textInputFilter: filter.q.trim() === '' ? null : filter.q.trim(),
        attrNames,
      },
      clientFilters,
      caveats,
      live: true,
    };
  }

  const clientFilters: ClientFilters = {
    platforms: [],
    stages: [...filter.stages],
    unreadOnly: filter.unreadOnly,
    assignee: filter.assignee,
    text: filter.q.trim().toLowerCase(),
    since: filter.since,
    until: filter.until,
  };

  caveats.push({
    id: 'snapshot',
    text: 'This list is a snapshot — the API has no live feed for a filtered list. Refresh to pull changes.',
  });
  if (hasClientFilters(clientFilters)) {
    caveats.push({
      id: 'client-narrowing',
      text: 'Conversation filters (search, stage, owner, unread, last message) are applied to the rows loaded so far — load more to widen the match.',
    });
  }
  if (usableGroups(filter).some((group) => group.predicates.some((p) => isRangeOperator(p.operator)))) {
    caveats.push({
      id: 'approximate-range',
      text: 'A greater/less comparison is approximate: the server compares the value as text, number and date at once and keeps the row if any of them matches.',
    });
  }
  const sorted = sortCaveat(filter, dataTypeOf);
  if (sorted) caveats.push(sorted);

  return {
    engine,
    segmentVars: {
      platforms: filter.platforms.length > 0 ? [...filter.platforms] : [...ALL_PLATFORMS],
      segment: buildSegment(filter),
      orderBy: filter.sort ? { orderBy: filter.sort.name, direction: filter.sort.direction } : null,
      attrNames,
    },
    chatsVars: null,
    clientFilters,
    caveats,
    live: false,
  };
}

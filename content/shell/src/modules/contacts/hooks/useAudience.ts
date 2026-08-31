import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ContactAssigneeFilterType,
  ContactsChatsCountDocument,
  ContactsCountDocument,
  ContactsStageTotalsDocument,
  Platform,
  SalesStageV2,
  type ContactAssigneeFilter,
} from '~api/generated/contacts/graphql';
import { useContacts } from '../ContactsContext';
import { ALL_PLATFORMS } from '../lib/platforms';
import type { AudienceTotals, ConversationCounts } from '../lib/audience';
import type { TeamMember } from '../types';

/**
 * One section of the Audience page: a value or the reason there isn't one.
 *
 * Sections fail INDEPENDENTLY, which is the whole reason this shape exists.
 * The page is eleven-plus separate counting calls, and a single `Promise.all`
 * would let one failing stage query blank the channel bars, the conversation
 * tiles and the headline totals at once. `Promise.allSettled` per group means
 * a broken corner says so in its own card and every other number stays on
 * screen — which is also the honest reading, since they were never one query.
 */
export interface AudienceSection<T> {
  value: T | null;
  error: string | null;
}

export interface AudienceOwner {
  userId: string;
  name: string;
  count: number;
}

export interface AudienceState {
  /** True only on a load that has nothing to show yet. */
  loading: boolean;
  /** True while a refresh replaces numbers that are already on screen. */
  refreshing: boolean;
  /** When the numbers on screen were counted, epoch ms. */
  fetchedAt: number | null;
  totals: AudienceSection<AudienceTotals>;
  channels: AudienceSection<Map<Platform, number>>;
  stages: AudienceSection<Record<SalesStageV2, number>>;
  conversations: AudienceSection<ConversationCounts>;
  owners: AudienceSection<AudienceOwner[]>;
  /** Team members left uncounted by the cap below. */
  ownersTruncated: number;
  refresh: () => void;
}

/**
 * How many team members get their own count.
 *
 * There is no group-by anywhere in this API — `contactChatsCountV2` answers
 * for ONE assignee filter — so an owner breakdown is literally one request per
 * person. Twelve is the point where a bot's inbox breakdown is still a useful
 * ranking rather than a request storm, and the card says how many it left out
 * rather than pretending the list is complete.
 */
const OWNER_LIMIT = 12;

const anyAssignee: ContactAssigneeFilter = { type: ContactAssigneeFilterType.Any };

const EMPTY = <T>(): AudienceSection<T> => ({ value: null, error: null });

const message = (err: unknown, fallback: string): string => (err instanceof Error ? err.message : fallback);

/**
 * The six selected fields as a record keyed by the enum — written out rather
 * than cast, so a stage added to `SalesStageV2` is a type error here instead of
 * a silently missing bar.
 */
function toStageRecord(totals: {
  New: number;
  Sorting: number;
  Ready: number;
  WorkingOn: number;
  Won: number;
  Lost: number;
}): Record<SalesStageV2, number> {
  return {
    [SalesStageV2.New]: totals.New,
    [SalesStageV2.Sorting]: totals.Sorting,
    [SalesStageV2.Ready]: totals.Ready,
    [SalesStageV2.WorkingOn]: totals.WorkingOn,
    [SalesStageV2.Won]: totals.Won,
    [SalesStageV2.Lost]: totals.Lost,
  };
}

/**
 * Every server-truth count the Audience page shows, in one hook.
 *
 * Nothing here subscribes: the API has no live feed for any of these numbers,
 * so "as of" plus an explicit refresh is the honest contract. `refreshToken`
 * is the workspace's Refresh button; the hook also exposes its own `refresh`
 * for the retry buttons inside failed cards.
 */
export function useAudience(team: readonly TeamMember[], refreshToken: number): AudienceState {
  const { client, botId } = useContacts();

  const [state, setState] = useState<Omit<AudienceState, 'refresh'>>({
    loading: true,
    refreshing: false,
    fetchedAt: null,
    totals: EMPTY<AudienceTotals>(),
    channels: EMPTY<Map<Platform, number>>(),
    stages: EMPTY<Record<SalesStageV2, number>>(),
    conversations: EMPTY<ConversationCounts>(),
    owners: EMPTY<AudienceOwner[]>(),
    ownersTruncated: 0,
  });
  const [token, setToken] = useState(0);
  const refresh = useCallback(() => setToken((n) => n + 1), []);

  /* The owner list is flattened to ids and names here so the effect below
     depends on a string, not on an array identity the team hook rebuilds. */
  const owners = useMemo(
    () => team.slice(0, OWNER_LIMIT).map((member) => ({ userId: member.user.id, name: member.user.name })),
    [team],
  );
  const ownersTruncated = Math.max(0, team.length - owners.length);
  const ownerKey = owners.map((owner) => owner.userId).join(',');

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({
      ...current,
      loading: current.fetchedAt === null,
      refreshing: current.fetchedAt !== null,
    }));

    const chatCount = (filter: ContactAssigneeFilter, unreadOnly = false) =>
      client.query(ContactsChatsCountDocument, {
        botID: botId,
        filter: { assigneeFilter: filter, salesStageV2Filter: [], unreadOnly },
      });

    void (async () => {
      const [totals, channels, stages, conversations, ownerCounts] = await Promise.allSettled([
        /* One call answers both headline tiles: contactsCount is scoped to the
           caller's assignee restrictions, contactsTotalCount is not. */
        client.query(ContactsCountDocument, { botID: botId, platforms: [...ALL_PLATFORMS], segment: null }),
        Promise.all(
          ALL_PLATFORMS.map((platform) =>
            client
              .query(ContactsCountDocument, { botID: botId, platforms: [platform], segment: null })
              .then((data) => [platform, data.bot.contactsCount] as const),
          ),
        ),
        client.query(ContactsStageTotalsDocument, { botID: botId, filter: { assigneeFilter: anyAssignee } }),
        Promise.all([
          chatCount(anyAssignee),
          chatCount(anyAssignee, true),
          chatCount({ type: ContactAssigneeFilterType.Unassigned }),
          chatCount({ type: ContactAssigneeFilterType.FuelyAi }),
        ]),
        Promise.all(
          owners.map((owner) =>
            chatCount({ type: ContactAssigneeFilterType.AssigneeId, assigneeID: owner.userId }).then((data) => ({
              ...owner,
              count: data.bot.contactChatsCountV2,
            })),
          ),
        ),
      ]);
      if (cancelled) return;

      setState({
        loading: false,
        refreshing: false,
        fetchedAt: Date.now(),
        totals:
          totals.status === 'fulfilled'
            ? {
                value: { visible: totals.value.bot.contactsCount, total: totals.value.bot.contactsTotalCount },
                error: null,
              }
            : { value: null, error: message(totals.reason, 'Could not count the contacts') },
        channels:
          channels.status === 'fulfilled'
            ? { value: new Map(channels.value), error: null }
            : { value: null, error: message(channels.reason, 'Could not count the channels') },
        stages:
          stages.status === 'fulfilled'
            ? { value: toStageRecord(stages.value.bot.contactDealsByStages), error: null }
            : { value: null, error: message(stages.reason, 'Could not count the stages') },
        conversations:
          conversations.status === 'fulfilled'
            ? {
                value: {
                  total: conversations.value[0].bot.contactChatsCountV2,
                  unread: conversations.value[1].bot.contactChatsCountV2,
                  unassigned: conversations.value[2].bot.contactChatsCountV2,
                  ai: conversations.value[3].bot.contactChatsCountV2,
                },
                error: null,
              }
            : { value: null, error: message(conversations.reason, 'Could not count the conversations') },
        owners:
          ownerCounts.status === 'fulfilled'
            ? { value: ownerCounts.value, error: null }
            : { value: null, error: message(ownerCounts.reason, 'Could not count per owner') },
        ownersTruncated,
      });
    })();

    return () => {
      cancelled = true;
    };
    /* `owners` is rebuilt whenever the team array is, so the effect keys on the
       ids it actually sends rather than on the array's identity. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, botId, ownerKey, ownersTruncated, token, refreshToken]);

  return { ...state, refresh };
}

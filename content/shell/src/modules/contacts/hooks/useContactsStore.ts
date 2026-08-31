import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { isInvalidCursorError } from '~api';
import {
  ContactsChatsCountDocument,
  ContactsChatsDocument,
  ContactsChatUpdatesDocument,
  ContactsCountDocument,
  ContactsRowsDocument,
} from '~api/generated/contacts/graphql';
import { useContacts } from '../ContactsContext';
import type { ContactRow } from '../types';
import { ALL_PLATFORMS } from '../lib/platforms';
import type { QueryPlan } from '../lib/queryPlan';
import {
  PAGE_SIZE,
  canAutoPage,
  contactsReducer,
  initialState,
  needsManualPage,
  selectCounts,
  selectRows,
  selectSelectedRows,
  type ContactsState,
} from '../lib/contactsStore';

export interface ContactsData {
  state: ContactsState;
  rows: ContactRow[];
  selected: ContactRow[];
  counts: ReturnType<typeof selectCounts>;
  canAutoPage: boolean;
  needsManualPage: boolean;
  loadMore: () => void;
  refetch: () => void;
  /** Optimistic edit lifecycle, shared by the table cells and the record page. */
  editStarted: (id: string, patch: Partial<ContactRow>) => void;
  editSucceeded: (id: string, row: ContactRow | null) => void;
  editFailed: (id: string) => void;
  patchRow: (row: ContactRow) => void;
  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
}

/**
 * Both engines behind one API.
 *
 * The plan decides everything: which document is sent, which count is asked
 * for, and whether a subscription is opened at all. The effect that loads is
 * keyed on `state.epoch`, and `reset`/`refetch` are the only things that bump
 * it — so "the epoch bump IS the request", and no caller ever calls a fetch
 * function directly.
 */
export function useContactsStore(plan: QueryPlan, refreshToken: number): ContactsData {
  const { client, botId } = useContacts();
  const [state, dispatch] = useReducer(contactsReducer, plan, initialState);

  /* The plan is compared by value: a re-render that produces an equal plan
     must not reset the list (that is the bug that lost selection and scroll in
     deals — a filter object rebuilt on every keystroke). */
  const planKey = JSON.stringify({
    engine: plan.engine,
    segmentVars: plan.segmentVars,
    chatsVars: plan.chatsVars,
  });
  const planRef = useRef(plan);
  planRef.current = plan;

  useEffect(() => {
    dispatch({ type: 'reset', plan: planRef.current });
  }, [planKey]);

  useEffect(() => {
    if (refreshToken === 0) return;
    dispatch({ type: 'refetch' });
  }, [refreshToken]);

  const epoch = state.epoch;
  const cursorRef = useRef<string | null>(null);

  /* Page 1 + the counts, together, on every epoch. */
  useEffect(() => {
    let cancelled = false;
    const current = planRef.current;
    cursorRef.current = null;

    const loadPage = async (after: string | null, append: boolean) => {
      if (current.engine === 'segment' && current.segmentVars) {
        const data = await client.query(ContactsRowsDocument, {
          botID: botId,
          platforms: current.segmentVars.platforms.length > 0 ? current.segmentVars.platforms : [...ALL_PLATFORMS],
          first: PAGE_SIZE,
          after,
          before: null,
          segment: current.segmentVars.segment,
          orderBy: current.segmentVars.orderBy,
          attrNames: current.segmentVars.attrNames,
        });
        const connection = data.bot.contactsConnection;
        return {
          rows: connection.edges.map((edge) => edge.node),
          cursors: connection.edges.map((edge) => edge.cursor),
          hasNext: connection.pageInfo.hasNextPage,
          endCursor: connection.pageInfo.endCursor ?? null,
          append,
        };
      }
      const vars = current.chatsVars!;
      const data = await client.query(ContactsChatsDocument, {
        botID: botId,
        first: PAGE_SIZE,
        after,
        assigneeFilter: vars.assigneeFilter,
        unreadOnly: vars.unreadOnly,
        stages: vars.stages,
        textInputFilter: vars.textInputFilter,
        attrNames: vars.attrNames,
      });
      const connection = data.bot.contactChatsConnection;
      return {
        rows: connection.edges.map((edge) => edge.node),
        cursors: connection.edges.map((edge) => edge.cursor),
        hasNext: connection.pageInfo.hasNextPage,
        endCursor: connection.pageInfo.endCursor ?? null,
        append,
      };
    };

    const loadCounts = async () => {
      if (current.engine === 'segment' && current.segmentVars) {
        const data = await client.query(ContactsCountDocument, {
          botID: botId,
          platforms: current.segmentVars.platforms.length > 0 ? current.segmentVars.platforms : [...ALL_PLATFORMS],
          segment: current.segmentVars.segment,
        });
        return { visible: data.bot.contactsCount, total: data.bot.contactsTotalCount };
      }
      const vars = current.chatsVars!;
      const data = await client.query(ContactsChatsCountDocument, {
        botID: botId,
        filter: {
          assigneeFilter: vars.assigneeFilter,
          unreadOnly: vars.unreadOnly,
          salesStageV2Filter: vars.stages,
          textInputFilter: vars.textInputFilter,
        },
      });
      return { visible: data.bot.contactChatsCountV2, total: null };
    };

    void (async () => {
      try {
        const page = await loadPage(null, false);
        if (cancelled) return;
        cursorRef.current = page.endCursor;
        dispatch({ type: 'pageLoaded', epoch, append: false, result: page });
      } catch (err) {
        if (cancelled) return;
        dispatch({
          type: 'pageFailed',
          epoch,
          message: err instanceof Error ? err.message : 'Could not load contacts',
        });
        return;
      }
      try {
        const counts = await loadCounts();
        if (!cancelled) dispatch({ type: 'countsLoaded', epoch, ...counts });
      } catch {
        /* Counts are decoration; the list is the product. */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, botId, epoch]);

  const loadMore = useCallback(() => {
    const current = planRef.current;
    const after = cursorRef.current;
    if (after === null) return;
    dispatch({ type: 'pageStarted', epoch });

    void (async () => {
      try {
        const data =
          current.engine === 'segment' && current.segmentVars
            ? await client
                .query(ContactsRowsDocument, {
                  botID: botId,
                  platforms:
                    current.segmentVars.platforms.length > 0 ? current.segmentVars.platforms : [...ALL_PLATFORMS],
                  first: PAGE_SIZE,
                  after,
                  before: null,
                  segment: current.segmentVars.segment,
                  orderBy: current.segmentVars.orderBy,
                  attrNames: current.segmentVars.attrNames,
                })
                .then((result) => result.bot.contactsConnection)
            : await client
                .query(ContactsChatsDocument, {
                  botID: botId,
                  first: PAGE_SIZE,
                  after,
                  assigneeFilter: current.chatsVars!.assigneeFilter,
                  unreadOnly: current.chatsVars!.unreadOnly,
                  stages: current.chatsVars!.stages,
                  textInputFilter: current.chatsVars!.textInputFilter,
                  attrNames: current.chatsVars!.attrNames,
                })
                .then((result) => result.bot.contactChatsConnection);

        cursorRef.current = data.pageInfo.endCursor ?? null;
        dispatch({
          type: 'pageLoaded',
          epoch,
          append: true,
          result: {
            rows: data.edges.map((edge) => edge.node),
            cursors: data.edges.map((edge) => edge.cursor),
            hasNext: data.pageInfo.hasNextPage,
            endCursor: data.pageInfo.endCursor ?? null,
          },
        });
      } catch (err) {
        /* A cursor the server no longer accepts is not an error the user can
           act on — start the list again rather than showing a dead end. */
        if (isInvalidCursorError(err)) {
          dispatch({ type: 'refetch' });
          return;
        }
        dispatch({
          type: 'pageFailed',
          epoch,
          message: err instanceof Error ? err.message : 'Could not load more contacts',
        });
      }
    })();
  }, [client, botId, epoch]);

  /* The live channel. Opened on the SAME vars object the query used, so the
     two cannot describe different sets; closed entirely under the engine that
     has no subscription. Deliberately does not depend on the epoch — a
     refetch must not tear the socket down. */
  useEffect(() => {
    if (!plan.live || !plan.chatsVars) return undefined;
    const vars = plan.chatsVars;
    const stop = client.subscribe(
      ContactsChatUpdatesDocument,
      {
        botID: botId,
        assigneeFilter: vars.assigneeFilter,
        unreadOnly: vars.unreadOnly,
        stages: vars.stages,
        textInputFilter: vars.textInputFilter,
        attrNames: vars.attrNames,
      },
      {
        next: (data) => {
          const update = data.contactsChatUpdates;
          if (!update) return;
          if (update.__typename === 'ContactListUpdateStopped') {
            dispatch({ type: 'liveStopped', willResumeAt: update.willResumeAt ?? null });
            return;
          }
          if (update.__typename !== 'ContactsChatUpdatesBatch') return;
          dispatch({
            type: 'liveBatch',
            now: Date.now(),
            updates: update.updates.map((entry) => ({
              action: entry.action,
              id: entry.edge.node.id,
              row: entry.edge.node,
            })),
          });
        },
        error: () => {
          /* A dead socket is not a dead list — the rows on screen stay, and
             the client's own reconnect fires the refetch below. */
        },
      },
    );
    const offReconnect = client.onReconnect(() => dispatch({ type: 'refetch' }));
    return () => {
      stop();
      offReconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- planKey carries the plan by value; an equal-but-fresh plan must not restart the feed
  }, [client, botId, plan.live, planKey]);

  /* The server asked for a pause. Come back when it said to. */
  useEffect(() => {
    if (!state.liveResumeAt) return undefined;
    const wait = Math.max(0, Date.parse(state.liveResumeAt) - Date.now());
    const timer = setTimeout(() => dispatch({ type: 'refetch' }), Number.isNaN(wait) ? 30_000 : wait);
    return () => clearTimeout(timer);
  }, [state.liveResumeAt]);

  const rows = useMemo(() => selectRows(state), [state]);
  const selected = useMemo(() => selectSelectedRows(state), [state]);
  const counts = useMemo(() => selectCounts(state), [state]);

  return {
    state,
    rows,
    selected,
    counts,
    canAutoPage: canAutoPage(state),
    needsManualPage: needsManualPage(state),
    loadMore,
    refetch: useCallback(() => dispatch({ type: 'refetch' }), []),
    editStarted: useCallback((id, patch) => dispatch({ type: 'editStarted', id, patch, now: Date.now() }), []),
    editSucceeded: useCallback((id, row) => dispatch({ type: 'editSucceeded', id, row }), []),
    editFailed: useCallback((id) => dispatch({ type: 'editFailed', id, now: Date.now() }), []),
    patchRow: useCallback((row) => dispatch({ type: 'rowPatched', row }), []),
    setSelection: useCallback((ids) => dispatch({ type: 'selectionSet', ids }), []),
    toggleSelection: useCallback((id) => dispatch({ type: 'selectionToggled', id }), []),
    clearSelection: useCallback(() => dispatch({ type: 'selectionCleared' }), []),
  };
}

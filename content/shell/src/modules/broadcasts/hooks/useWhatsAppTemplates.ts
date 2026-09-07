import { useCallback, useEffect, useRef, useState } from 'react';
import { BroadcastTemplatesDocument, BroadcastTemplatesRefetchDocument } from '~api/generated/broadcasts/graphql';
import { useBroadcasts } from '../BroadcastsContext';
import { errorMessage } from '../lib/errors';
import { walkPages } from '../lib/walkPages';
import type { CatalogTemplate } from '../types';

export interface WhatsAppTemplatesState {
  /** Every template the bot has, unfiltered — `sendableTemplates` decides what a composer offers. */
  templates: CatalogTemplate[];
  /** The list has been read at least once; an empty list is then a real answer. */
  loaded: boolean;
  loading: boolean;
  error: string | null;
  /** Read the catalog again. */
  refresh(): void;
  /**
   * Ask the server to re-read the WhatsApp entities from Meta, then read the
   * catalog again a few seconds later — how a template approved in WhatsApp
   * Manager shows up here without waiting for the server's own schedule.
   */
  refetchFromMeta(): Promise<void>;
}

const PAGE = 100;
/** The server answers the whole list on page one; the cap is the walk's end, not a budget. */
const PAGE_CAP = 10;
/** How long after asking Meta the catalog is re-read. Twice, because the first look can be early. */
const REFETCH_DELAYS_MS = [3_000, 10_000];

/**
 * The bot's WhatsApp templates, read once per mount and kept for the life of
 * the module. A copy of the livechat module's hook over the broadcasts
 * document: the same walk, the same reasons.
 *
 * `enabled` is whether there is a number to read templates for. Until it is
 * true nothing is asked — the template service answers a bare server error
 * for a bot with no WhatsApp number, and an error that means "connect a
 * number" is not one to print.
 */
export function useWhatsAppTemplates(enabled: boolean): WhatsAppTemplatesState {
  const { client, botId } = useBroadcasts();
  const [state, setState] = useState<Omit<WhatsAppTemplatesState, 'refresh' | 'refetchFromMeta'>>({
    templates: [],
    loaded: false,
    loading: false,
    error: null,
  });
  const [request, setRequest] = useState(1);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));
    walkPages<CatalogTemplate>(async (after) => {
      const data = await client.query(BroadcastTemplatesDocument, { botID: botId, first: PAGE, after });
      const page = data.bot.whatsAppTemplates;
      return {
        nodes: (page?.edges ?? []).map((edge) => edge.node),
        next: page?.pageInfo.hasNextPage ? (page.pageInfo.endCursor ?? null) : null,
      };
    }, PAGE_CAP)
      .then((templates) => {
        if (!cancelled) setState({ templates, loaded: true, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState((current) => ({ ...current, loading: false, error: errorMessage(err) }));
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, request, enabled]);

  const refresh = useCallback(() => setRequest((count) => count + 1), []);

  /* The re-reads a Meta check queues, cleared on unmount so nothing lands
     on a hook that is gone. */
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      for (const timer of timersRef.current) clearTimeout(timer);
      timersRef.current = [];
    },
    [],
  );
  const refetchFromMeta = useCallback(async () => {
    await client.mutate(BroadcastTemplatesRefetchDocument, {});
    for (const delay of REFETCH_DELAYS_MS) {
      timersRef.current.push(setTimeout(() => setRequest((count) => count + 1), delay));
    }
  }, [client]);

  return { ...state, refresh, refetchFromMeta };
}

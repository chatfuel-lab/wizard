import { useEffect, useState } from 'react';
import {
  InboxWhatsAppTemplatesDocument,
  type InboxWhatsAppTemplateFragment,
  type InboxWhatsAppTemplatesQuery,
} from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import { messageOf } from '../lib/errors';
import { walkPages } from '../lib/walkPages';

export interface WhatsAppTemplatesState {
  /** Every template the bot has, unfiltered — `sendableTemplates` decides what to offer. */
  templates: InboxWhatsAppTemplateFragment[];
  /** The list has been read at least once; an empty list is then a real answer. */
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

const PAGE = 50;

/**
 * How many pages one walk may read. A bot has tens of templates; WhatsApp's own ceiling
 * is in the hundreds. A thousand is past anything a picker can be used for, so this is
 * not a budget the product spends — it is the end the walk needs so that a backend
 * answering `hasNextPage: true` forever cannot take the tab with it.
 */
const PAGE_CAP = 20;

/**
 * The bot's WhatsApp templates, for the picker.
 *
 * Fetched the first time the picker opens and kept for the life of the pane,
 * like the flow list and for the same reason. Every page is walked before the
 * list is shown: a picker that shows page one and a "load more" for a set the
 * operator is about to SEARCH would hide the very template they are typing
 * the name of. A bot has tens of templates, not thousands — which is why the
 * walk can be bounded (PAGE_CAP) without the operator ever meeting the bound.
 */
export function useWhatsAppTemplates(wanted: boolean): WhatsAppTemplatesState {
  const { client, botId } = useLivechat();
  const [state, setState] = useState<WhatsAppTemplatesState>({
    templates: [],
    loaded: false,
    loading: false,
    error: null,
  });
  /* The request counter — the bump IS the request. It moves when the picker
   * is wanted and nothing has been read, which after a failure means "wanted
   * again", and after a success never. */
  const [request, setRequest] = useState(0);
  const { loaded } = state;

  useEffect(() => {
    if (wanted && !loaded) setRequest((count) => count + 1);
  }, [wanted, loaded]);

  useEffect(() => {
    if (request === 0) return;
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));
    const walk = () =>
      walkPages<InboxWhatsAppTemplateFragment>(async (after) => {
        const data: InboxWhatsAppTemplatesQuery = await client.query(InboxWhatsAppTemplatesDocument, {
          botID: botId,
          first: PAGE,
          after,
        });
        const page = data.bot?.whatsAppTemplates;
        return {
          nodes: (page?.edges ?? []).map((edge) => edge.node),
          next: page?.pageInfo.hasNextPage ? (page.pageInfo.endCursor ?? null) : null,
        };
      }, PAGE_CAP);
    walk()
      .then((templates) => {
        if (!cancelled) setState({ templates, loaded: true, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ templates: [], loaded: false, loading: false, error: messageOf(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, request]);

  return state;
}

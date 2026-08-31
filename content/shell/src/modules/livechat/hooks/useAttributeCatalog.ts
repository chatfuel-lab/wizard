import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AttributeType,
  BotAttributeOrderBy,
  DashboardLocale,
  InboxAttributesCatalogDocument,
  Sort,
} from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import type { BotAttribute } from '../lib/contactAttributes';
import { ALL_PLATFORMS } from '../lib/platform';

export interface AttributeCatalogState {
  loading: boolean;
  /** Every attribute the bot knows, by name — the panel's labels come from here. */
  byName: Map<string, BotAttribute>;
  /** The custom ones, which are the only ones an operator may add or edit. */
  custom: BotAttribute[];
  locale: DashboardLocale;
  /** Writing a name the bot did not have creates it — the catalog has moved. */
  refresh: () => void;
}

const CATALOG_PAGE = 100;

/**
 * The bot's attribute catalog, for labels and for the add picker.
 *
 * **Nothing waits on this.** The contact arrives with every attribute it
 * carries and each one names itself; the catalog only ever supplies a nicer
 * label and the list of names that could be added. A panel that blocked on it
 * would be a panel that shows nothing while a hundred-attribute bot paginates.
 *
 * Two calls rather than one, because that is how the field is documented to be
 * used — custom attributes are what an operator edits, system attributes are
 * the bot's own bookkeeping shown read-only — and because `botAttributes`
 * requires every argument except the three about paging. There is no "just give
 * me the attributes" call.
 *
 * `DashboardLocale.En` is a fixed choice, matching deals. The signed-in user's
 * own locale is on `CurrentUser.dashboardLocale`, and firing that query to pick
 * between aliases most bots do not define is not worth a request; when it
 * becomes worth one, this is the argument to thread it into.
 */
export function useAttributeCatalog(): AttributeCatalogState {
  const { client, botId } = useLivechat();
  const [attributes, setAttributes] = useState<BotAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const page = (attributeTypes: AttributeType[]) =>
      client.query(InboxAttributesCatalogDocument, {
        botID: botId,
        locale: DashboardLocale.En,
        platforms: ALL_PLATFORMS,
        attributeTypes,
        filters: [],
        orderBy: { direction: Sort.Desc, orderBy: BotAttributeOrderBy.ContactsCount },
        first: CATALOG_PAGE,
      });
    Promise.all([page([AttributeType.Custom]), page([AttributeType.System])])
      .then((pages) => {
        if (cancelled) return;
        setAttributes(
          pages.flatMap((data) => (data.bot?.botAttributes?.edges ?? []).map((edge) => edge.node.botAttribute)),
        );
        setLoading(false);
      })
      .catch(() => {
        /* Labels are a nicety and the add picker is one control. An inbox is
           not the place to report that an attribute is showing under its own
           name rather than under its alias. */
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, nonce]);

  const byName = useMemo(() => new Map(attributes.map((attribute) => [attribute.name, attribute])), [attributes]);
  const custom = useMemo(() => attributes.filter((attribute) => attribute.type === AttributeType.Custom), [attributes]);
  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  return { loading, byName, custom, locale: DashboardLocale.En, refresh };
}

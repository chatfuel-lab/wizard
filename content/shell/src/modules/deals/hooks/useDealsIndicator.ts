import { useEffect, useState } from 'react';
import { DealsIndicatorDocument, DealsIndicatorUpdatesDocument } from '~api/generated/deals/graphql';
import { useDeals } from '../DealsContext';

/**
 * The header's live dot. `dealsPageIndicatorActive` is the server's own
 * "something on this page changed" flag — the same one the Chatfuel dashboard
 * shows — so the dot means something even when the current view's own
 * subscription is quiet or has been throttled.
 *
 * Best-effort by design: a bot where the query or the socket fails renders no
 * dot rather than an error. It is decoration for a state the views already
 * reflect.
 */
export function useDealsIndicator(): boolean {
  const { client, botId } = useDeals();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client
      .query(DealsIndicatorDocument, { botID: botId })
      .then((data) => {
        if (!cancelled) setActive(Boolean(data.bot?.dealsPageIndicatorActive));
      })
      .catch(() => {
        /* decoration */
      });

    const unsubscribe = client.subscribe(
      DealsIndicatorUpdatesDocument,
      { botID: botId },
      {
        next: (data) => {
          const update = data.contactsDealsPageIndicatorUpdates;
          if (update) setActive(update.active);
        },
        error: () => {
          /* transport retries */
        },
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [client, botId]);

  return active;
}

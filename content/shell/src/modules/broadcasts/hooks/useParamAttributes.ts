import { useEffect, useState } from 'react';
import { BroadcastAttributesDocument } from '~api/generated/broadcasts/graphql';
import { useBroadcasts } from '../BroadcastsContext';

const PAGE = 100;

/**
 * The names a template parameter may be personalised with — the bot's
 * WhatsApp attributes, read once per mount.
 *
 * Only these names ever go into a `{{…}}`: the server accepts any name and
 * CREATES a custom attribute for one it does not know, and refuses one that
 * another platform owns. So the insert control offers this list and nothing
 * typed by hand becomes a reference. The first hundred by contact count is
 * the whole catalog on every bot seen so far; a bot with more keeps its
 * long tail out of the picker rather than paging for it.
 */
export function useParamAttributes(): { names: string[]; loading: boolean } {
  const { client, botId } = useBroadcasts();
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client
      .query(BroadcastAttributesDocument, { botID: botId, first: PAGE })
      .then((data) => {
        if (cancelled) return;
        const seen = new Set<string>();
        for (const edge of data.bot.botAttributes?.edges ?? []) seen.add(edge.node.botAttribute.name);
        setNames([...seen].sort((a, b) => a.localeCompare(b)));
        setLoading(false);
      })
      .catch(() => {
        // No catalog means no insert control, not a broken form: free text still saves.
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId]);

  return { names, loading };
}

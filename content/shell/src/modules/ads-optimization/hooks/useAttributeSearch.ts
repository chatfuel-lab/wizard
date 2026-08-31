import { useEffect, useRef, useState } from 'react';
import { AdsAttributesDocument } from '~api/generated/ads-optimization/graphql';
import type { ApiClient } from '../types';

export interface AttributeOption {
  name: string;
  dataType: string;
}

export interface AttributeSearch {
  options: AttributeOption[];
  loading: boolean;
}

const PAGE_SIZE = 30;
const DEBOUNCE_MS = 200;

/**
 * Contact properties matching what has been typed.
 *
 * Substring-filtered server-side and capped at one page: a bot with thousands
 * of properties would otherwise send all of them to fill a dropdown nobody
 * scrolls past the tenth row of.
 */
export function useAttributeSearch(client: ApiClient, botId: string, query: string, enabled: boolean): AttributeSearch {
  const [options, setOptions] = useState<AttributeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const gen = ++generation.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      client
        .query(AdsAttributesDocument, {
          botID: botId,
          inputSubstring: query.trim() || null,
          first: PAGE_SIZE,
          after: null,
        })
        .then((data) => {
          if (gen !== generation.current) return;
          setOptions(
            data.bot.botAttributes.edges.map((edge) => ({
              name: edge.node.botAttribute.name,
              dataType: edge.node.botAttribute.dataType,
            })),
          );
        })
        .catch(() => {
          /* An empty list, not an error: the picker is a suggestion box, and
             the next keystroke re-runs the query anyway. */
          if (gen === generation.current) setOptions([]);
        })
        .finally(() => {
          if (gen === generation.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [client, botId, query, enabled]);

  return { options, loading };
}

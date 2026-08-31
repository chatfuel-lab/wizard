import { useEffect, useState } from 'react';
import {
  AttributeType,
  BotAttributesAutocompleteDocument,
  DashboardLocale,
  type Platform,
} from '~api/generated/flow-builder/graphql';
import { useFlowBuilder } from '../FlowBuilderContext';

const PAGE = 100;

/**
 * Attribute names for autocomplete datalists. Fired twice like the dashboard —
 * attributeTypes [custom] and [system] (guide.md "Rich text"). Best-effort:
 * failures degrade to an empty suggestion list, never to an error state.
 */
export function useAttributeSuggestions(platform: Platform): string[] {
  const { client, botId } = useFlowBuilder();
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchBucket = (attributeTypes: AttributeType[]) =>
      client.query(BotAttributesAutocompleteDocument, {
        botID: botId,
        locale: DashboardLocale.En,
        platforms: [platform],
        attributeTypes,
        first: PAGE,
      });
    Promise.all([fetchBucket([AttributeType.Custom]), fetchBucket([AttributeType.System])])
      .then((results) => {
        if (cancelled) return;
        const seen = new Set<string>();
        for (const data of results) {
          for (const edge of data.bot?.botAttributes?.edges ?? []) {
            seen.add(edge.node.botAttribute.name);
          }
        }
        setNames([...seen].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {
        /* suggestions are decoration */
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, platform]);

  return names;
}

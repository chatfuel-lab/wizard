import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdsConnectionDocument,
  AdsEventNamesDocument,
  FuelySettingSendEventsToMetaStandardEventName,
} from '~api/generated/ads-optimization/graphql';
import type { ApiClient } from '../types';

/** Why conversions would not be delivered, whatever the sets say. */
export type DeliveryState = 'ok' | 'noWhatsApp' | 'noPermission' | 'accessLost' | 'unknown';

export interface Catalog {
  /** Meta's own conversion names, and the ones this bot has invented before. */
  standardNames: readonly FuelySettingSendEventsToMetaStandardEventName[];
  customNames: readonly string[];
  delivery: DeliveryState;
  loading: boolean;
  /** Call after saving an event under a name of your own. */
  reloadNames: () => void;
}

const ALL_STANDARD = Object.values(FuelySettingSendEventsToMetaStandardEventName);

/**
 * The two things the editor needs that are not the sets themselves: which
 * conversion names may be used, and whether anything can be delivered at all.
 *
 * `standardNames` falls back to every name this build knows if the query fails
 * — the picker being empty would be a worse lie than a name the bot cannot use,
 * which the server refuses anyway.
 */
export function useCatalogStore(client: ApiClient, botId: string): Catalog {
  const [standardNames, setStandardNames] =
    useState<readonly FuelySettingSendEventsToMetaStandardEventName[]>(ALL_STANDARD);
  const [customNames, setCustomNames] = useState<readonly string[]>([]);
  const [delivery, setDelivery] = useState<DeliveryState>('unknown');
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);

  const loadNames = useCallback(() => {
    client
      .query(AdsEventNamesDocument, { botID: botId })
      .then((data) => {
        const names = data.bot.availableMetaConversionEventNames;
        setStandardNames(names.standardEvents.length > 0 ? names.standardEvents : ALL_STANDARD);
        setCustomNames(names.customEvents);
      })
      .catch(() => undefined);
  }, [client, botId]);

  useEffect(() => {
    const gen = ++generation.current;
    setLoading(true);
    loadNames();
    client
      .query(AdsConnectionDocument, { botID: botId })
      .then((data) => {
        if (gen !== generation.current) return;
        const scope = data.bot.contactScopes.find((candidate) => candidate.__typename === 'WhatsAppPhoneContactScope');
        if (!scope || scope.__typename !== 'WhatsAppPhoneContactScope') {
          setDelivery('noWhatsApp');
          return;
        }
        const account = scope.phone.whatsAppBusinessAccount;
        if (scope.phone.accessLost || account.accessLost) setDelivery('accessLost');
        else if (!account.hasMetaConversionsAPIPermission) setDelivery('noPermission');
        else setDelivery('ok');
      })
      .catch(() => {
        if (gen === generation.current) setDelivery('unknown');
      })
      .finally(() => {
        if (gen === generation.current) setLoading(false);
      });
  }, [client, botId, loadNames]);

  return { standardNames, customNames, delivery, loading, reloadNames: loadNames };
}

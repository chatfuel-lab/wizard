import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdsEventSetCreateDocument,
  AdsEventSetDeleteDocument,
  AdsEventSetRenameDocument,
  AdsEventSetSetEnabledDocument,
  AdsEventSetUpdatedDocument,
  AdsEventSetsDocument,
  AdsInheritAdsDocument,
  AdsInheritEventsDocument,
  AdsSetAdsDocument,
  AdsSetEventsDocument,
  type FuelySettingSendEventsToMetaEventInput,
} from '~api/generated/ads-optimization/graphql';
import type { ApiClient, EventSet, EventSetView } from '../types';
import { errorMessage } from '../lib/errors';
import { orderSets, toView } from '../lib/settings';

export interface EventSetsStore {
  /** The sets, flattened for the UI, base first. */
  views: readonly EventSetView[];
  loading: boolean;
  /** Set only when the list itself could not be read; a failed write toasts. */
  error: string | null;
  reload: () => void;
  create: (name: string) => Promise<EventSet>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
  setAds: (id: string, adIDs: readonly string[]) => Promise<void>;
  inheritAds: (id: string, from: string) => Promise<void>;
  setEvents: (id: string, events: readonly FuelySettingSendEventsToMetaEventInput[]) => Promise<void>;
  inheritEvents: (id: string, from: string) => Promise<void>;
}

/**
 * Every event set of the bot, live.
 *
 * One store for the whole surface: a write on a parent republishes every set
 * that follows it, so a per-set fetch would leave the rail lying about what the
 * others now report. The subscription is the same shape as the query, and both
 * merge by id — the server sends one update per affected set, not one per
 * change.
 */
export function useEventSetsStore(client: ApiClient, botId: string): EventSetsStore {
  const [sets, setSets] = useState<readonly EventSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const merge = useCallback((incoming: readonly EventSet[]) => {
    setSets((prev) => {
      const byId = new Map(prev.map((set) => [set.id, set]));
      for (const set of incoming) byId.set(set.id, set);
      return orderSets([...byId.values()]);
    });
  }, []);

  const replace = useCallback((incoming: readonly EventSet[]) => {
    setSets(orderSets(incoming));
  }, []);

  const load = useCallback(() => {
    const gen = ++generation.current;
    setLoading(true);
    setError(null);
    client
      .query(AdsEventSetsDocument, { botID: botId })
      .then((data) => {
        if (gen !== generation.current) return;
        replace(data.bot.fuelyAutomations);
      })
      .catch((err: unknown) => {
        if (gen !== generation.current) return;
        setError(errorMessage(err, 'The event sets could not be loaded.'));
      })
      .finally(() => {
        if (gen === generation.current) setLoading(false);
      });
  }, [client, botId, replace]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    const stop = client.subscribe(
      AdsEventSetUpdatedDocument,
      { botID: botId },
      {
        next: (data) => merge([data.fuelyAutomationUpdated]),
        /* A dropped socket is not a broken page: the reconnect below refetches,
         and until then the list is stale rather than gone. */
        error: () => undefined,
      },
    );
    return stop;
  }, [client, botId, merge]);

  useEffect(() => client.onReconnect(load), [client, load]);

  const create = useCallback(
    async (name: string) => {
      const data = await client.mutate(AdsEventSetCreateDocument, { botID: botId, name });
      merge([data.fuelyAutomationCreate]);
      return data.fuelyAutomationCreate;
    },
    [client, botId, merge],
  );

  const remove = useCallback(
    async (id: string) => {
      const data = await client.mutate(AdsEventSetDeleteDocument, { botID: botId, automationID: id });
      /* The delete answers with the whole list, which is the only way to learn
         what the sets that followed this one look like now. */
      replace(data.fuelyAutomationDelete.fuelyAutomations);
    },
    [client, botId, replace],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      const data = await client.mutate(AdsEventSetRenameDocument, { botID: botId, automationID: id, name });
      setSets((prev) =>
        orderSets(prev.map((set) => (set.id === id ? { ...set, ...data.fuelyAutomationSetName } : set))),
      );
    },
    [client, botId],
  );

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      const data = await client.mutate(AdsEventSetSetEnabledDocument, {
        botID: botId,
        automationID: id,
        enabled,
      });
      setSets((prev) => prev.map((set) => (set.id === id ? { ...set, ...data.fuelyAutomationSetEnabled } : set)));
    },
    [client, botId],
  );

  const setAds = useCallback(
    async (id: string, adIDs: readonly string[]) => {
      const data = await client.mutate(AdsSetAdsDocument, {
        botID: botId,
        automationID: id,
        adIDs: [...adIDs],
      });
      merge([data.fuelyAutomationUpdateSetting]);
    },
    [client, botId, merge],
  );

  const inheritAds = useCallback(
    async (id: string, from: string) => {
      const data = await client.mutate(AdsInheritAdsDocument, { botID: botId, automationID: id, from });
      merge([data.fuelyAutomationUpdateSetting]);
    },
    [client, botId, merge],
  );

  const setEvents = useCallback(
    async (id: string, events: readonly FuelySettingSendEventsToMetaEventInput[]) => {
      const data = await client.mutate(AdsSetEventsDocument, {
        botID: botId,
        automationID: id,
        events: [...events],
      });
      merge([data.fuelyAutomationUpdateSetting]);
    },
    [client, botId, merge],
  );

  const inheritEvents = useCallback(
    async (id: string, from: string) => {
      const data = await client.mutate(AdsInheritEventsDocument, { botID: botId, automationID: id, from });
      merge([data.fuelyAutomationUpdateSetting]);
    },
    [client, botId, merge],
  );

  const views = useMemo(() => sets.map(toView), [sets]);

  return {
    views,
    loading,
    error,
    reload: load,
    create,
    remove,
    rename,
    setEnabled,
    setAds,
    inheritAds,
    setEvents,
    inheritEvents,
  };
}

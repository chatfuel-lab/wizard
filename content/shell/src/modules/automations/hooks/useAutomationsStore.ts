import { useCallback, useEffect, useMemo, useReducer, useState, type Dispatch } from 'react';
import { FuelyAutomationListDocument, FuelyAutomationUpdatedDocument } from '~api/generated/automations/graphql';
import { errorMessage } from '../lib/errors';
import {
  automationsReducer,
  initialAutomationsState,
  type AutomationsAction,
  type AutomationsState,
} from '../lib/automationsStore';
import type { ApiClient, AutomationRecord } from '../types';

export interface AutomationsStore {
  state: AutomationsState;
  dispatch: Dispatch<AutomationsAction>;
  /** Full reload (epoch bump). */
  refetch: () => void;
  /** Bumps on every live event — the header's pulse. */
  tick: number;
  /** The one subscription is mounted. */
  connected: boolean;
}

/**
 * The store: the one all-scope list plus the one bot-wide subscription. Called
 * by `AutomationsApp` with props (it renders the provider — validate 10b).
 *
 * Order matters: the subscription takes
 * 1–3 s to become active and events emitted before that are lost — so it is
 * mounted first and the list is loaded after; a reconnect refetches; every
 * own mutation response is dispatched as `live {origin: 'own'}` by the
 * mutation hooks so a teammate's edit and mine reconcile through one path.
 * `live` is dropped while a load is in flight (the load is the truth).
 */
export function useAutomationsStore(client: ApiClient, botId: string): AutomationsStore {
  const [state, dispatch] = useReducer(automationsReducer, undefined, initialAutomationsState);
  const [tick, setTick] = useState(0);
  const [connected, setConnected] = useState(false);

  // The subscription first (see above); a reconnect is a refetch.
  useEffect(() => {
    const off = client.subscribe(
      FuelyAutomationUpdatedDocument,
      { botID: botId },
      {
        next: (data) => {
          if (!data.fuelyAutomationUpdated) return;
          dispatch({ type: 'live', automation: data.fuelyAutomationUpdated as AutomationRecord, origin: 'live' });
          setTick((n) => n + 1);
        },
        error: () => {
          /* transport retries; the reconnect event refetches */
        },
      },
    );
    const offReconnect = client.onReconnect(() => dispatch({ type: 'reset' }));
    setConnected(true);
    dispatch({ type: 'reset' });
    return () => {
      setConnected(false);
      off();
      offReconnect();
    };
  }, [client, botId]);

  // The epoch bump IS the request.
  useEffect(() => {
    if (state.epoch === 0) return;
    let cancelled = false;
    const epoch = state.epoch;
    client
      .query(FuelyAutomationListDocument, { botID: botId })
      .then((data) => {
        if (cancelled) return;
        dispatch({
          type: 'loaded',
          epoch,
          automations: (data.bot?.fuelyAutomations ?? []) as AutomationRecord[],
          isMigrated: true,
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) dispatch({ type: 'failed', epoch, message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, state.epoch]);

  const refetch = useCallback(() => dispatch({ type: 'reset' }), []);

  return useMemo(() => ({ state, dispatch, refetch, tick, connected }), [state, refetch, tick, connected]);
}

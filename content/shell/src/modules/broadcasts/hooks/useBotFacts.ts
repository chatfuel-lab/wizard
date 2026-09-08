import { useEffect, useState } from 'react';
import { BroadcastBotDocument } from '~api/generated/broadcasts/graphql';
import { useBroadcasts } from '../BroadcastsContext';
import { errorMessage } from '../lib/errors';
import { usableBotZone } from '../lib/zone';
import type { BotFacts } from '../types';

export type BotFactsState =
  { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; facts: BotFacts };

/**
 * The bot's zone and its WhatsApp number, read once per mount and again on
 * refresh. A bot without a connected number can still draft and schedule;
 * sending and arming are refused by the server (`ScopeNotConnectedToBot`),
 * and the composer says so before it gets there.
 */
export function useBotFacts(refreshToken: number): BotFactsState {
  const { client, botId } = useBroadcasts();
  const [state, setState] = useState<BotFactsState>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    client
      .query(BroadcastBotDocument, { botID: botId })
      .then((data) => {
        if (cancelled) return;
        const scope = data.bot.contactScopes.find((candidate) => candidate.__typename === 'WhatsAppPhoneContactScope');
        const phone = scope && scope.__typename === 'WhatsAppPhoneContactScope' ? scope.phone : null;
        setState({
          state: 'ready',
          facts: {
            zone: usableBotZone(data.bot.timezone),
            whatsapp: phone
              ? {
                  phoneId: phone.id,
                  displayPhoneNumber: phone.displayPhoneNumber,
                  status: phone.status ?? null,
                  wabaId: phone.whatsAppBusinessAccount.id,
                  wabaName: phone.whatsAppBusinessAccount.name ?? null,
                  businessId: phone.whatsAppBusinessAccount.facebookBusiness.id,
                  businessName: phone.whatsAppBusinessAccount.facebookBusiness.name,
                }
              : null,
          },
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ state: 'error', message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, refreshToken]);

  return state;
}

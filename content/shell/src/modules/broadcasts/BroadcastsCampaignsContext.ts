import { createContext, useContext } from 'react';
import type { BotFactsState } from './hooks/useBotFacts';
import type { CampaignsStore } from './hooks/useCampaignsStore';
import type { WhatsAppTemplatesState } from './hooks/useWhatsAppTemplates';

/**
 * The one list of campaigns and the one template catalog, shared by every
 * view. Providers rather than props on the view contract: the list, the
 * panel and the composer all draw from the same flows, and a second fetch
 * anywhere would be a second truth.
 */
export const BroadcastsCampaignsContext = createContext<CampaignsStore | null>(null);

export function useCampaigns(): CampaignsStore {
  const value = useContext(BroadcastsCampaignsContext);
  if (!value) throw new Error('useCampaigns must be used inside BroadcastsApp');
  return value;
}

export interface BotFactsApi {
  bot: BotFactsState;
  /** Read the bot again — the header's refresh, and the way back from Connect WhatsApp. */
  refreshBot: () => void;
}

/**
 * The bot's zone and its WhatsApp number, read once at the root: the catalog
 * is not even asked for until the number is known to be there, because the
 * template service answers a bare server error for a bot without one.
 */
export const BroadcastsBotContext = createContext<BotFactsApi | null>(null);

export function useBot(): BotFactsApi {
  const value = useContext(BroadcastsBotContext);
  if (!value) throw new Error('useBot must be used inside BroadcastsApp');
  return value;
}

export const BroadcastsCatalogContext = createContext<WhatsAppTemplatesState | null>(null);

export function useCatalog(): WhatsAppTemplatesState {
  const value = useContext(BroadcastsCatalogContext);
  if (!value) throw new Error('useCatalog must be used inside BroadcastsApp');
  return value;
}

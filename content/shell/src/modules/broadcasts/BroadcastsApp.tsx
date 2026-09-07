import { useCallback, useMemo, useRef, useState } from 'react';
import { ModuleRoot, ToastProvider } from '~ui';
import type { ModuleAppProps } from '../types';
import {
  BroadcastsBotContext,
  BroadcastsCampaignsContext,
  BroadcastsCatalogContext,
} from './BroadcastsCampaignsContext';
import { BroadcastsContext, useBroadcasts } from './BroadcastsContext';
import { BroadcastsWorkspace } from './BroadcastsWorkspace';
import { useBotFacts } from './hooks/useBotFacts';
import { useCampaignsStore } from './hooks/useCampaignsStore';
import { useNow } from './hooks/useNow';
import { useWhatsAppTemplates } from './hooks/useWhatsAppTemplates';

/**
 * Embeddable root of the Broadcasts module — WhatsApp campaigns over the flow
 * API.
 *
 * This component owns the providers and nothing else; `BroadcastsWorkspace`
 * reads them. A context hook called inside the component that renders the
 * provider throws at runtime and neither `tsc` nor a node-only test can see
 * it, so the stores are built one component down, in `BroadcastsStores`.
 */
export function BroadcastsApp({
  botId,
  client,
  view,
  setView,
  params,
  setParams,
  navigate,
  installedModules,
}: ModuleAppProps) {
  const context = useMemo(
    () => ({ client, botId, navigate, installedModules: installedModules ?? [] }),
    [client, botId, navigate, installedModules],
  );
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <ToastProvider>
      <BroadcastsContext.Provider value={context}>
        <ModuleRoot ref={rootRef} className="relative">
          <BroadcastsStores>
            <BroadcastsWorkspace
              view={view}
              setView={setView}
              params={params}
              setParams={setParams}
              rootRef={rootRef}
            />
          </BroadcastsStores>
        </ModuleRoot>
      </BroadcastsContext.Provider>
    </ToastProvider>
  );
}

/**
 * The shared stores, one component below their context so their hooks may
 * read it. The bot facts come first: the template catalog is asked for only
 * once a WhatsApp number is known to be connected — a bot without one gets a
 * bare server error from the template service, and there is nothing to list.
 */
function BroadcastsStores({ children }: { children: React.ReactNode }) {
  const { client, botId } = useBroadcasts();
  const now = useNow();
  const [botToken, setBotToken] = useState(0);
  const refreshBot = useCallback(() => setBotToken((n) => n + 1), []);
  const bot = useBotFacts(botToken);
  const botApi = useMemo(() => ({ bot, refreshBot }), [bot, refreshBot]);
  const campaigns = useCampaignsStore(client, botId, now);
  const catalog = useWhatsAppTemplates(bot.state === 'ready' && bot.facts.whatsapp !== null);
  return (
    <BroadcastsBotContext.Provider value={botApi}>
      <BroadcastsCampaignsContext.Provider value={campaigns}>
        <BroadcastsCatalogContext.Provider value={catalog}>{children}</BroadcastsCatalogContext.Provider>
      </BroadcastsCampaignsContext.Provider>
    </BroadcastsBotContext.Provider>
  );
}

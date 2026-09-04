import { useMemo } from 'react';
import { ModuleRoot, ToastProvider } from '~ui';
import type { ModuleAppProps } from '../types';
import { ChannelsContext } from './ChannelsContext';
import { ChannelsWorkspace } from './ChannelsWorkspace';

/**
 * Embeddable root of the Channels module — the channels connected to the bot,
 * and the platform links that connect a new one or refresh an existing one's
 * access.
 *
 * This component owns the providers and nothing else; `ChannelsWorkspace`
 * reads them. A context hook called inside the component that renders the
 * provider throws at runtime and neither `tsc` nor a node-only test can see
 * it, so every hook that needs the context lives one component down.
 *
 * The module mounts its own `ToastProvider`: coming back from a hand-off with
 * a channel connected is a toast, and so is a disconnect. A host that strips
 * the provider loses both signals.
 */
export function ChannelsApp({ botId, client, params, setParams }: ModuleAppProps) {
  const context = useMemo(() => ({ client, botId }), [client, botId]);

  return (
    <ToastProvider>
      <ChannelsContext.Provider value={context}>
        <ModuleRoot className="relative">
          <ChannelsWorkspace params={params} setParams={setParams} />
        </ModuleRoot>
      </ChannelsContext.Provider>
    </ToastProvider>
  );
}

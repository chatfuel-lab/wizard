import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '~ui';
import { useChannels } from './ChannelsContext';
import { ChannelsPage } from './components/ChannelsPage';
import { PLATFORM_TITLES } from './lib/channels';
import { useChannelsStore } from './hooks/useChannelsStore';
import { useMyRole } from './hooks/useMyRole';
import { clearHandOff, readHandOff, type HandOffResult } from './lib/returnUrl';

export interface ChannelsWorkspaceProps {
  params: URLSearchParams;
  setParams(next: URLSearchParams): void;
}

/**
 * The consumer half: reads the context, asks the role, runs the store, and
 * hands a pure page everything it draws.
 *
 * It also owns the return leg. Chatfuel brings somebody back here with a
 * result in the address; the page says so once and the address is cleaned,
 * because arriving at a URL is not proof of anything — what is true comes
 * from the read that runs on mount either way.
 */
export function ChannelsWorkspace({ params, setParams }: ChannelsWorkspaceProps) {
  const { client, botId } = useChannels();
  const role = useMyRole();
  const store = useChannelsStore(client, botId);
  const toast = useToast();
  const [handOff, setHandOff] = useState<HandOffResult | null>(null);
  const arrival = useMemo(() => readHandOff(params), [params]);

  /* A disconnect is the one write that finishes here rather than in another
     tab, so it is the one that has somewhere to be announced. It also resolves
     when the channel was already gone — the sentence is true either way. */
  const disconnect = useCallback(
    async (scopeId: string) => {
      await store.disconnect(scopeId);
      toast.show({ title: 'Channel disconnected', tone: 'success', duration: 4000 });
    },
    [store, toast],
  );

  useEffect(() => {
    if (!arrival) return;
    setHandOff(arrival);
    if (arrival.ok)
      toast.show({ title: `${PLATFORM_TITLES[arrival.platform]} connected`, tone: 'success', duration: 4000 });
    setParams(clearHandOff(params));
    // `params` is the address this ran for; re-running on the cleaned one would
    // find no arrival and do nothing, so only the arrival belongs here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrival]);

  return (
    <ChannelsPage
      state={store.state}
      canManage={!role.loading && role.canManage}
      handOff={handOff}
      onDismissHandOff={() => setHandOff(null)}
      onRefresh={store.refresh}
      onConnect={store.connect}
      onRefreshAccess={store.refreshAccess}
      onDisconnect={disconnect}
    />
  );
}

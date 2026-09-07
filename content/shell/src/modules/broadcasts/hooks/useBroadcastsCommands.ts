import { useCallback, useMemo, useState } from 'react';
import { useToast } from '~ui';
import { useCampaigns, useCatalog } from '../BroadcastsCampaignsContext';
import type { BroadcastsAddress } from '../lib/broadcastsParams';
import type { BroadcastsCommandContext, BroadcastsCommandHandlers } from '../lib/commands';
import { errorMessage } from '../lib/errors';
import { whatsAppManagerUrl } from '../lib/waManager';
import type { BotFactsState } from './useBotFacts';
import type { MyRole } from './useMyRole';

export interface BroadcastsCommandInput {
  address: BroadcastsAddress;
  patch: (next: Partial<BroadcastsAddress>) => void;
  role: MyRole;
  bot: BotFactsState;
  /** Make a new draft and open the composer on it — the header button's handler. */
  onNewCampaign: () => void;
  /** Bump the refresh token — the header button's handler. */
  refresh: () => void;
  /** Leave the app for a URL in a new tab; the design system's `openExternal` in the app, a spy in a test. */
  openExternal: (url: string) => void;
}

export interface BroadcastsCommandsApi {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  commandContext: BroadcastsCommandContext;
  commandHandlers: BroadcastsCommandHandlers;
}

/**
 * What the palette can see and what it can do, built from the two shared
 * stores and the workspace's own state. The workspace keeps the keyboard —
 * `useHotkeys` is bound there, and `palette` / `help` land on the two
 * setters this returns — so this hook binds nothing and owns only the two
 * open bits and the wiring. A copy of the publishing module's
 * `hooks/usePublishingCommands.ts`, minus its bindings.
 */
export function useBroadcastsCommands({
  address,
  patch,
  role,
  bot,
  onNewCampaign,
  refresh,
  openExternal,
}: BroadcastsCommandInput): BroadcastsCommandsApi {
  const store = useCampaigns();
  const catalog = useCatalog();
  const toast = useToast();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const whatsapp = bot.state === 'ready' ? bot.facts.whatsapp : null;
  const managerUrl = whatsapp ? whatsAppManagerUrl(whatsapp.wabaId, whatsapp.businessId) : null;

  const commandContext = useMemo<BroadcastsCommandContext>(
    () => ({
      view: address.view,
      status: address.status,
      canEdit: !role.loading && role.canEdit,
      whatsappConnected: managerUrl !== null,
      campaigns: store.campaigns.map((record) => ({
        flowId: record.flowId,
        name: record.name,
        status: record.status,
      })),
    }),
    [address.view, address.status, role.loading, role.canEdit, managerUrl, store.campaigns],
  );

  /* The catalog's "Check with Meta" from anywhere: the same mutation the
     templates toolbar runs, with the same toast, so the palette and the
     button are one action in two places. */
  const checkTemplates = useCallback(async () => {
    try {
      await catalog.refetchFromMeta();
      toast.show({ title: 'Asked Meta for the latest', tone: 'success', duration: 4000 });
    } catch (err) {
      toast.show({ title: errorMessage(err), tone: 'danger' });
    }
  }, [catalog, toast]);

  const commandHandlers = useMemo<BroadcastsCommandHandlers>(
    () => ({
      newCampaign: onNewCampaign,
      refresh,
      openShortcuts: () => setShortcutsOpen(true),
      setView: (view) => patch({ view, campaign: null, template: null, step: null }),
      setStatus: (status) => patch({ status }),
      openManager: () => {
        if (managerUrl) openExternal(managerUrl);
      },
      checkTemplates: () => void checkTemplates(),
      /* A campaign opens as the list's panel, whatever view was showing: the
         address is the truth of what is open, and the list view reads it. */
      openCampaign: (flowId) => patch({ view: 'campaigns', campaign: flowId, step: null, template: null }),
    }),
    [onNewCampaign, refresh, patch, managerUrl, openExternal, checkTemplates],
  );

  return { paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen, commandContext, commandHandlers };
}

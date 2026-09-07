import { useCallback, useMemo, useState, type RefObject } from 'react';
import { Alert, ShortcutsDialog, openExternal, useBand, useHotkeys } from '~ui';
import type { ModuleAppProps } from '../types';
import { useBot, useCampaigns, useCatalog } from './BroadcastsCampaignsContext';
import { useBroadcasts } from './BroadcastsContext';
import { BroadcastsCommandPalette } from './components/BroadcastsCommandPalette';
import { BroadcastsHeader } from './components/BroadcastsHeader';
import { useBroadcastsCommands } from './hooks/useBroadcastsCommands';
import { useBroadcastsUrl } from './hooks/useBroadcastsUrl';
import { useMyRole } from './hooks/useMyRole';
import { useNow } from './hooks/useNow';
import { visibleCampaigns } from './lib/campaignRows';
import { errorMessage } from './lib/errors';
import { BINDINGS, SHORTCUT_ROWS, SHORTCUT_SECTIONS, type ShortcutId } from './lib/shortcuts';
import { localZone } from './lib/zone';
import { CampaignsView } from './views/CampaignsView';
import { ComposerRoute } from './views/ComposerRoute';
import { TemplatesView } from './views/TemplatesView';

/** What a draft is called until the composer's first step names it. */
export const NEW_CAMPAIGN_NAME = 'Untitled campaign';

export interface BroadcastsWorkspaceProps extends Pick<ModuleAppProps, 'view' | 'setView' | 'params' | 'setParams'> {
  /** The module root: what every shortcut in here is scoped against. */
  rootRef: RefObject<HTMLElement | null>;
}

/**
 * Everything the views share: the address, the band, the role, the bot
 * facts, the clock, and the keys that mean the same thing everywhere. The
 * composer is a route of its own — it replaces the list rather than floating
 * over it, because it is a place somebody stays in.
 */
export function BroadcastsWorkspace({ view, setView, params, setParams, rootRef }: BroadcastsWorkspaceProps) {
  const band = useBand();
  const now = useNow();
  const role = useMyRole();
  const store = useCampaigns();
  const catalog = useCatalog();
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const { bot, refreshBot } = useBot();
  const { navigate, installedModules } = useBroadcasts();
  const { address, patch, compose, closeComposer } = useBroadcastsUrl({ view, setView, params, setParams });

  const zone = useMemo(() => (bot.state === 'ready' && bot.facts.zone) || localZone(), [bot]);

  /* Refresh re-reads all three: the list, the catalog and the bot facts.
     Both stores live at the root, so a refresh on one tab is a refresh on
     the other too. */
  const refresh = useCallback(() => {
    store.refresh();
    catalog.refresh();
    refreshBot();
  }, [store, catalog, refreshBot]);

  /* A number is connected in the channels module, when this deployment has
     one; without it there is nowhere to send the person, and the empty state
     says only what is true. */
  const onConnectWhatsApp = useMemo(
    () => (installedModules.includes('channels') ? () => navigate('/channels') : null),
    [installedModules, navigate],
  );
  const whatsappMissing = bot.state === 'ready' && bot.facts.whatsapp === null;

  /* A new campaign is a server draft from the first second: the composer
     always edits something that exists, so a reload lands on the same draft.
     The kind is asked on the composer's first step; the draft starts as a
     scheduled pair because that is the superset, and "send now" is a switch
     the composer makes there. */
  const newCampaign = useCallback(async () => {
    setCreating(null);
    try {
      const flowId = await store.createDraft(NEW_CAMPAIGN_NAME, 'scheduled');
      compose(flowId, 'name');
    } catch (err) {
      setCreating(errorMessage(err));
    }
  }, [store, compose]);

  const { paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen, commandContext, commandHandlers } =
    useBroadcastsCommands({
      address,
      patch,
      role,
      bot,
      onNewCampaign: () => void newCampaign(),
      refresh,
      openExternal,
    });

  /* The rows the list shows — `[` and `]` walk these, not every campaign,
     so a filtered list never opens the panel on a row that is not on it. */
  const rows = useMemo(
    () => visibleCampaigns(store.campaigns, address.status, address.q),
    [store.campaigns, address.status, address.q],
  );
  const selectedIndex = useMemo(
    () => rows.findIndex((record) => record.flowId === address.campaign),
    [rows, address.campaign],
  );

  const onHotkey = useCallback(
    (id: ShortcutId) => {
      switch (id) {
        case 'palette':
          setPaletteOpen(true);
          return;
        case 'help':
          setShortcutsOpen(true);
          return;
        case 'refresh':
          refresh();
          return;
        case 'newCampaign':
          if (role.canEdit && !whatsappMissing && address.view !== 'compose') void newCampaign();
          return;
        case 'search': {
          const box = rootRef.current?.querySelector<HTMLInputElement>('input[type="search"]');
          box?.focus();
          box?.select();
          return;
        }
        case 'prev':
        case 'next': {
          if (address.view !== 'campaigns' || rows.length === 0) return;
          const step = id === 'next' ? 1 : -1;
          const index = selectedIndex === -1 ? (step === 1 ? 0 : rows.length - 1) : selectedIndex + step;
          const target = rows[Math.max(0, Math.min(rows.length - 1, index))];
          if (target) patch({ campaign: target.flowId });
          return;
        }
        case 'close':
          if (address.view === 'campaigns' && address.campaign) patch({ campaign: null });
          else if (address.view === 'templates' && address.template) patch({ template: null });
          return;
        case 'goCampaigns':
          patch({ view: 'campaigns', step: null });
          return;
        case 'goTemplates':
          patch({ view: 'templates', step: null });
          return;
      }
    },
    [
      refresh,
      role.canEdit,
      whatsappMissing,
      address,
      newCampaign,
      rootRef,
      rows,
      selectedIndex,
      patch,
      setPaletteOpen,
      setShortcutsOpen,
    ],
  );

  useHotkeys(BINDINGS, onHotkey, { rootRef, enabled: !paletteOpen && !shortcutsOpen });

  /* Both are portalled, so whichever is open holds the focus — and every
     binding in this module is scoped to the root, which is how the bare
     letters stand down while somebody is typing into the palette. Mounted on
     both branches below, because ⌘K and ? mean the same thing inside the
     composer. */
  const overlays = (
    <>
      <BroadcastsCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        context={commandContext}
        handlers={commandHandlers}
      />
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        sections={SHORTCUT_SECTIONS}
        rows={SHORTCUT_ROWS}
      />
    </>
  );

  const viewProps = {
    address,
    patch,
    band,
    role,
    bot,
    zone,
    now,
    onBusy: setBusy,
    onCompose: compose,
    onNewCampaign: () => void newCampaign(),
    onConnectWhatsApp,
    rootRef,
  };

  if (address.view === 'compose' && address.campaign) {
    return (
      <>
        <ComposerRoute
          flowId={address.campaign}
          step={address.step}
          onStep={(step) => patch({ step })}
          onClose={() => closeComposer(address.campaign)}
          onCompose={compose}
          onConnectWhatsApp={onConnectWhatsApp}
          band={band}
          role={role}
          bot={bot}
          zone={zone}
          now={now}
          rootRef={rootRef}
        />
        {overlays}
      </>
    );
  }

  return (
    <>
      <BroadcastsHeader
        view={address.view}
        onViewChange={(next) => patch({ view: next, campaign: null, template: null, q: '' })}
        busy={busy}
        onRefresh={refresh}
        canCreate={!role.loading && role.canEdit && !whatsappMissing}
        creating={store.isPending('create')}
        onNewCampaign={() => void newCampaign()}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      {creating ? (
        <div className="px-gutter pt-2">
          <Alert tone="danger" title="The campaign could not be created" onDismiss={() => setCreating(null)}>
            {creating}
          </Alert>
        </div>
      ) : null}
      {address.view === 'templates' ? <TemplatesView {...viewProps} /> : <CampaignsView {...viewProps} />}
      {overlays}
    </>
  );
}

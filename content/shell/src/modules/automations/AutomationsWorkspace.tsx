import { useCallback, useEffect, useState, type RefObject } from 'react';
import { ShortcutsDialog, useBand } from '~ui';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { ModuleAppProps } from '../types';
import { usePublishScreenContext } from '../shellApi';
import { useCatalog } from './AutomationsCatalogContext';
import { useDrafts } from './AutomationsDraftContext';
import { useAutomationRecords } from './AutomationsStoreContext';
import { AutomationsCommandPalette } from './components/AutomationsCommandPalette';
import { AutomationsHeader } from './components/AutomationsHeader';
import { ChannelsView } from './components/channels/ChannelsView';
import { DirtyGuardDialog } from './components/DirtyGuardDialog';
import { NewRuleDialog } from './components/newRule/NewRuleDialog';
import { TestPanel } from './components/panel/TestPanel';
import { useAutomationMutations } from './hooks/useAutomationMutations';
import { useAutomationsCommands } from './hooks/useAutomationsCommands';
import { useAutomationsUrl } from './hooks/useAutomationsUrl';
import { useDraftCount } from './hooks/useDraftCount';
import { useMyRole } from './hooks/useMyRole';
import type { AutomationsParams } from './lib/automationsParams';
import { selectAllBase, selectBase } from './lib/automationsStore';
import { SHORTCUT_ROWS, SHORTCUT_SECTIONS } from './lib/shortcuts';

type WorkspaceProps = Pick<ModuleAppProps, 'params' | 'setParams'> & {
  /** The module root, forwarded from `ModuleRoot`: what `useHotkeys` scopes focus against. */
  rootRef: RefObject<HTMLDivElement | null>;
};

/** How long the header dot pulses after a live event. */
const LIVE_PULSE_MS = 2500;

/**
 * Below the providers: the URL and its dirty guard (`useAutomationsUrl`), the
 * band, the keyboard (`useAutomationsCommands`), the Test panel's target, the
 * New-rule dialog, and the one surface — `ChannelsView` (rail + scope page +
 * the always-open Test panel).
 */
export function AutomationsWorkspace({ rootRef, params, setParams }: WorkspaceProps) {
  const band = useBand();
  const role = useMyRole();
  const store = useAutomationRecords();
  const catalog = useCatalog();
  const drafts = useDrafts();
  const dirtyCount = useDraftCount();
  const mutations = useAutomationMutations();

  const [busy, setBusy] = useState(false);

  const { parsed, patch, patchNow, guarded, setGuarded } = useAutomationsUrl({
    params,
    setParams,
    dirtyCount: drafts.dirtyCount,
  });

  /* What the Coworker sees when it asks what is on screen. Write-only into a
     sink the shell owns; a no-op when this module runs as an embed. */
  usePublishScreenContext({
    module: 'AI Automations',
    source: parsed.scope,
    openRule: parsed.automation,
    openSetting: parsed.setting,
  });

  const goScope = useCallback(
    (scope: AutomationsParams['scope']) => patch({ scope, automation: null, setting: null }),
    [patch],
  );
  const openNewRule = useCallback(
    (scope?: AutomationsParams['scope']) =>
      patchNow({
        new:
          scope ??
          (parsed.scope !== FuelyAutomationScope.All ? parsed.scope : FuelyAutomationScope.InstagramPostComments),
      }),
    [patchNow, parsed.scope],
  );
  const closeNewRule = useCallback(() => patchNow({ new: null }), [patchNow]);
  const refresh = useCallback(() => {
    store.refetch();
    catalog.refresh();
  }, [store, catalog]);

  /* The live dot: a pulse per event, not a permanent light. */
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (store.tick === 0) return;
    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), LIVE_PULSE_MS);
    return () => window.clearTimeout(timer);
  }, [store.tick]);

  const allBase = selectAllBase(store.state);
  const aiOn = allBase ? allBase.enabled : null;
  const setAi = useCallback(
    (on: boolean) => {
      if (allBase) void mutations.setEnabled(allBase, on);
    },
    [allBase, mutations],
  );

  /* What the Test panel pins to: the rule the reader last opened on this source
   * (a card expanded, the panel's own picker, `?automation=` on arrival), else
   * the source's Default. Local state, not the URL — expanding a card is not a
   * navigation, and `?automation=` already means "scroll to and expand". */
  const [focus, setFocus] = useState<string | null>(parsed.automation);
  useEffect(() => setFocus(parsed.automation), [parsed.automation, parsed.scope]);
  const onRuleOpenChange = useCallback((automationId: string, open: boolean) => {
    setFocus((prev) => (open ? automationId : prev === automationId ? null : prev));
  }, []);
  const focused = focus ? store.state.byId[focus] : undefined;
  const testTarget =
    focused && focused.scope === parsed.scope ? focused.id : (selectBase(store.state, parsed.scope)?.id ?? null);
  /* The panel is testing something (the All scope is not previewable); the
     restart command clicks the panel's own button if a session exists. */
  const previewActive = role.canEdit && parsed.scope !== FuelyAutomationScope.All && testTarget !== null;

  const { paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen, commandContext, commandHandlers } =
    useAutomationsCommands({
      rootRef,
      scope: parsed.scope,
      previewActive,
      aiOn,
      dirtyCount,
      canEdit: role.canEdit,
      goScope,
      openNewRule,
      setAi,
      refresh,
    });

  return (
    <>
      <AutomationsHeader
        live={pulse}
        onRefresh={refresh}
        refreshing={busy || store.state.loading}
        canEdit={role.canEdit}
        onNewRule={() => openNewRule()}
        dirtyCount={dirtyCount}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <ChannelsView
        params={parsed}
        onParams={patch}
        band={band}
        role={role}
        onBusy={setBusy}
        onNewRule={openNewRule}
        onRuleOpenChange={onRuleOpenChange}
        testPanel={role.canEdit ? <TestPanel scope={parsed.scope} automationId={testTarget} onPick={setFocus} /> : null}
      />

      <NewRuleDialog
        open={parsed.new !== null}
        scope={parsed.new}
        onClose={closeNewRule}
        onCreated={(automation) =>
          patchNow({ new: null, scope: automation.scope, automation: automation.id, setting: null })
        }
        canEdit={role.canEdit}
      />
      <DirtyGuardDialog
        open={guarded !== null}
        count={dirtyCount}
        onSave={async () => {
          const result = await drafts.saveAll();
          if (result.failed.length === 0 && guarded) patchNow(guarded);
          setGuarded(null);
        }}
        onDiscard={() => {
          drafts.discardAll();
          if (guarded) patchNow(guarded);
          setGuarded(null);
        }}
        onStay={() => setGuarded(null)}
      />
      <AutomationsCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        context={commandContext}
        handlers={commandHandlers}
      />
      {/* Rendered straight from `lib/shortcuts.ts`, so the sheet cannot drift
          from the handlers — `shortcuts.test.ts` pins the two sides. */}
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        sections={SHORTCUT_SECTIONS}
        rows={SHORTCUT_ROWS}
      />
    </>
  );
}

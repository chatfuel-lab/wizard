import { useCallback, useMemo, useState, type RefObject } from 'react';
import { useHotkeys } from '~ui';
import { useCatalog } from '../AutomationsCatalogContext';
import { useDrafts } from '../AutomationsDraftContext';
import { useAutomationRecords } from '../AutomationsStoreContext';
import { useAutomationsUndo } from '../AutomationsUndoContext';
import type { AutomationsParams } from '../lib/automationsParams';
import { selectCustomsCount, selectScopeStatus } from '../lib/automationsStore';
import type { AutomationsCommandContext, AutomationsCommandHandlers } from '../lib/commands';
import { SCOPES, platformOf } from '../lib/scopes';
import { WORKSPACE_BINDINGS, type WorkspaceShortcutId } from '../lib/shortcuts';

export interface AutomationsCommandsArgs {
  rootRef: RefObject<HTMLDivElement | null>;
  scope: AutomationsParams['scope'];
  /** True while the Test panel has something to preview. */
  previewActive: boolean;
  /** The AI master switch, or null while the Default rule is unknown. */
  aiOn: boolean | null;
  /** Unsaved drafts across the workspace. */
  dirtyCount: number;
  canEdit: boolean;
  goScope: (scope: AutomationsParams['scope']) => void;
  openNewRule: () => void;
  setAi: (on: boolean) => void;
  refresh: () => void;
}

export interface AutomationsCommandsApi {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  commandContext: AutomationsCommandContext;
  commandHandlers: AutomationsCommandHandlers;
}

/**
 * The keyboard and the palette: what the commands can see, what they can do,
 * and the workspace shortcuts that reach the same handlers. Binds `useHotkeys`
 * itself, so mounting this hook IS enabling the module's keyboard.
 */
export function useAutomationsCommands({
  rootRef,
  scope,
  previewActive,
  aiOn,
  dirtyCount,
  canEdit,
  goScope,
  openNewRule,
  setAi,
  refresh,
}: AutomationsCommandsArgs): AutomationsCommandsApi {
  const store = useAutomationRecords();
  const catalog = useCatalog();
  const drafts = useDrafts();
  const undo = useAutomationsUndo();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  /* The rail's search box is the view's own control; `/` and the command reach
   * it through the DOM. `data-automations-scope-search` is the contract. */
  const focusSearch = useCallback(() => {
    const input = rootRef.current?.querySelector<HTMLInputElement>('[data-automations-scope-search]');
    input?.focus();
    input?.select();
  }, [rootRef]);

  const stepScope = useCallback(
    (delta: -1 | 1) => {
      const at = SCOPES.indexOf(scope);
      const next = SCOPES[(at + delta + SCOPES.length) % SCOPES.length]!;
      goScope(next);
    },
    [scope, goScope],
  );

  const commandContext: AutomationsCommandContext = useMemo(() => {
    const customs = selectCustomsCount(store.state);
    const connected = new Set(catalog.channels.filter((c) => c.connected).map((c) => c.platform));
    return {
      scope,
      previewActive,
      aiOn,
      undoLabel: undo.label,
      dirtyCount,
      canEdit,
      scopes: SCOPES.map((scope) => ({
        scope,
        status: selectScopeStatus(store.state, scope),
        rules: customs[scope] ?? 0,
        connected: scope === 'All' ? true : connected.has(platformOf(scope)!),
      })),
    };
  }, [store.state, catalog.channels, scope, previewActive, aiOn, undo.label, dirtyCount, canEdit]);

  const commandHandlers: AutomationsCommandHandlers = useMemo(
    () => ({
      goScope,
      newRule: () => openNewRule(),
      undo: undo.run,
      saveAll: () => void drafts.saveAll(),
      focusSearch,
      setAi,
      refresh,
      openShortcuts: () => setShortcutsOpen(true),
      restartPreview: () => {
        rootRef.current?.querySelector<HTMLButtonElement>('[data-automations-preview-restart]')?.click();
      },
    }),
    [goScope, openNewRule, undo.run, drafts, focusSearch, setAi, refresh, rootRef],
  );

  const onShortcut = useCallback(
    (id: WorkspaceShortcutId) => {
      switch (id) {
        case 'palette':
          return setPaletteOpen((open) => !open);
        case 'help':
          return setShortcutsOpen(true);
        case 'search':
          return focusSearch();
        case 'undo':
          return undo.run();
        case 'save':
          return void drafts.saveAll();
        case 'refresh':
          return refresh();
        case 'newRule':
          return canEdit ? openNewRule() : undefined;
        case 'prevScope':
          return stepScope(-1);
        case 'nextScope':
          return stepScope(1);
      }
    },
    [focusSearch, undo, drafts, refresh, canEdit, openNewRule, stepScope],
  );

  useHotkeys(WORKSPACE_BINDINGS, onShortcut, { rootRef });

  return { paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen, commandContext, commandHandlers };
}

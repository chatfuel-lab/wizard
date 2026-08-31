/**
 * What the ⌘K palette offers, as data.
 *
 * **Workspace-scoped on purpose** (deals' rule): every command acts on state
 * `AutomationsWorkspace` already owns — the selected source, the pending undo,
 * the drafts, the Test panel, the New-rule dialog. Nothing reaches into a
 * card.
 *
 * Pure, so "which commands appear in which state" is a test. Icons come in as
 * a map from the component.
 */
import type { ReactNode } from 'react';
import type { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { CommandGroup, CommandItem } from '~ui';
import { PLATFORM_KEYS, SCOPE_GROUPS, scopeLabel, scopeShortLabel, type PlatformKey } from './scopes';
import type { ScopeStatus } from './automationsStore';

export type AutomationsCommandId =
  'new' | 'undo' | 'save' | 'search' | 'ai.on' | 'ai.off' | 'refresh' | 'shortcuts' | 'scope' | 'preview.restart';

export interface AutomationsCommandScope {
  scope: FuelyAutomationScope;
  status: ScopeStatus;
  rules: number;
  connected: boolean;
}

export interface AutomationsCommandContext {
  scope: FuelyAutomationScope;
  /** True while the Test panel has a live session to restart. */
  previewActive: boolean;
  aiOn: boolean | null;
  undoLabel: string | null;
  dirtyCount: number;
  canEdit: boolean;
  scopes: readonly AutomationsCommandScope[];
}

export interface AutomationsCommandHandlers {
  goScope: (scope: FuelyAutomationScope) => void;
  newRule: () => void;
  undo: () => void;
  saveAll: () => void;
  focusSearch: () => void;
  setAi: (on: boolean) => void;
  refresh: () => void;
  openShortcuts: () => void;
  restartPreview: () => void;
}

export type AutomationsCommandIcons = Partial<Record<AutomationsCommandId, ReactNode>> & {
  /** The five channel glyphs — a `scope.*` item carries its platform's; `scope` is the fallback (the All scope). */
  platforms?: Partial<Record<PlatformKey, ReactNode>>;
};

export function buildCommandGroups(
  context: AutomationsCommandContext,
  handlers: AutomationsCommandHandlers,
  icons: AutomationsCommandIcons = {},
): CommandGroup[] {
  const groups: CommandGroup[] = [];
  const actions: CommandItem[] = [];

  if (context.canEdit) {
    actions.push({
      id: 'new',
      label: 'New rule',
      description: 'A custom automation on a source that accepts them',
      keywords: ['create', 'add', 'automation', 'custom'],
      shortcut: ['n'],
      icon: icons.new,
      onSelect: handlers.newRule,
    });
  }
  if (context.undoLabel !== null) {
    actions.push({
      id: 'undo',
      label: context.undoLabel,
      keywords: ['revert', 'back', 'mistake'],
      shortcut: ['mod', 'z'],
      icon: icons.undo,
      onSelect: handlers.undo,
    });
  }
  if (context.dirtyCount > 0) {
    actions.push({
      id: 'save',
      label: context.dirtyCount === 1 ? 'Save the unsaved draft' : `Save ${context.dirtyCount} unsaved drafts`,
      keywords: ['drafts', 'unsaved', 'commit'],
      shortcut: ['mod', 's'],
      icon: icons.save,
      onSelect: handlers.saveAll,
    });
  }
  actions.push({
    id: 'search',
    label: 'Search the sources',
    description: 'The search box above the rail',
    keywords: ['find', 'filter', 'sources', 'rail'],
    shortcut: ['/'],
    icon: icons.search,
    onSelect: handlers.focusSearch,
  });
  if (context.canEdit && context.previewActive) {
    actions.push({
      id: 'preview.restart',
      label: 'Restart the test conversation',
      keywords: ['reset', 'new session', 'preview', 'playground'],
      icon: icons['preview.restart'],
      onSelect: handlers.restartPreview,
    });
  }
  if (context.canEdit && context.aiOn !== null) {
    actions.push(
      context.aiOn
        ? {
            id: 'ai.off',
            label: 'Turn the AI off',
            description: 'Turns off the Default (All channels) automation',
            keywords: ['disable', 'pause', 'stop'],
            icon: icons['ai.off'],
            onSelect: () => handlers.setAi(false),
          }
        : {
            id: 'ai.on',
            label: 'Turn the AI on',
            description: 'Turns on the Default (All channels) automation',
            keywords: ['enable', 'start'],
            icon: icons['ai.on'],
            onSelect: () => handlers.setAi(true),
          },
    );
  }
  actions.push({
    id: 'refresh',
    label: 'Refresh',
    keywords: ['reload', 'refetch'],
    shortcut: ['r'],
    icon: icons.refresh,
    onSelect: handlers.refresh,
  });
  actions.push({
    id: 'shortcuts',
    label: 'Keyboard shortcuts',
    keywords: ['keys', 'help', 'cheat sheet'],
    shortcut: ['?'],
    icon: icons.shortcuts,
    onSelect: handlers.openShortcuts,
  });
  groups.push({ id: 'actions', label: 'Actions', items: actions });

  const scopeItems: CommandItem[] = context.scopes
    .filter((s) => s.scope !== context.scope)
    .map((s) => {
      const group = SCOPE_GROUPS.find((g) => g.scopes.includes(s.scope));
      const platform = group?.platform ?? null;
      const key = platform ? PLATFORM_KEYS[platform] : null;
      const status = s.status === 'on' ? 'On' : s.status === 'off' ? 'Off' : '';
      const bits = [
        status,
        s.rules ? `${s.rules} ${s.rules === 1 ? 'rule' : 'rules'}` : null,
        s.connected ? null : 'not connected',
      ].filter(Boolean);
      return {
        id: `scope.${s.scope}`,
        label: s.scope === 'All' ? 'Default · All channels' : scopeLabel(s.scope),
        description: bits.join(' · ') || undefined,
        keywords: [
          platform ?? '',
          key ?? '',
          scopeShortLabel(s.scope),
          'source',
          'channel',
          'scope',
          s.status === 'on' ? 'on' : s.status === 'off' ? 'off' : '',
        ].filter(Boolean),
        icon: (key ? icons.platforms?.[key] : undefined) ?? icons.scope,
        onSelect: () => handlers.goScope(s.scope),
      };
    });
  groups.push({ id: 'scopes', label: 'Open a source', items: scopeItems });

  return groups;
}

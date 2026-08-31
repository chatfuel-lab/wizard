import { useCallback, useMemo, useState, type RefObject } from 'react';
import type { Platform, SalesStageV2 } from '~api/generated/contacts/graphql';
import { useHotkeys } from '~ui';
import { useContactsUndo } from '../ContactsUndoContext';
import type { TeamMember } from '../types';
import type { ContactsCommandContext, ContactsCommandHandlers } from '../lib/commands';
import { EMPTY_FILTER, type AssigneeFilterKey, type ContactsFilter } from '../lib/contactsFilter';
import type { ContactsParams, ContactsView, Density } from '../lib/contactsParams';
import { describeSavedView, type SavedView } from '../lib/savedViews';
import { WORKSPACE_BINDINGS, type WorkspaceShortcutId } from '../lib/shortcuts';
import type { ContactsUrlApi } from './useContactsUrl';

export interface ContactsCommandsArgs {
  rootRef: RefObject<HTMLDivElement | null>;
  parsed: ContactsParams;
  filter: ContactsFilter;
  write: ContactsUrlApi['write'];
  setFilter: (next: ContactsFilter) => void;
  setView: (view: ContactsView) => void;
  closeContact: () => void;
  applySavedView: (id: string) => void;
  refresh: () => void;
  team: TeamMember[];
  savedViews: SavedView[];
  appliedView: SavedView | null;
}

export interface ContactsCommandsApi {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  commandContext: ContactsCommandContext;
  commandHandlers: ContactsCommandHandlers;
}

/**
 * The keyboard and the palette: what the commands can see, what they can do,
 * and the workspace shortcuts that reach the same handlers. Binds `useHotkeys`
 * itself, so mounting this hook IS enabling the module's keyboard.
 */
export function useContactsCommands({
  rootRef,
  parsed,
  filter,
  write,
  setFilter,
  setView,
  closeContact,
  applySavedView,
  refresh,
  team,
  savedViews,
  appliedView,
}: ContactsCommandsArgs): ContactsCommandsApi {
  const undo = useContactsUndo();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  /**
   * The search box belongs to the list, and `ContactsViewProps` is frozen — so
   * the `/` shortcut and the palette's "Search contacts" reach it through the
   * DOM rather than through a sixteenth prop. `data-contacts-search` is the
   * contract, and both callers only offer the command where the box exists.
   */
  const focusSearch = useCallback(() => {
    const input = rootRef.current?.querySelector<HTMLInputElement>('[data-contacts-search]');
    input?.focus();
    input?.select();
  }, [rootRef]);

  const commandContext: ContactsCommandContext = useMemo(
    () => ({
      view: parsed.view,
      filter,
      density: parsed.density,
      undoLabel: undo.entry?.label ?? null,
      recordOpen: parsed.contact !== null,
      teammates: team.map((member) => ({
        userAccountId: member.user.id,
        name: member.user.name,
      })),
      savedViews: savedViews.map((view) => ({
        id: view.id,
        name: view.name,
        description: describeSavedView(view),
      })),
      appliedViewId: appliedView?.id ?? null,
    }),
    [parsed.view, parsed.density, parsed.contact, filter, undo.entry, team, savedViews, appliedView],
  );

  const commandHandlers: ContactsCommandHandlers = useMemo(
    () => ({
      setView,
      setAssignee: (assignee: AssigneeFilterKey) => setFilter({ ...filter, assignee }),
      setStages: (stages: SalesStageV2[]) => setFilter({ ...filter, stages }),
      setPlatforms: (platforms: Platform[]) => setFilter({ ...filter, platforms }),
      setUnreadOnly: (unreadOnly: boolean) => setFilter({ ...filter, unreadOnly }),
      setDensity: (density: Density) => write({ density }),
      clearFilter: () => setFilter(EMPTY_FILTER),
      focusSearch,
      refresh,
      undo: undo.run,
      openShortcuts: () => setShortcutsOpen(true),
      closeRecord: closeContact,
      applySavedView,
    }),
    [setView, setFilter, filter, write, focusSearch, refresh, undo.run, closeContact, applySavedView],
  );

  const onShortcut = useCallback(
    (id: WorkspaceShortcutId) => {
      switch (id) {
        case 'palette':
          return setPaletteOpen((open) => !open);
        case 'help':
          return setShortcutsOpen(true);
        case 'search':
          if (parsed.view !== 'list' || parsed.contact !== null) setView('list');
          /* One frame, so the input exists if the surface just changed. */
          return void requestAnimationFrame(focusSearch);
        case 'undo':
          return undo.run();
        case 'refresh':
          return refresh();
        case 'closeRecord':
          if (parsed.contact !== null) closeContact();
          return;
        case 'goList':
          return setView('list');
        case 'goFields':
          return setView('fields');
        case 'goAudience':
          return setView('audience');
      }
    },
    [parsed.view, parsed.contact, setView, focusSearch, undo, refresh, closeContact],
  );

  useHotkeys(WORKSPACE_BINDINGS, onShortcut, { rootRef });

  return { paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen, commandContext, commandHandlers };
}

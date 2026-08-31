import { useCallback, useMemo, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { useHotkeys } from '~ui';
import type { InboxCommandContext, InboxCommandHandlers } from '../lib/inboxCommands';
import { clearInboxFilter, isInboxFilterEmpty, type InboxFilter } from '../lib/inboxFilter';
import { neighbourChatId } from '../lib/inboxList';
import { INBOX_BINDINGS, type InboxShortcutId } from '../lib/inboxShortcuts';
import type { ChatNode } from '../types';
import type { MyRole } from './useMyRole';

export interface UseInboxCommandsOptions {
  /** The module root — what `useHotkeys` scopes focus against, and what `focusSearch` queries. */
  rootRef: RefObject<HTMLDivElement | null>;
  chats: ChatNode[];
  selectedId: string | null;
  select: (id: string) => void;
  role: MyRole;
  panelOpen: boolean;
  filter: InboxFilter;
  setFilter: Dispatch<SetStateAction<InboxFilter>>;
  /** The row the palette and the shortcuts act on — see the owner's derivation. */
  selectedChat: ChatNode | undefined;
  selectedConversation: ChatNode['conversation'] | null;
  setShowing: (pane: 'side' | 'detail') => void;
  /* The overlay actions this keyboard drives — destructured, stable. */
  paletteToggled: () => void;
  shortcutsOpened: () => void;
  flowPickerOpened: () => void;
  newConversationOpened: () => void;
  panelChosen: (choice: boolean) => void;
  assignRequested: () => void;
  takeOverRequested: () => void;
}

export interface InboxCommands {
  commandContext: InboxCommandContext;
  commandHandlers: InboxCommandHandlers;
}

/**
 * The module's keyboard: the shortcut handler, the palette's context and
 * handlers, and the `useHotkeys` binding itself — everything between a
 * keypress and the state it moves.
 */
export function useInboxCommands({
  rootRef,
  chats,
  selectedId,
  select,
  role,
  panelOpen,
  filter,
  setFilter,
  selectedChat,
  selectedConversation,
  setShowing,
  paletteToggled,
  shortcutsOpened,
  flowPickerOpened,
  newConversationOpened,
  panelChosen,
  assignRequested,
  takeOverRequested,
}: UseInboxCommandsOptions): InboxCommands {
  const focusSearch = useCallback(() => {
    const input = rootRef.current?.querySelector<HTMLInputElement>('[data-inbox-search]');
    input?.focus();
    input?.select();
  }, [rootRef]);

  const walk = useCallback(
    (step: 1 | -1) => {
      const next = neighbourChatId(
        chats.map((chat) => chat.id),
        selectedId,
        step,
      );
      if (next) select(next);
    },
    [chats, selectedId, select],
  );

  /* `a`: the panel, with focus on its assignee control. The panel is opened
     from here and the focus is the panel's own doing, keyed on the token. */
  const assign = useCallback(() => {
    if (!selectedId || !role.canViewPeople) return;
    assignRequested();
  }, [selectedId, role.canViewPeople, assignRequested]);

  const openFlowPicker = useCallback(() => {
    if (!selectedId || !role.canEdit) return;
    flowPickerOpened();
  }, [selectedId, role.canEdit, flowPickerOpened]);

  const commandContext: InboxCommandContext = useMemo(
    () => ({
      conversation: selectedConversation
        ? { status: selectedConversation.status, contactName: selectedChat?.name ?? '' }
        : null,
      canEdit: role.canEdit,
      canViewContact: role.canViewPeople,
      canEditContact: role.canEditPeople,
      contactPanelOpen: panelOpen,
      filtered: !isInboxFilterEmpty(filter),
    }),
    [selectedConversation, selectedChat?.name, role, panelOpen, filter],
  );

  const commandHandlers: InboxCommandHandlers = useMemo(
    () => ({
      closeToFlow: openFlowPicker,
      takeOver: takeOverRequested,
      assign,
      toggleContact: () => panelChosen(!panelOpen),
      newConversation: newConversationOpened,
      focusSearch,
      clearFilter: () => setFilter(clearInboxFilter),
      openShortcuts: shortcutsOpened,
    }),
    [
      openFlowPicker,
      takeOverRequested,
      assign,
      panelChosen,
      panelOpen,
      newConversationOpened,
      focusSearch,
      setFilter,
      shortcutsOpened,
    ],
  );

  const onShortcut = useCallback(
    (id: InboxShortcutId) => {
      switch (id) {
        case 'palette':
          return paletteToggled();
        case 'help':
          return shortcutsOpened();
        case 'search':
          /* Below the collapse band the list may not be on screen at all. */
          setShowing('side');
          return void requestAnimationFrame(focusSearch);
        case 'next':
          return walk(1);
        case 'prev':
          return walk(-1);
        case 'close':
          return openFlowPicker();
        case 'assign':
          return assign();
      }
    },
    [paletteToggled, shortcutsOpened, setShowing, focusSearch, walk, openFlowPicker, assign],
  );

  useHotkeys(INBOX_BINDINGS, onShortcut, { rootRef });

  return { commandContext, commandHandlers };
}

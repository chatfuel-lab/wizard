import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  Badge,
  Button,
  IconPlus,
  Kbd,
  ModuleRoot,
  PageHeader,
  ShortcutsDialog,
  SplitPane,
  ToastProvider,
  bandAtLeast,
  useBand,
} from '~ui';
import type { ModuleAppProps } from '../types';
import { usePublishScreenContext } from '../shellApi';
import { LivechatContext } from './LivechatContext';
import { useChatListStore } from './hooks/useChatListStore';
import { useChatListCount } from './hooks/useChatListCount';
import { useInboxCommands } from './hooks/useInboxCommands';
import { useInboxLocation } from './hooks/useInboxLocation';
import { useInboxOverlays } from './hooks/useInboxOverlays';
import { useMyRole } from './hooks/useMyRole';
import { useStartConversation } from './hooks/useStartConversation';
import { useUnseenCount } from './hooks/useUnseenCount';
import { ChatListPane } from './components/ChatListPane';
import { InboxCommandPalette } from './components/InboxCommandPalette';
import { NewConversationDialog } from './components/NewConversationDialog';
import { ThreadPane } from './components/ThreadPane';
import { EMPTY_INBOX_FILTER, toChatListFilter, type InboxFilter } from './lib/inboxFilter';
import { INBOX_SHORTCUT_ROWS, INBOX_SHORTCUT_SECTIONS } from './lib/inboxShortcuts';

/**
 * Embeddable root of the livechat module: two panes, client injected.
 *
 * Deep links, both read once at mount:
 * - `/livechat?c=<conversationId>` opens a conversation even when it is not
 *   in the list (ConversationMessages works by id) — this is also the safety
 *   net for seed conversations that Chatfuel keeps out of the inbox.
 * - `/livechat?contact=<contactId>` starts (or finds) a conversation with a
 *   contact and opens it. This is how another module, or the Contacts page of
 *   the dashboard, hands a person to the inbox: the inbox's own operations
 *   have no contact search, so the id has to arrive from wherever the contact
 *   was found. The param is consumed — it is an instruction, not a state.
 */
export function LivechatApp({ botId, client, params, setParams }: ModuleAppProps) {
  const context = useMemo(() => ({ client, botId }), [client, botId]);
  const { selectedId, setSelectedId, startWithContact } = useInboxLocation(params, setParams);

  /* The ref is created here because `ModuleRoot` is rendered here, and it
     forwards to the element it already observes. It is the node `useHotkeys`
     scopes focus against — keys pressed in the host application's own inputs
     stay the host's — and the one `focusSearch` queries. */
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <LivechatContext.Provider value={context}>
      <ToastProvider>
        <ModuleRoot ref={rootRef}>
          <Inner
            rootRef={rootRef}
            selectedId={selectedId}
            onSelect={setSelectedId}
            startWithContact={startWithContact}
          />
        </ModuleRoot>
      </ToastProvider>
    </LivechatContext.Provider>
  );
}

interface InnerProps {
  rootRef: RefObject<HTMLDivElement | null>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  startWithContact: string | null;
}

/**
 * Everything below the providers: the two panes, the filter and the list they
 * share, and the module's keyboard.
 *
 * The chat list is owned HERE rather than inside `ChatListPane`, because
 * three things outside that pane need it: `j`/`k` walk its order, a lifecycle
 * answer from the thread lands on one of its rows, and the palette clears its
 * filter. The pane renders what it is handed. Nothing else about the list —
 * its query, its subscription, its paging — moved; that is all still
 * `useChatListStore` over `lib/chatListStore`, one level up.
 */
function Inner({ rootRef, selectedId, onSelect, startWithContact }: InnerProps) {
  const band = useBand();
  const role = useMyRole();
  const unseen = useUnseenCount();

  const [filter, setFilter] = useState<InboxFilter>(EMPTY_INBOX_FILTER);
  const wireFilter = useMemo(() => toChatListFilter(filter), [filter]);
  const list = useChatListStore(wireFilter);
  const { count } = useChatListCount(wireFilter);

  /* What the Coworker sees when it asks what is on screen. Write-only into a
     sink the shell owns; a no-op when this module runs as an embed. */
  usePublishScreenContext({
    module: 'Inbox',
    conversations: count,
    unseen,
    filter: JSON.stringify(filter),
    openConversation: selectedId,
  });

  // Which pane is showing while the panes are stacked. This is real state, NOT
  // `selectedId ? 'detail' : 'side'`: that expression would make the back
  // control useless, because pressing it sets 'side' while selectedId is still
  // set, and the next render derives 'detail' again and throws the reader
  // straight back into the thread.
  //
  // Seeded from the selection AT MOUNT so a ?c=<id> deep link opens the thread
  // at every width — 360px included — which is the whole reason the seed reads
  // selectedId instead of defaulting to 'side'.
  const [showing, setShowing] = useState<'side' | 'detail'>(() => (selectedId ? 'detail' : 'side'));

  const select = useCallback(
    (id: string) => {
      onSelect(id);
      setShowing('detail');
    },
    [onSelect],
  );

  /* The dialogs, the panel choice and the two request counters, as one
     reducer — the rules about them live in `lib/inboxOverlays.ts`. */
  const {
    paletteOpen,
    shortcutsOpen,
    flowPickerOpen,
    newConversationOpen,
    panelChoice,
    assignRequest,
    takeOverRequest,
    paletteToggled,
    paletteOpened,
    paletteClosed,
    shortcutsOpened,
    shortcutsClosed,
    flowPickerOpened,
    flowPickerClosed,
    newConversationOpened,
    newConversationClosed,
    panelChosen,
    assignRequested,
    takeOverRequested,
    conversationSwitched,
  } = useInboxOverlays();

  /* `null` means "follow the layout", which is where the panel starts: an
     inline column at 1280 and up, and closed below that, because below that it
     is a Drawer and a Drawer that opens itself sits on top of the thread the
     operator came to read. The moment they press the button it becomes their
     decision and stops following anything — a preference that silently reverts
     when a window is resized is worse than one that persists where it was not
     wanted. */
  const panelOpen = role.canViewPeople && (panelChoice ?? bandAtLeast(band, 'inline'));

  /* What a switch closes is the reducer's rule, not this component's. */
  useEffect(() => conversationSwitched(), [selectedId, conversationSwitched]);

  /* The row the palette and the shortcuts act on. Held here rather than read
     out of the thread: the thread's `conversation` is the loaded record and is
     null for a beat on every switch, and a status read from the LIST row is
     current the moment a lifecycle answer lands on it. */
  const selectedChat = selectedId ? list.chats.find((chat) => chat.id === selectedId) : undefined;
  const selectedConversation = selectedChat?.conversation ?? null;

  const createConversation = useStartConversation(select, list.refetch, startWithContact, newConversationClosed);

  const { commandContext, commandHandlers } = useInboxCommands({
    rootRef,
    chats: list.chats,
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
  });

  return (
    <>
      {/* The module names itself. It has to: as an embed there is no shell
          chrome above this line at all, and even inside the shell the nav rail
          is a drawer below the collapse breakpoint — so on a phone this header
          is the only thing on screen that says which module you are in.

          A row of height is expensive in a chat UI, so the only thing riding
          along with the title is the one number that is about the inbox as a
          whole rather than about any one conversation. Badge renders nothing at
          zero, so a quiet inbox pays no visual cost for the slot. */}
      <PageHeader
        title="Inbox"
        meta={<Badge count={unseen} />}
        actions={
          <>
            {role.canEdit ? (
              <Button size="sm" variant="ghost" onClick={newConversationOpened}>
                <IconPlus size={14} />
                New
              </Button>
            ) : null}
            {/* Hidden in the smallest band, as in Deals: ⌘K is not a phone
                control, and every other way in still works. */}
            <button
              type="button"
              onClick={paletteOpened}
              aria-label="Open the command palette"
              className="hidden items-center gap-1.5 rounded-control border border-border px-2 py-1 text-xs text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring @compact:inline-flex"
            >
              Commands
              <Kbd keys={['mod', 'k']} />
            </button>
          </>
        }
      />
      <SplitPane
        side={
          <ChatListPane
            selectedId={selectedId}
            onSelect={select}
            filter={filter}
            onFilterChange={setFilter}
            resetToken={wireFilter}
            list={list}
            count={count}
          />
        }
        sideWidth="list"
        sideLabel="Conversations"
        collapseBelow="wide"
        showing={showing}
        onShowingChange={setShowing}
      >
        <ThreadPane
          conversationId={selectedId}
          canEdit={role.canEdit}
          canViewContact={role.canViewPeople}
          canEditContact={role.canEditPeople}
          panelOpen={panelOpen}
          onPanelOpenChange={panelChosen}
          assignRequest={assignRequest}
          takeOverRequest={takeOverRequest}
          flowPickerOpen={flowPickerOpen}
          onFlowPickerOpenChange={(open) => (open ? flowPickerOpened() : flowPickerClosed())}
          onConversationChanged={list.applyConversation}
          onStageChanged={list.applyStage}
        />
      </SplitPane>

      <InboxCommandPalette
        open={paletteOpen}
        onClose={paletteClosed}
        context={commandContext}
        handlers={commandHandlers}
      />
      {/* Rendered straight from `lib/inboxShortcuts.ts`, so the sheet cannot
          drift from the handlers — `inboxShortcuts.test.ts` pins the two sides. */}
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={shortcutsClosed}
        sections={INBOX_SHORTCUT_SECTIONS}
        rows={INBOX_SHORTCUT_ROWS}
        size="sm"
      />
      <NewConversationDialog open={newConversationOpen} onClose={newConversationClosed} onCreate={createConversation} />
    </>
  );
}

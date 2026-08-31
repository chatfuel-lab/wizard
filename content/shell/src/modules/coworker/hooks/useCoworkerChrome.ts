import { useCallback, useMemo, useState, type RefObject } from 'react';
import { useHotkeys } from '~ui';
import {
  flattenGroups,
  groupRailRows,
  railRows,
  readPrefs,
  searchRailRows,
  stepSelection,
  type RailGroup,
  type RailRow,
} from '../lib/chatListStore';
import type { CoworkerCommandContext, CoworkerCommandHandlers } from '../lib/commands';
import { WORKSPACE_BINDINGS, type ShortcutId } from '../lib/shortcuts';
import { useConversationList, type ConversationListState, type MessageSource } from './useConversationList';

/**
 * Everything the assistant's page does that is not the thread: the rail, the
 * search, the selection, the keyboard, the palette, and the sends that have to
 * create a conversation before they can go anywhere.
 *
 * It is a hook rather than a component because all of it has to sit ABOVE the
 * split — the rail and the thread both read it — and none of it renders. One
 * place answering "which conversation is open, and what does the keyboard do
 * about it" is how the rail, the palette and the keys never disagree.
 */

export interface CoworkerChromeOptions {
  /** Derived by the surface from its own source of truth: the URL, or state. */
  conversationId: string | null;
  onSelect: (conversationId: string | null) => void;
  /** Scopes the keyboard and the DOM lookups for the search box and composer. */
  rootRef: RefObject<HTMLElement | null>;
}

export interface CoworkerChrome {
  list: ConversationListState;
  /** Ranked and searched. What `j`/`k` walks and what the palette lists. */
  rows: RailRow[];
  /** Date headings, or null while a search is running. */
  groups: RailGroup[] | null;
  query: string;
  setQuery: (query: string) => void;
  /** Get a conversation to send files into, creating one if there is none. */
  ensureConversation: () => Promise<string | null>;
  /** A first message is on its way. */
  busy: boolean;
  /** Send a suggestion or a typed line, creating the conversation if needed. */
  send: (text: string, source: MessageSource) => void;
  newChat: () => void;
  /** The chat the rename sheet is open on, with what it should show. */
  renaming: { id: string; currentTitle: string; operatorTitle: string | null } | null;
  startRename: (conversationId: string) => void;
  closeRename: () => void;
  setTitle: (title: string | null) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  commandContext: CoworkerCommandContext;
  commandHandlers: CoworkerCommandHandlers;
}

export function useCoworkerChrome(options: CoworkerChromeOptions): CoworkerChrome {
  const { conversationId, onSelect, rootRef } = options;

  const list = useConversationList();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  /* Recomputed on every render, and cheap: this is tens of rows, not thousands,
     and memoising it on `list.rows` would need the rows' identity to be stable
     across an unrelated event, which it is not. */
  const decorated = railRows(list.rows);
  const rows = searchRailRows(decorated, query);
  /* No date headings over a ranked list — see `ConversationRail`. `Date.now()`
     is read here rather than held in state on purpose: "today" changing at
     midnight under an idle tab is not worth a timer, and the next event of any
     kind re-renders this. */
  const groups = query.trim() === '' ? groupRailRows(rows, Date.now()) : null;

  const selected = list.rows.find((row) => row.state.id === conversationId) ?? null;
  const prefs = selected === null ? { title: null, pinned: false } : readPrefs(selected.state);

  /**
   * Start a chat with this text. Create, send, and only then open the thread —
   * in that order, because a thread mounted onto a conversation the server has
   * not accepted a message for yet shows an empty room for as long as the round
   * trip takes, and then fills in behind the reader.
   */
  const send = useCallback(
    (text: string, source: MessageSource) => {
      if (busy || text.trim() === '') return;
      void (async () => {
        setBusy(true);
        try {
          if (conversationId !== null) {
            await list.sendMessage(conversationId, text, source);
            return;
          }
          const created = await list.createConversation();
          if (created === null) return;
          const sent = await list.sendMessage(created, text, source);
          /* Open it either way: an empty new chat with an error under it is
             still better than staying on a screen that swallowed the click. */
          onSelect(created);
          if (!sent) return;
        } finally {
          setBusy(false);
        }
      })();
    },
    [busy, conversationId, list, onSelect],
  );

  /**
   * A conversation to send files into, made only if one is needed.
   *
   * The composer calls this when the operator sends an attachment from an empty
   * screen. It creates and selects, so the thread they are looking at is the
   * one the file lands in — and it is called at send time rather than at pick
   * time, so staging a file and changing your mind leaves nothing behind.
   */
  const ensureConversation = useCallback(async (): Promise<string | null> => {
    if (conversationId !== null) return conversationId;
    const created = await list.createConversation();
    if (created !== null) onSelect(created);
    return created;
  }, [conversationId, list, onSelect]);

  /* "New chat" does NOT create one. A conversation with no messages is a real
     row on the account that then has to be filtered back out (guide.md), and
     clicking the button three times would leave three of them.
     Clearing the selection shows an empty thread; the first message creates it. */
  const newChat = useCallback(() => {
    setQuery('');
    onSelect(null);
  }, [onSelect]);

  const focusSearch = useCallback(() => {
    const input = rootRef.current?.querySelector<HTMLInputElement>('[data-coworker-search]');
    input?.focus();
    input?.select();
  }, [rootRef]);

  /* The composer belongs to another part of this module and has no ref out of
     it, so this reaches for it the way bookings reaches for its search box: a
     DOM query scoped to the surface root. The contract is "a surface has one
     message box, and it is a textarea". */
  const focusComposer = useCallback(() => {
    rootRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
  }, [rootRef]);

  const step = useCallback(
    (delta: 1 | -1) => {
      const next = stepSelection(groups === null ? rows : flattenGroups(groups), conversationId, delta);
      if (next !== null) onSelect(next);
    },
    [groups, rows, conversationId, onSelect],
  );

  const renamingRow = decorated.find((row) => row.state.id === renamingId) ?? null;
  const renaming =
    renamingRow === null
      ? null
      : {
          id: renamingRow.state.id,
          currentTitle: renamingRow.title,
          operatorTitle: readPrefs(renamingRow.state).title,
        };

  const startRename = useCallback((id: string) => setRenamingId(id), []);
  const closeRename = useCallback(() => setRenamingId(null), []);
  const setTitle = useCallback(
    (title: string | null) => {
      if (renamingId !== null) list.setTitle(renamingId, title);
    },
    [list, renamingId],
  );

  /* Built plainly, not memoised. `decorated` is a fresh array on every render
     by construction, so any dependency list honest enough to be correct would
     also change on every render — a memo here would be a comment claiming a
     saving it does not make. The palette rebuilds twenty objects; that is
     cheaper than the machinery to avoid it. */
  const commandContext: CoworkerCommandContext = {
    conversationId,
    pinned: prefs.pinned,
    chats: decorated.map((row) => ({
      id: row.state.id,
      title: row.title,
      pinned: row.pinned,
      unread: row.state.unreadMessagesCountFromAssistant,
      working: row.state.isAgentLoopActive,
      waiting: row.state.pendingAction !== null,
    })),
  };

  const commandHandlers: CoworkerCommandHandlers = useMemo(
    () => ({
      newChat,
      openChat: (id: string) => onSelect(id),
      focusSearch,
      focusComposer,
      step,
      setPinned: (pinned: boolean) => {
        if (conversationId !== null) list.setPinned(conversationId, pinned);
      },
      rename: () => {
        if (conversationId !== null) setRenamingId(conversationId);
      },
      ask: (text: string) => send(text, 'suggestion'),
      openShortcuts: () => setShortcutsOpen(true),
    }),
    [newChat, onSelect, focusSearch, focusComposer, step, conversationId, list, send],
  );

  const onShortcut = useCallback(
    (id: ShortcutId) => {
      switch (id) {
        case 'palette':
          return setPaletteOpen((open) => !open);
        case 'help':
          return setShortcutsOpen(true);
        case 'newChat':
          return newChat();
        case 'search':
          return focusSearch();
        case 'nextChat':
          return step(1);
        case 'prevChat':
          return step(-1);
        case 'focusComposer':
          return focusComposer();
      }
    },
    [newChat, focusSearch, step, focusComposer],
  );

  useHotkeys(WORKSPACE_BINDINGS, onShortcut, { rootRef });

  return {
    list,
    rows,
    groups,
    query,
    setQuery,
    busy,
    send,
    ensureConversation,
    newChat,
    renaming,
    startRename,
    closeRename,
    setTitle,
    paletteOpen,
    setPaletteOpen,
    shortcutsOpen,
    setShortcutsOpen,
    commandContext,
    commandHandlers,
  };
}

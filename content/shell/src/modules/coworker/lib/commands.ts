/**
 * What the ⌘K palette offers, as data.
 *
 * **Surface-scoped on purpose** (deals' rule): every command acts on state the
 * surface already owns — which conversation is open, which chats are loaded.
 * Nothing reaches into the thread, and nothing here sends a mutation; the
 * handlers do.
 *
 * Pure, so "which commands appear in which state" is a test rather than a thing
 * somebody notices missing on screen. Icons come in as a map from the
 * component, because a `.ts` cannot render one and moving the rules into a
 * `.tsx` to carry ten of them would take them out of the suite.
 *
 * Two groups: what you can do here, and which chat to open. There was a third —
 * the server's own suggestion cards, offered as "type three letters, press
 * Enter" — and it went with the feature. Those asks named one company's
 * products, which is not something a general assistant's palette should be
 * quietly full of.
 */
import type { ReactNode } from 'react';
import type { CommandGroup, CommandItem } from '~ui';

export type CoworkerCommandId =
  'newChat' | 'search' | 'focusComposer' | 'nextChat' | 'prevChat' | 'pin' | 'unpin' | 'rename' | 'shortcuts';

export interface CoworkerCommandChat {
  id: string;
  /** Already decided by `titles.ts` — the palette never re-derives a name. */
  title: string;
  pinned: boolean;
  unread: number;
  /** The agent loop is running in it. */
  working: boolean;
  /** It is blocked on the operator: an approval, or a rejected message. */
  waiting: boolean;
}

export interface CoworkerCommandContext {
  /** The open conversation, or null on an empty one. */
  conversationId: string | null;
  /** Is the open conversation pinned. */
  pinned: boolean;
  /** Every chat the rail can reach, in display order. */
  chats: readonly CoworkerCommandChat[];
}

export interface CoworkerCommandHandlers {
  newChat: () => void;
  openChat: (id: string) => void;
  focusSearch: () => void;
  focusComposer: () => void;
  step: (delta: 1 | -1) => void;
  setPinned: (pinned: boolean) => void;
  rename: () => void;
  /** Send a card's text — a new chat when there is none open. */
  ask: (text: string) => void;
  openShortcuts: () => void;
}

export type CoworkerCommandIcons = Partial<Record<CoworkerCommandId, ReactNode>> & {
  /** One glyph per row of the "Open a chat" group, pinned rows apart. */
  chat?: ReactNode;
  chatPinned?: ReactNode;
};

/** "2 unread · working" — the bits of a chat's state worth a palette row. */
function describeChat(chat: CoworkerCommandChat): string | undefined {
  const bits = [
    chat.waiting ? 'waiting for you' : null,
    chat.working ? 'working' : null,
    chat.unread > 0 ? `${chat.unread} unread` : null,
    chat.pinned ? 'pinned' : null,
  ].filter((bit): bit is string => bit !== null);
  return bits.length > 0 ? bits.join(' · ') : undefined;
}

export function buildCommandGroups(
  context: CoworkerCommandContext,
  handlers: CoworkerCommandHandlers,
  icons: CoworkerCommandIcons = {},
): CommandGroup[] {
  const groups: CommandGroup[] = [];
  const actions: CommandItem[] = [];

  actions.push({
    id: 'newChat',
    label: 'New chat',
    description: 'Start an empty thread',
    keywords: ['start', 'create', 'blank', 'conversation'],
    shortcut: ['n'],
    icon: icons.newChat,
    onSelect: handlers.newChat,
  });

  if (context.conversationId !== null) {
    actions.push(
      context.pinned
        ? {
            id: 'unpin',
            label: 'Unpin this chat',
            description: 'It rejoins the list in date order',
            keywords: ['pin', 'unstick', 'top'],
            icon: icons.unpin,
            onSelect: () => handlers.setPinned(false),
          }
        : {
            id: 'pin',
            label: 'Pin this chat',
            description: 'Keeps it at the top of the list',
            keywords: ['stick', 'top', 'favourite', 'favorite'],
            icon: icons.pin,
            onSelect: () => handlers.setPinned(true),
          },
    );
    actions.push({
      id: 'rename',
      label: 'Rename this chat',
      /* Worth saying in the palette: the name is account state, not a local
         nickname, and the assistant reads the same map. */
      description: 'Your own name for it, stored with the conversation',
      keywords: ['title', 'name', 'label'],
      icon: icons.rename,
      onSelect: handlers.rename,
    });
  }

  actions.push({
    id: 'focusComposer',
    label: 'Write a message',
    keywords: ['type', 'compose', 'ask', 'message'],
    shortcut: ['c'],
    icon: icons.focusComposer,
    onSelect: handlers.focusComposer,
  });

  actions.push({
    id: 'search',
    label: 'Search your chats',
    description: 'The chats already loaded',
    keywords: ['find', 'filter', 'list'],
    shortcut: ['/'],
    icon: icons.search,
    onSelect: handlers.focusSearch,
  });

  if (context.chats.length > 1) {
    actions.push({
      id: 'nextChat',
      label: 'Next chat',
      keywords: ['down', 'forward'],
      shortcut: ['j'],
      icon: icons.nextChat,
      onSelect: () => handlers.step(1),
    });
    actions.push({
      id: 'prevChat',
      label: 'Previous chat',
      keywords: ['up', 'back'],
      shortcut: ['k'],
      icon: icons.prevChat,
      onSelect: () => handlers.step(-1),
    });
  }

  actions.push({
    id: 'shortcuts',
    label: 'Keyboard shortcuts',
    keywords: ['keys', 'help', 'cheat sheet'],
    shortcut: ['?'],
    icon: icons.shortcuts,
    onSelect: handlers.openShortcuts,
  });

  groups.push({ id: 'actions', label: 'Actions', items: actions });

  const chatItems: CommandItem[] = context.chats
    .filter((chat) => chat.id !== context.conversationId)
    .map((chat) => ({
      id: `chat.${chat.id}`,
      label: chat.title,
      description: describeChat(chat),
      keywords: ['chat', 'conversation', 'thread'],
      icon: chat.pinned ? (icons.chatPinned ?? icons.chat) : icons.chat,
      onSelect: () => handlers.openChat(chat.id),
    }));
  if (chatItems.length > 0) groups.push({ id: 'chats', label: 'Open a chat', items: chatItems });

  return groups;
}

/**
 * What the inbox's ⌘K palette offers, as data.
 *
 * Every command here acts on state `LivechatApp` already owns — which
 * conversation is open, whether the contact panel is showing, the filter — or
 * on the open conversation through the same handlers the header buttons and
 * the single-letter shortcuts use. Nothing reaches into the thread: the palette
 * is a second door to the same rooms, and a command with no button and no key
 * of its own would be a room with only one door, which is how things quietly
 * become unreachable on a phone.
 *
 * Pure, so "which commands appear in which state" is a test rather than a
 * component to click through. Icons come in as a map from the component: a
 * `.ts` file cannot render JSX, and turning this into a `.tsx` to hold six
 * icons would take the rules out of the test suite.
 */
import type { CommandGroup, CommandItem } from '~ui';
import type { ReactNode } from 'react';
import { ConversationStatus } from '~api/generated/livechat/graphql';

export type InboxCommandId =
  'close' | 'takeOver' | 'assign' | 'contact' | 'newConversation' | 'search' | 'filter.clear' | 'shortcuts';

export interface InboxCommandConversation {
  status: ConversationStatus;
  /** Who the conversation is with — the descriptions name them. */
  contactName: string;
}

export interface InboxCommandContext {
  /** The open conversation, or null when the thread pane is empty. */
  conversation: InboxCommandConversation | null;
  /** Inbox: Edit — send, take over, close, start a conversation. */
  canEdit: boolean;
  /** People: View — the contact panel exists at all. */
  canViewContact: boolean;
  /** People: Edit — the assignee can be changed. */
  canEditContact: boolean;
  contactPanelOpen: boolean;
  /** Something is narrowing the list. */
  filtered: boolean;
}

export interface InboxCommandHandlers {
  closeToFlow: () => void;
  takeOver: () => void;
  assign: () => void;
  toggleContact: () => void;
  newConversation: () => void;
  focusSearch: () => void;
  clearFilter: () => void;
  openShortcuts: () => void;
}

export type InboxCommandIcons = Partial<Record<InboxCommandId, ReactNode>>;

export function buildInboxCommandGroups(
  context: InboxCommandContext,
  handlers: InboxCommandHandlers,
  icons: InboxCommandIcons = {},
): CommandGroup[] {
  const groups: CommandGroup[] = [];
  const { conversation } = context;

  /* The open conversation first: the palette is opened to DO something to it
   * far more often than to move around the inbox, and an empty query shows the
   * first group at the top. */
  if (conversation) {
    const items: CommandItem[] = [];

    /* Closed already means there is nothing to hand over. */
    if (context.canEdit && conversation.status !== ConversationStatus.Closed) {
      items.push({
        id: 'close',
        label: 'Close to a flow',
        description: `Hands ${conversation.contactName} back to the bot — you pick which flow runs`,
        keywords: ['finish', 'resolve', 'done', 'archive', 'bot', 'flow'],
        shortcut: ['e'],
        icon: icons.close,
        onSelect: handlers.closeToFlow,
      });
    }

    /* Only from `automated`: the operator already has an open one, and a
     * closed one is not the bot's to take back. */
    if (context.canEdit && conversation.status === ConversationStatus.Automated) {
      items.push({
        id: 'takeOver',
        label: 'Take over',
        description: 'The bot stops answering; you do',
        keywords: ['human', 'start', 'reply'],
        icon: icons.takeOver,
        onSelect: handlers.takeOver,
      });
    }

    if (context.canEditContact) {
      items.push({
        id: 'assign',
        label: 'Assign',
        description: 'To a teammate, to Fuely AI, or to nobody',
        keywords: ['owner', 'assignee', 'teammate', 'agent'],
        shortcut: ['a'],
        icon: icons.assign,
        onSelect: handlers.assign,
      });
    }

    if (context.canViewContact) {
      items.push({
        id: 'contact',
        label: context.contactPanelOpen ? 'Hide contact details' : 'Show contact details',
        keywords: ['panel', 'person', 'note', 'attributes', 'profile'],
        icon: icons.contact,
        onSelect: handlers.toggleContact,
      });
    }

    if (items.length > 0) groups.push({ id: 'conversation', label: 'This conversation', items });
  }

  const inbox: CommandItem[] = [];

  if (context.canEdit) {
    inbox.push({
      id: 'newConversation',
      label: 'New conversation',
      description: 'Start a thread with a contact who has not written in',
      keywords: ['create', 'start', 'compose', 'contact'],
      icon: icons.newConversation,
      onSelect: handlers.newConversation,
    });
  }

  inbox.push({
    id: 'search',
    label: 'Search conversations',
    description: 'By name or phone, on the server',
    keywords: ['find', 'filter', 'name', 'phone'],
    shortcut: ['/'],
    icon: icons.search,
    onSelect: handlers.focusSearch,
  });

  if (context.filtered) {
    inbox.push({
      id: 'filter.clear',
      label: 'Clear all filters',
      keywords: ['reset', 'show everything'],
      icon: icons['filter.clear'],
      onSelect: handlers.clearFilter,
    });
  }

  inbox.push({
    id: 'shortcuts',
    label: 'Keyboard shortcuts',
    keywords: ['keys', 'help', 'cheat sheet'],
    shortcut: ['?'],
    icon: icons.shortcuts,
    onSelect: handlers.openShortcuts,
  });

  groups.push({ id: 'inbox', label: 'Inbox', items: inbox });

  return groups;
}

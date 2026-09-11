import { describe, expect, it } from 'vitest';
import { ConversationStatus } from '~api/generated/contacts/graphql';
import type { MenuAction, MenuItem } from '~ui';
import type { ContactRow } from '../../types';
import { buildRowMenu, type RowMenuOptions } from './rowMenu';

function row(over: Partial<ContactRow> = {}): ContactRow {
  return {
    __typename: 'WhatsappContact',
    phone: '+4915112345678',
    id: 'c1',
    name: 'Anna Koch',
    profilePictureUrl: null,
    updatedAt: '2026-08-18T10:00:00.000Z',
    note: null,
    salesStageV2: null,
    lastSalesStageUpdateTime: null,
    lastConversationMessageTime: null,
    unreadMessagesCount: 0,
    unhandledSwitchToHuman: false,
    assignee: null,
    conversation: null,
    attributes: [],
    ...over,
  } as ContactRow;
}

/* The two contacts this menu has to tell apart: one the bot has talked to, and
   one that arrived through an import and has no conversation to open. */
const chatted = row({
  conversation: { __typename: 'Conversation', id: 'c1', status: ConversationStatus.Open },
});
const silent = row({ id: 'c2', name: 'Imported row', conversation: null });

function menu(over: Partial<RowMenuOptions> = {}): MenuItem[] {
  return buildRowMenu({
    targets: [chatted],
    canEdit: true,
    team: [],
    onOpen: () => undefined,
    onLiveChat: () => undefined,
    onCopy: () => undefined,
    onLink: () => undefined,
    onAction: () => undefined,
    ...over,
  });
}

const chatEntry = (items: MenuItem[]): MenuAction | null => {
  const found = items.find((item) => item.id === 'livechat');
  return found && 'onSelect' in found ? found : null;
};

describe('the contacts row menu', () => {
  it('opens the conversation of a contact who has one, and hands the row back', () => {
    const opened: ContactRow[] = [];
    const entry = chatEntry(menu({ onLiveChat: (target) => opened.push(target) }));
    expect(entry?.label).toBe('Open in Inbox');
    entry?.onSelect();
    expect(opened).toEqual([chatted]);
  });

  it('offers to start one for a contact who has never messaged', () => {
    expect(chatEntry(menu({ targets: [silent] }))?.label).toBe('Start a chat');
  });

  it('drops the entry for a multi-row selection — the inbox opens one thread', () => {
    expect(chatEntry(menu({ targets: [chatted, silent] }))).toBeNull();
  });

  it('keeps it for a read-only user, whose stage and owner sections are gone', () => {
    const items = menu({ targets: [silent], canEdit: false });
    expect(chatEntry(items)?.label).toBe('Start a chat');
    expect(items.some((item) => item.id === 'label-stage' || item.id === 'label-owner')).toBe(false);
  });
});

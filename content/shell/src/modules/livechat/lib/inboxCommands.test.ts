import { describe, expect, it, vi } from 'vitest';
import { ConversationStatus } from '~api/generated/livechat/graphql';
import { buildInboxCommandGroups, type InboxCommandContext, type InboxCommandHandlers } from './inboxCommands';
import { INBOX_BINDINGS } from './inboxShortcuts';

const handlers = (): InboxCommandHandlers => ({
  closeToFlow: vi.fn(),
  takeOver: vi.fn(),
  assign: vi.fn(),
  toggleContact: vi.fn(),
  newConversation: vi.fn(),
  focusSearch: vi.fn(),
  clearFilter: vi.fn(),
  openShortcuts: vi.fn(),
});

const context = (over: Partial<InboxCommandContext> = {}): InboxCommandContext => ({
  conversation: { status: ConversationStatus.Open, contactName: 'Maria' },
  canEdit: true,
  canViewContact: true,
  canEditContact: true,
  contactPanelOpen: false,
  filtered: false,
  ...over,
});

const build = (over: Partial<InboxCommandContext> = {}) => buildInboxCommandGroups(context(over), handlers());

const ids = (groups: ReturnType<typeof build>) => groups.flatMap((group) => group.items.map((item) => item.id));

const item = (groups: ReturnType<typeof build>, id: string) =>
  groups.flatMap((group) => group.items).find((entry) => entry.id === id);

describe('the open conversation', () => {
  it('has no commands at all when nothing is open', () => {
    const groups = build({ conversation: null });
    expect(groups.map((group) => group.id)).toEqual(['inbox']);
  });

  it('offers close to a flow while there is something to hand over, and not once closed', () => {
    expect(ids(build())).toContain('close');
    expect(ids(build({ conversation: { status: ConversationStatus.Automated, contactName: 'M' } }))).toContain('close');
    expect(ids(build({ conversation: { status: ConversationStatus.Closed, contactName: 'M' } }))).not.toContain(
      'close',
    );
  });

  it('offers take over from automated only', () => {
    expect(ids(build({ conversation: { status: ConversationStatus.Automated, contactName: 'M' } }))).toContain(
      'takeOver',
    );
    expect(ids(build())).not.toContain('takeOver');
    expect(ids(build({ conversation: { status: ConversationStatus.Closed, contactName: 'M' } }))).not.toContain(
      'takeOver',
    );
  });

  it('names the contact in the close description, because that is who goes back to the bot', () => {
    expect(item(build(), 'close')?.description).toContain('Maria');
  });

  it('withholds close and take over without Inbox: Edit', () => {
    const groups = build({ canEdit: false, conversation: { status: ConversationStatus.Automated, contactName: 'M' } });
    expect(ids(groups)).not.toContain('close');
    expect(ids(groups)).not.toContain('takeOver');
  });

  it('offers assign only with People: Edit, and the panel only with People: View', () => {
    expect(ids(build({ canEditContact: false }))).not.toContain('assign');
    expect(ids(build({ canViewContact: false, canEditContact: false }))).not.toContain('contact');
    expect(ids(build())).toEqual(expect.arrayContaining(['assign', 'contact']));
  });

  it('says whether the contact panel will show or hide', () => {
    expect(item(build({ contactPanelOpen: false }), 'contact')?.label).toBe('Show contact details');
    expect(item(build({ contactPanelOpen: true }), 'contact')?.label).toBe('Hide contact details');
  });
});

describe('the inbox', () => {
  it('always offers search and the cheat sheet', () => {
    for (const groups of [build(), build({ conversation: null, canEdit: false })]) {
      expect(ids(groups)).toEqual(expect.arrayContaining(['search', 'shortcuts']));
    }
  });

  it('offers a new conversation only to someone who can write', () => {
    expect(ids(build())).toContain('newConversation');
    expect(ids(build({ canEdit: false }))).not.toContain('newConversation');
  });

  it('offers clearing the filter only while one is narrowing the list', () => {
    expect(ids(build())).not.toContain('filter.clear');
    expect(ids(build({ filtered: true }))).toContain('filter.clear');
  });
});

describe('the palette and the key map agree', () => {
  it('shows exactly the key the binding list registers for a command that has one', () => {
    /* A palette row that advertises `e` while the binding is on `x` teaches
       the wrong key. Every shortcut printed on a command must be a binding. */
    const keyOf = new Map(INBOX_BINDINGS.map((binding) => [binding.id, binding.keys]));
    const expectations: [string, string][] = [
      ['close', keyOf.get('close')!],
      ['assign', keyOf.get('assign')!],
      ['search', keyOf.get('search')!],
      ['shortcuts', keyOf.get('help')!],
    ];
    const groups = build();
    for (const [id, keys] of expectations) {
      expect(item(groups, id)?.shortcut?.join('+')).toBe(keys);
    }
  });

  it('runs the handler it names', () => {
    const h = handlers();
    const groups = buildInboxCommandGroups(context({ filtered: true }), h);
    for (const entry of groups.flatMap((group) => group.items)) entry.onSelect();
    expect(h.closeToFlow).toHaveBeenCalledOnce();
    expect(h.assign).toHaveBeenCalledOnce();
    expect(h.toggleContact).toHaveBeenCalledOnce();
    expect(h.newConversation).toHaveBeenCalledOnce();
    expect(h.focusSearch).toHaveBeenCalledOnce();
    expect(h.clearFilter).toHaveBeenCalledOnce();
    expect(h.openShortcuts).toHaveBeenCalledOnce();
    expect(h.takeOver).not.toHaveBeenCalled();
  });
});

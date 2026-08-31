import { describe, expect, it } from 'vitest';
import { buildCommandGroups, type CoworkerCommandContext, type CoworkerCommandHandlers } from './commands';

const handlers = (): CoworkerCommandHandlers & { calls: string[] } => {
  const calls: string[] = [];
  const h =
    (name: string) =>
    (...args: unknown[]) =>
      void calls.push([name, ...args.map(String)].join(':'));
  return {
    calls,
    newChat: h('newChat'),
    openChat: h('openChat'),
    focusSearch: h('focusSearch'),
    focusComposer: h('focusComposer'),
    step: h('step'),
    setPinned: h('setPinned'),
    rename: h('rename'),
    ask: h('ask'),
    openShortcuts: h('openShortcuts'),
  };
};

const chat = (id: string, over: Partial<CoworkerCommandContext['chats'][number]> = {}) => ({
  id,
  title: `Chat ${id}`,
  pinned: false,
  unread: 0,
  working: false,
  waiting: false,
  ...over,
});

const context = (over: Partial<CoworkerCommandContext> = {}): CoworkerCommandContext => ({
  conversationId: 'c-1',
  pinned: false,
  chats: [chat('c-1'), chat('c-2')],
  ...over,
});

const ids = (ctx: CoworkerCommandContext) =>
  buildCommandGroups(ctx, handlers()).flatMap((group) => group.items.map((item) => item.id));

describe('buildCommandGroups', () => {
  it('always offers the things that work in every state', () => {
    expect(ids(context())).toEqual(expect.arrayContaining(['newChat', 'search', 'focusComposer', 'shortcuts']));
  });

  it('offers pin and rename only for an open conversation, and one pin at a time', () => {
    expect(ids(context())).toEqual(expect.arrayContaining(['pin', 'rename']));
    expect(ids(context())).not.toContain('unpin');
    expect(ids(context({ pinned: true }))).toContain('unpin');
    expect(ids(context({ pinned: true }))).not.toContain('pin');
    const home = ids(context({ conversationId: null }));
    expect(home).not.toContain('pin');
    expect(home).not.toContain('rename');
  });

  it('offers stepping only when there is somewhere to step', () => {
    expect(ids(context())).toEqual(expect.arrayContaining(['nextChat', 'prevChat']));
    expect(ids(context({ chats: [chat('c-1')] }))).not.toContain('nextChat');
  });

  it('lists every chat but the open one, with its state in the description', () => {
    const groups = buildCommandGroups(
      context({ chats: [chat('c-1'), chat('c-2', { unread: 2, waiting: true, pinned: true })] }),
      handlers(),
    );
    const chats = groups.find((group) => group.id === 'chats')!;
    expect(chats.items.map((item) => item.id)).toEqual(['chat.c-2']);
    expect(chats.items[0]!.description).toBe('waiting for you · 2 unread · pinned');
  });

  it('drops the chats group entirely when there is nothing else to open', () => {
    const groups = buildCommandGroups(context({ chats: [chat('c-1')] }), handlers());
    expect(groups.some((group) => group.id === 'chats')).toBe(false);
  });

  it('wires the steppers to a direction, not to an id', () => {
    const handler = handlers();
    const groups = buildCommandGroups(context(), handler);
    const items = groups[0]!.items;
    items.find((item) => item.id === 'nextChat')!.onSelect();
    items.find((item) => item.id === 'prevChat')!.onSelect();
    expect(handler.calls).toEqual(['step:1', 'step:-1']);
  });
});

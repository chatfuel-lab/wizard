import { describe, expect, it, vi } from 'vitest';
import type { EventSetView } from '../types';
import { buildCommands, type CommandHandlers, type CommandInput } from './commands';
import { TRIGGERS } from './eventKinds';

const view = (id: string, isBase = false): EventSetView => ({
  id,
  isBase,
  name: isBase ? null : id,
  enabled: true,
  updatedAt: '2026-08-21T00:00:00.000Z',
  ads: isBase ? null : { value: [], inheritsFrom: null, canInheritFrom: [] },
  events: { value: [], inheritsFrom: null, canInheritFrom: [] },
});

const handlers = (): CommandHandlers => ({
  openSet: vi.fn(),
  newSet: vi.fn(),
  newEvent: vi.fn(),
  reload: vi.fn(),
  help: vi.fn(),
});

const input = (patch: Partial<CommandInput> = {}): CommandInput => ({
  sets: [view('base', true), view('spring')],
  activeSetId: 'base',
  canAddEvent: true,
  canCreateSet: true,
  ...patch,
});

const groupOf = (groups: ReturnType<typeof buildCommands>, id: string) => groups.find((group) => group.id === id);

describe('what the palette offers', () => {
  it('lists every set, and the base one by the name the rail shows', () => {
    const sets = groupOf(buildCommands(input(), handlers()), 'sets');
    expect(sets?.items.map((item) => item.label)).toEqual(['Default events for all ads', 'spring']);
  });

  it('finds the default set by what people call it', () => {
    const sets = groupOf(buildCommands(input(), handlers()), 'sets');
    expect(sets?.items[0]?.keywords).toEqual(['default', 'base']);
  });

  it('drops the sets group when there are none to go to', () => {
    expect(groupOf(buildCommands(input({ sets: [] }), handlers()), 'sets')).toBeUndefined();
  });

  it('offers one row per trigger, so a kind can be picked before anything opens', () => {
    const add = groupOf(buildCommands(input(), handlers()), 'add');
    expect(add?.items).toHaveLength(TRIGGERS.length);
    expect(add?.items.map((item) => item.label)).toEqual(TRIGGERS.map((trigger) => trigger.label));
  });
});

describe('what it refuses', () => {
  it('disables the set that is already open', () => {
    const sets = groupOf(buildCommands(input({ activeSetId: 'spring' }), handlers()), 'sets');
    expect(sets?.items.map((item) => item.disabled)).toEqual([false, true]);
  });

  it('disables every trigger at the event ceiling', () => {
    const add = groupOf(buildCommands(input({ canAddEvent: false }), handlers()), 'add');
    expect(add?.items.every((item) => item.disabled)).toBe(true);
  });

  it('disables creating a set at the ceiling, and nothing else in that group', () => {
    const actions = groupOf(buildCommands(input({ canCreateSet: false }), handlers()), 'actions');
    expect(actions?.items.map((item) => [item.id, item.disabled ?? false])).toEqual([
      ['new-set', true],
      ['reload', false],
      ['help', false],
    ]);
  });
});

describe('the rows run what they say', () => {
  it('opens the set it names', () => {
    const acts = handlers();
    const sets = groupOf(buildCommands(input(), acts), 'sets');
    sets?.items[1]?.onSelect();
    expect(acts.openSet).toHaveBeenCalledWith('spring');
  });

  it('passes the trigger through, so the dialog opens on the right kind', () => {
    const acts = handlers();
    const add = groupOf(buildCommands(input(), acts), 'add');
    add?.items[0]?.onSelect();
    expect(acts.newEvent).toHaveBeenCalledWith(TRIGGERS[0]?.id);
  });

  it('carries the key each action also answers to', () => {
    const actions = groupOf(buildCommands(input(), handlers()), 'actions');
    expect(actions?.items.map((item) => item.shortcut)).toEqual([['n'], ['r'], ['?']]);
  });
});

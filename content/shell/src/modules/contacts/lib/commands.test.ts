import { describe, expect, it, vi } from 'vitest';
import { Platform, SalesStageV2 } from '~api/generated/contacts/graphql';
import { ALL_PLATFORMS, EMPTY_FILTER } from './contactsFilter';
import { buildCommandGroups, type ContactsCommandContext, type ContactsCommandHandlers } from './commands';

const handlers = (): ContactsCommandHandlers => ({
  setView: vi.fn(),
  setAssignee: vi.fn(),
  setStages: vi.fn(),
  setPlatforms: vi.fn(),
  setUnreadOnly: vi.fn(),
  setDensity: vi.fn(),
  clearFilter: vi.fn(),
  focusSearch: vi.fn(),
  refresh: vi.fn(),
  undo: vi.fn(),
  openShortcuts: vi.fn(),
  closeRecord: vi.fn(),
  applySavedView: vi.fn(),
});

const context = (over: Partial<ContactsCommandContext> = {}): ContactsCommandContext => ({
  view: 'list',
  filter: EMPTY_FILTER,
  density: 'cozy',
  undoLabel: null,
  recordOpen: false,
  teammates: [],
  savedViews: [],
  appliedViewId: null,
  ...over,
});

const build = (over: Partial<ContactsCommandContext> = {}) => buildCommandGroups(context(over), handlers());

const groupIds = (over: Partial<ContactsCommandContext> = {}) => build(over).map((g) => g.id);

const itemIds = (over: Partial<ContactsCommandContext>, groupId: string) =>
  build(over)
    .find((group) => group.id === groupId)
    ?.items.map((item) => item.id) ?? [];

describe('every group is conditional', () => {
  it('offers no owner group on a bot with no team and no owner filter set', () => {
    // Two presets are always offered — "Anyone" is the current one, so it is not.
    expect(itemIds({}, 'assignee')).toEqual(['assignee.Unassigned', 'assignee.FuelyAI']);
  });

  it('drops the preset that is already on', () => {
    expect(itemIds({ filter: { ...EMPTY_FILTER, assignee: 'Unassigned' } }, 'assignee')).toEqual([
      'assignee.Any',
      'assignee.FuelyAI',
    ]);
  });

  it('offers no saved-views group until there are saved views', () => {
    expect(groupIds()).not.toContain('saved');
    expect(groupIds({ savedViews: [{ id: 'v1', name: 'Mine', description: 'Unread' }] })).toContain('saved');
  });

  it('does not offer the view that is already applied', () => {
    const savedViews = [
      { id: 'v1', name: 'Mine', description: 'Unread' },
      { id: 'v2', name: 'Theirs', description: 'Unassigned' },
    ];
    expect(itemIds({ savedViews, appliedViewId: 'v1' }, 'saved')).toEqual(['saved.v2']);
    expect(groupIds({ savedViews: [savedViews[0]], appliedViewId: 'v1' })).not.toContain('saved');
  });

  it('offers density only where rows are rendered', () => {
    expect(groupIds({ view: 'list' })).toContain('density');
    expect(groupIds({ view: 'fields' })).not.toContain('density');
    expect(groupIds({ view: 'list', recordOpen: true })).not.toContain('density');
  });

  it('offers the two densities you are not in', () => {
    expect(itemIds({ density: 'cozy' }, 'density')).toEqual(['density.compact', 'density.comfortable']);
  });
});

describe('the surface you are on is not a destination', () => {
  it('offers the other two', () => {
    expect(itemIds({ view: 'list' }, 'go')).toEqual(['view.fields', 'view.audience']);
    expect(itemIds({ view: 'audience' }, 'go')).toEqual(['view.list', 'view.fields']);
  });

  it('offers all three while a record is open, because going there closes it', () => {
    expect(itemIds({ view: 'list', recordOpen: true }, 'go')).toEqual(['view.list', 'view.fields', 'view.audience']);
  });
});

describe('actions appear only when they do something', () => {
  it('offers undo only when there is one, and prints its own label', () => {
    expect(itemIds({}, 'actions')).not.toContain('undo');
    const items = build({ undoLabel: 'Undo — 12 contacts moved to Won' }).find(
      (group) => group.id === 'actions',
    )?.items;
    expect(items?.[0].id).toBe('undo');
    expect(items?.[0].label).toBe('Undo — 12 contacts moved to Won');
  });

  it('offers search only on the list, and never behind a record page', () => {
    expect(itemIds({ view: 'list' }, 'actions')).toContain('search');
    expect(itemIds({ view: 'fields' }, 'actions')).not.toContain('search');
    expect(itemIds({ view: 'list', recordOpen: true }, 'actions')).not.toContain('search');
  });

  it('offers "clear all filters" only when something is filtered', () => {
    expect(itemIds({}, 'actions')).not.toContain('filter.clear');
    expect(itemIds({ filter: { ...EMPTY_FILTER, q: 'anna' } }, 'actions')).toContain('filter.clear');
  });

  it('offers closing the record only when one is open', () => {
    expect(itemIds({}, 'actions')).not.toContain('closeRecord');
    expect(itemIds({ recordOpen: true }, 'actions')).toContain('closeRecord');
  });

  it('flips the unread label rather than offering a no-op', () => {
    const off = build()
      .find((group) => group.id === 'actions')
      ?.items.find((i) => i.id === 'filter.unread');
    const on = build({ filter: { ...EMPTY_FILTER, unreadOnly: true } })
      .find((group) => group.id === 'actions')
      ?.items.find((i) => i.id === 'filter.unread');
    expect(off?.label).toBe('Only unread conversations');
    expect(on?.label).toBe('Include contacts you have read');
  });
});

describe('stage and channel', () => {
  it('does not offer the stage that is already the only one', () => {
    const ids = itemIds({ filter: { ...EMPTY_FILTER, stages: [SalesStageV2.Won] } }, 'stage');
    expect(ids).not.toContain(`stage.${SalesStageV2.Won}`);
    expect(ids[0]).toBe('stage.all');
  });

  it('offers "all stages" only when a stage filter is on', () => {
    expect(itemIds({}, 'stage')).not.toContain('stage.all');
  });

  it('offers "all channels" only when a subset is on', () => {
    expect(itemIds({}, 'channel')).not.toContain('channel.all');
    const subset = { ...EMPTY_FILTER, platforms: [Platform.Whatsapp] };
    const ids = itemIds({ filter: subset }, 'channel');
    expect(ids[0]).toBe('channel.all');
    expect(ids).not.toContain(`channel.${Platform.Whatsapp}`);
  });

  it('treats every channel selected as no channel filter', () => {
    const all = { ...EMPTY_FILTER, platforms: [...ALL_PLATFORMS] };
    expect(itemIds({ filter: all }, 'channel')).not.toContain('channel.all');
  });
});

describe('the commands themselves', () => {
  it('gives every item a unique id across the whole palette', () => {
    const ids = build({
      undoLabel: 'Undo',
      recordOpen: false,
      teammates: [{ userAccountId: 'u1', name: 'Mira' }],
      savedViews: [{ id: 'v1', name: 'Mine', description: 'Unread' }],
      filter: { ...EMPTY_FILTER, q: 'a', stages: [SalesStageV2.Won], platforms: [Platform.Widget] },
    }).flatMap((group) => group.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never renders an empty group', () => {
    for (const group of build({ view: 'fields' })) expect(group.items.length).toBeGreaterThan(0);
  });

  it('calls the handler the command names', () => {
    const api = handlers();
    const groups = buildCommandGroups(context({ teammates: [{ userAccountId: 'u1', name: 'Mira' }] }), api);
    groups
      .find((group) => group.id === 'assignee')
      ?.items.find((item) => item.id === 'assignee.u:u1')
      ?.onSelect();
    expect(api.setAssignee).toHaveBeenCalledWith('u:u1');
  });
});

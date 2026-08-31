import { describe, expect, it, vi } from 'vitest';
import { buildCommandGroups, type DealsCommandContext, type DealsCommandHandlers } from './commands';
import { EMPTY_FILTER } from './dealsFilter';

const handlers = (): DealsCommandHandlers => ({
  setView: vi.fn(),
  setAssignee: vi.fn(),
  setDensity: vi.fn(),
  clearFilter: vi.fn(),
  focusSearch: vi.fn(),
  refresh: vi.fn(),
  undo: vi.fn(),
  openShortcuts: vi.fn(),
  applySavedView: vi.fn(),
});

const context = (over: Partial<DealsCommandContext> = {}): DealsCommandContext => ({
  view: 'board',
  filter: EMPTY_FILTER,
  density: 'comfortable',
  undoLabel: null,
  teammates: [],
  savedViews: [],
  ...over,
});

const build = (over: Partial<DealsCommandContext> = {}) => buildCommandGroups(context(over), handlers());

const ids = (groups: ReturnType<typeof build>) => groups.flatMap((group) => group.items.map((item) => item.id));

const group = (groups: ReturnType<typeof build>, id: string) => groups.find((entry) => entry.id === id);

describe('going somewhere', () => {
  it('never offers the view you are already in', () => {
    expect(group(build({ view: 'board' }), 'go')?.items.map((i) => i.id)).toEqual(['view.table', 'view.forecast']);
    expect(group(build({ view: 'forecast' }), 'go')?.items.map((i) => i.id)).toEqual(['view.board', 'view.table']);
  });
});

describe('actions', () => {
  it('offers undo only when there is something to undo, using its own label', () => {
    expect(ids(build())).not.toContain('undo');
    const withUndo = build({ undoLabel: 'Undo 3 moves' });
    const undo = group(withUndo, 'actions')?.items.find((item) => item.id === 'undo');
    expect(undo?.label).toBe('Undo 3 moves');
  });

  it('offers search on the table only — the board has no search box to focus', () => {
    expect(ids(build({ view: 'table' }))).toContain('search');
    expect(ids(build({ view: 'board' }))).not.toContain('search');
    expect(ids(build({ view: 'forecast' }))).not.toContain('search');
  });

  it('offers clearing filters only when a filter is set', () => {
    expect(ids(build())).not.toContain('filter.clear');
    expect(ids(build({ filter: { ...EMPTY_FILTER, unreadOnly: true } }))).toContain('filter.clear');
  });

  it('always offers refresh and the cheat sheet', () => {
    expect(ids(build())).toEqual(expect.arrayContaining(['refresh', 'shortcuts']));
  });
});

describe('owners', () => {
  it('lists presets and teammates, minus the one already selected', () => {
    const groups = build({
      teammates: [
        { userAccountId: 'u1', name: 'Lena' },
        { userAccountId: 'u2', name: 'Sam' },
      ],
      filter: { ...EMPTY_FILTER, assignee: 'u:u1' },
    });
    expect(group(groups, 'assignee')?.items.map((item) => item.label)).toEqual([
      'All deals',
      'Unassigned',
      'Assigned to AI',
      'Sam',
    ]);
  });

  it('drops a preset once it is the active filter', () => {
    const groups = build({ filter: { ...EMPTY_FILTER, assignee: 'Unassigned' } });
    expect(group(groups, 'assignee')?.items.map((item) => item.id)).not.toContain('assignee.Unassigned');
  });
});

describe('density', () => {
  it('offers the density you are not in', () => {
    expect(group(build({ density: 'comfortable' }), 'density')?.items.map((i) => i.id)).toEqual(['density.compact']);
  });

  it('is not offered on the forecast, which has no rows', () => {
    expect(group(build({ view: 'forecast' }), 'density')).toBeUndefined();
  });
});

describe('saved views', () => {
  it('omits the group entirely when there are none', () => {
    expect(group(build(), 'saved')).toBeUndefined();
  });

  it('says out loud that saved views are per-user', () => {
    const groups = build({ savedViews: [{ id: 'v1', name: 'My pipeline' }] });
    expect(group(groups, 'saved')?.items[0].description).toContain('you only');
  });
});

describe('wiring', () => {
  it('runs the handler the item stands for', () => {
    const spies = handlers();
    const groups = buildCommandGroups(context({ view: 'table' }), spies);
    const all = groups.flatMap((entry) => entry.items);
    all.find((item) => item.id === 'view.board')?.onSelect();
    all.find((item) => item.id === 'search')?.onSelect();
    expect(spies.setView).toHaveBeenCalledWith('board');
    expect(spies.focusSearch).toHaveBeenCalled();
  });

  it('gives every item a unique id, which the palette keys on', () => {
    const all = ids(
      build({
        view: 'table',
        undoLabel: 'Undo',
        filter: { ...EMPTY_FILTER, unreadOnly: true },
        teammates: [{ userAccountId: 'u1', name: 'Lena' }],
        savedViews: [{ id: 'v1', name: 'Mine' }],
      }),
    );
    expect(new Set(all).size).toBe(all.length);
  });
});

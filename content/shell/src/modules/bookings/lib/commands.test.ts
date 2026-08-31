import { describe, expect, it, vi } from 'vitest';
import { EMPTY_FILTER } from './bookingsFilter';
import { DENSITIES, MODES, VIEWS } from './bookingsParams';
import { buildCommandGroups, type BookingsCommandContext, type BookingsCommandHandlers } from './commands';

const handlers = (): BookingsCommandHandlers => ({
  setView: vi.fn(),
  setMode: vi.fn(),
  setBy: vi.fn(),
  setColor: vi.fn(),
  setSpecialistFilter: vi.fn(),
  setDensity: vi.fn(),
  clearFilter: vi.fn(),
  focusSearch: vi.fn(),
  refresh: vi.fn(),
  undo: vi.fn(),
  today: vi.fn(),
  newBooking: vi.fn(),
  toggleZone: vi.fn(),
  openShortcuts: vi.fn(),
});

const base: BookingsCommandContext = {
  view: 'calendar',
  mode: 'week',
  by: 'time',
  color: 'specialist',
  filter: EMPTY_FILTER,
  density: 'comfortable',
  undoLabel: null,
  canEdit: true,
  specialists: [
    { id: 'a', name: 'Alex' },
    { id: 'b', name: 'Maria' },
  ],
  otherZone: null,
};

const ids = (ctx: BookingsCommandContext) =>
  buildCommandGroups(ctx, handlers()).flatMap((g) => g.items.map((i) => `${g.id}/${i.id}`));

describe('buildCommandGroups', () => {
  it('leads with actions and never offers the current view as a destination', () => {
    const groups = buildCommandGroups(base, handlers());
    expect(groups[0]!.id).toBe('actions');
    const go = groups.find((g) => g.id === 'go')!;
    expect(go.items.map((i) => i.id)).not.toContain('view.calendar');
    expect(go.items).toHaveLength(5);
  });

  it('offers new only with edit rights, undo only when pending, search only on appointments', () => {
    expect(ids(base)).toContain('actions/new');
    expect(ids({ ...base, canEdit: false })).not.toContain('actions/new');
    expect(ids(base)).not.toContain('actions/undo');
    expect(ids({ ...base, undoLabel: 'Undo move' })).toContain('actions/undo');
    expect(ids(base)).not.toContain('actions/search');
    expect(ids({ ...base, view: 'appointments' })).toContain('actions/search');
  });

  it('calendar commands only on the calendar, and never the current mode', () => {
    const cal = ids(base);
    expect(cal).toContain('calendar/today');
    expect(cal).toContain('calendar/mode.day');
    expect(cal).not.toContain('calendar/mode.week');
    expect(cal).toContain('calendar/by.specialist');
    expect(cal).toContain('calendar/color.status');
    expect(cal).not.toContain('calendar/zone');
    expect(ids({ ...base, otherZone: { label: 'Europe/Berlin', source: 'bot' } })).toContain('calendar/zone');
    // Month has no by-specialist layout.
    expect(ids({ ...base, mode: 'month' })).not.toContain('calendar/by.specialist');
    expect(ids({ ...base, view: 'staff' }).some((id) => id.startsWith('calendar/'))).toBe(false);
  });

  it('filter and density groups follow the sections that use them', () => {
    expect(ids(base)).toContain('specialist/specialist.a');
    expect(ids(base)).not.toContain('specialist/specialist.all');
    expect(ids({ ...base, filter: { ...EMPTY_FILTER, specialists: ['a'] } })).toContain('specialist/specialist.all');
    expect(ids({ ...base, filter: { ...EMPTY_FILTER, specialists: ['a'] } })).not.toContain('specialist/specialist.a');
    expect(ids({ ...base, filter: { ...EMPTY_FILTER, specialists: ['a'] } })).toContain('actions/filter.clear');
    expect(ids({ ...base, view: 'settings', filter: { ...EMPTY_FILTER, specialists: ['a'] } })).not.toContain(
      'actions/filter.clear',
    );
    expect(ids(base)).toContain('density/density.compact');
    expect(ids(base)).not.toContain('density/density.comfortable');
    expect(ids({ ...base, view: 'insights' }).some((id) => id.startsWith('density/'))).toBe(false);
  });

  it('offers exactly what the URL schema knows, minus what is already on', () => {
    // The palette must not restate `VIEWS` / `MODES` / `DENSITIES`: a section
    // the parser accepts but the palette cannot reach (or the reverse) is what
    // a second copy of these lists eventually produces.
    const offered = (prefix: string) =>
      ids(base)
        .filter((id) => id.startsWith(prefix))
        .map((id) => id.slice(prefix.length))
        .sort();
    expect([...offered('go/view.'), base.view].sort()).toEqual([...VIEWS].sort());
    expect([...offered('calendar/mode.'), base.mode].sort()).toEqual([...MODES].sort());
    expect([...offered('density/density.'), base.density].sort()).toEqual([...DENSITIES].sort());
  });

  it('wires the handlers', () => {
    const h = handlers();
    const groups = buildCommandGroups({ ...base, undoLabel: 'Undo move' }, h);
    const find = (id: string) => groups.flatMap((g) => g.items).find((i) => i.id === id)!;
    find('view.staff').onSelect();
    expect(h.setView).toHaveBeenCalledWith('staff');
    find('mode.day').onSelect();
    expect(h.setMode).toHaveBeenCalledWith('day');
    find('specialist.b').onSelect();
    expect(h.setSpecialistFilter).toHaveBeenCalledWith(['b']);
    find('undo').onSelect();
    expect(h.undo).toHaveBeenCalled();
    find('color.status').onSelect();
    expect(h.setColor).toHaveBeenCalledWith('status');
  });

  it('every item id is unique', () => {
    const all = ids({ ...base, undoLabel: 'x', otherZone: { label: 'z', source: 'local' } });
    expect(new Set(all).size).toBe(all.length);
  });
});

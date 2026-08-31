import { describe, expect, it, vi } from 'vitest';
import { buildCommandGroups, type PublishingCommandContext, type PublishingCommandHandlers } from './commands';
import { shortcutChips } from './shortcuts';

const handlers = (): PublishingCommandHandlers => ({
  setView: vi.fn(),
  setMode: vi.fn(),
  setStatus: vi.fn(),
  setKind: vi.fn(),
  newPost: vi.fn(),
  today: vi.fn(),
  refresh: vi.fn(),
  pullLibrary: vi.fn(),
  openShortcuts: vi.fn(),
});

const base: PublishingCommandContext = {
  view: 'calendar',
  requestedMode: 'month',
  mode: 'month',
  status: null,
  kind: null,
  accountReady: true,
};

const groupsOf = (over: Partial<PublishingCommandContext> = {}) => buildCommandGroups({ ...base, ...over }, handlers());

const ids = (over: Partial<PublishingCommandContext> = {}) =>
  groupsOf(over).flatMap((group) => group.items.map((item) => `${group.id}/${item.id}`));

const labels = (over: Partial<PublishingCommandContext> = {}) =>
  groupsOf(over).flatMap((group) => group.items.map((item) => item.label));

describe('buildCommandGroups', () => {
  it('leads with actions, and never offers the view you are on as a destination', () => {
    for (const view of ['calendar', 'queue', 'library'] as const) {
      const groups = groupsOf({ view });
      expect(groups[0]!.id).toBe('actions');
      const go = groups.find((group) => group.id === 'go')!;
      expect(go.items).toHaveLength(2);
      expect(go.items.map((item) => item.id)).not.toContain(`view.${view}`);
    }
  });

  it('offers a composer only where there is an account to publish to', () => {
    expect(ids()).toContain('actions/new');
    expect(ids({ accountReady: false })).not.toContain('actions/new');
  });

  it('keeps the library pull on the library, and only with an account', () => {
    expect(ids({ view: 'library' })).toContain('actions/pull');
    expect(ids({ view: 'library', accountReady: false })).not.toContain('actions/pull');
    expect(ids({ view: 'calendar' })).not.toContain('actions/pull');
    expect(ids({ view: 'queue' })).not.toContain('actions/pull');
  });

  it('always offers refresh and the shortcuts sheet, on every view', () => {
    for (const view of ['calendar', 'queue', 'library'] as const) {
      expect(ids({ view })).toContain('actions/refresh');
      expect(ids({ view })).toContain('actions/shortcuts');
    }
    expect(ids({ accountReady: false })).toContain('actions/shortcuts');
  });

  it('never offers a bulk action: the queue acts on a visible selection, not on a query', () => {
    const every = ids({ view: 'queue', status: 'failed' });
    for (const id of ['duplicate', 'retry', 'reschedule', 'delete', 'remove']) {
      expect(every.some((one) => one.includes(id))).toBe(false);
    }
  });
});

describe('the calendar group', () => {
  it('appears only on the calendar', () => {
    expect(ids().some((id) => id.startsWith('calendar/'))).toBe(true);
    expect(ids({ view: 'queue' }).some((id) => id.startsWith('calendar/'))).toBe(false);
    expect(ids({ view: 'library' }).some((id) => id.startsWith('calendar/'))).toBe(false);
  });

  it('never offers the shape already chosen, and offers the other two', () => {
    expect(ids({ requestedMode: 'month', mode: 'month' })).not.toContain('calendar/mode.month');
    expect(ids({ requestedMode: 'month', mode: 'month' })).toContain('calendar/mode.week');
    expect(ids({ requestedMode: 'month', mode: 'month' })).toContain('calendar/mode.list');
    expect(ids({ requestedMode: 'list', mode: 'list' })).not.toContain('calendar/mode.list');
  });

  it('judges the chosen shape by the address, not by the one a narrow container drew', () => {
    /* A month that fell back to the list is still the choice the control shows,
       so offering "Month" would be offering what is already selected. */
    const narrow = ids({ requestedMode: 'month', mode: 'list' });
    expect(narrow).not.toContain('calendar/mode.month');
    expect(narrow).toContain('calendar/mode.list');
  });

  it('offers Today only where there is a period to come home to', () => {
    expect(ids({ requestedMode: 'month', mode: 'month' })).toContain('calendar/today');
    expect(ids({ requestedMode: 'week', mode: 'week' })).toContain('calendar/today');
    expect(ids({ requestedMode: 'list', mode: 'list' })).not.toContain('calendar/today');
    /* The month asked for, the list drawn: the Today button is not on screen
       either, so neither is the command. */
    expect(ids({ requestedMode: 'month', mode: 'list' })).not.toContain('calendar/today');
  });
});

describe('the filters', () => {
  it('follow the view that owns them', () => {
    expect(ids({ view: 'queue' }).some((id) => id.startsWith('status/'))).toBe(true);
    expect(ids({ view: 'queue' }).some((id) => id.startsWith('kind/'))).toBe(false);
    expect(ids({ view: 'library' }).some((id) => id.startsWith('kind/'))).toBe(true);
    expect(ids({ view: 'library' }).some((id) => id.startsWith('status/'))).toBe(false);
    expect(ids({ view: 'calendar' }).some((id) => id.startsWith('status/') || id.startsWith('kind/'))).toBe(false);
  });

  it('names every status the queue can be filtered to, and the way back', () => {
    const unfiltered = ids({ view: 'queue' });
    for (const status of ['draft', 'scheduled', 'publishing', 'published', 'failed']) {
      expect(unfiltered).toContain(`status/status.${status}`);
    }
    /* Nothing to clear when nothing is filtered. */
    expect(unfiltered).not.toContain('status/status.all');
    const filtered = ids({ view: 'queue', status: 'failed' });
    expect(filtered).toContain('status/status.all');
    expect(filtered).not.toContain('status/status.failed');
  });

  it('names every kind the library can be filtered to, ads included', () => {
    const unfiltered = ids({ view: 'library' });
    for (const kind of ['post', 'carousel', 'reel', 'story', 'ad']) {
      expect(unfiltered).toContain(`kind/kind.${kind}`);
    }
    expect(unfiltered).not.toContain('kind/kind.all');
    const filtered = ids({ view: 'library', kind: 'reel' });
    expect(filtered).toContain('kind/kind.all');
    expect(filtered).not.toContain('kind/kind.reel');
  });

  it('prints the same words the control on screen prints', () => {
    expect(labels({ view: 'queue' })).toEqual(
      expect.arrayContaining(['Draft', 'Scheduled', 'Publishing', 'Published', 'Failed']),
    );
    expect(labels({ view: 'library' })).toEqual(
      expect.arrayContaining(['Posts', 'Carousels', 'Reels', 'Stories', 'Ads']),
    );
  });
});

describe('the keys beside a command', () => {
  const find = (id: string, over: Partial<PublishingCommandContext> = {}) =>
    groupsOf(over)
      .flatMap((group) => group.items)
      .find((item) => item.id === id)!;

  it('are read from the bindings, never typed again', () => {
    expect(find('new').shortcut).toEqual(shortcutChips('newPost'));
    expect(find('refresh').shortcut).toEqual(shortcutChips('refresh'));
    expect(find('shortcuts').shortcut).toEqual(shortcutChips('help'));
    expect(find('today').shortcut).toEqual(shortcutChips('today'));
    expect(find('mode.week').shortcut).toEqual(shortcutChips('modeWeek'));
    expect(find('view.queue').shortcut).toEqual(shortcutChips('goQueue'));
    expect(find('view.library').shortcut).toEqual(shortcutChips('goLibrary'));
    expect(find('view.calendar', { view: 'queue' }).shortcut).toEqual(shortcutChips('goCalendar'));
  });

  it('are absent where no key does the same thing', () => {
    expect(find('pull', { view: 'library' }).shortcut).toBeUndefined();
    expect(find('status.failed', { view: 'queue' }).shortcut).toBeUndefined();
    expect(find('kind.reel', { view: 'library' }).shortcut).toBeUndefined();
  });
});

describe('the wiring', () => {
  const run = (id: string, over: Partial<PublishingCommandContext> = {}) => {
    const spies = handlers();
    buildCommandGroups({ ...base, ...over }, spies)
      .flatMap((group) => group.items)
      .find((item) => item.id === id)!
      .onSelect();
    return spies;
  };

  it('sends every command at the handler it names', () => {
    expect(run('view.queue').setView).toHaveBeenCalledWith('queue');
    expect(run('mode.week').setMode).toHaveBeenCalledWith('week');
    expect(run('today').today).toHaveBeenCalled();
    expect(run('new').newPost).toHaveBeenCalled();
    expect(run('refresh').refresh).toHaveBeenCalled();
    expect(run('shortcuts').openShortcuts).toHaveBeenCalled();
    expect(run('pull', { view: 'library' }).pullLibrary).toHaveBeenCalled();
    expect(run('status.failed', { view: 'queue' }).setStatus).toHaveBeenCalledWith('failed');
    expect(run('status.all', { view: 'queue', status: 'draft' }).setStatus).toHaveBeenCalledWith(null);
    expect(run('kind.reel', { view: 'library' }).setKind).toHaveBeenCalledWith('reel');
    expect(run('kind.all', { view: 'library', kind: 'ad' }).setKind).toHaveBeenCalledWith(null);
  });
});

describe('every state the address can hold', () => {
  const views = ['calendar', 'queue', 'library'] as const;
  const modes = ['month', 'week', 'list'] as const;
  const statuses = [null, 'draft', 'scheduled', 'publishing', 'published', 'failed'] as const;
  const kinds = [null, 'post', 'carousel', 'reel', 'story', 'ad'] as const;

  it('leaves no group empty and no id repeated', () => {
    for (const view of views) {
      for (const requestedMode of modes) {
        for (const mode of modes) {
          for (const status of statuses) {
            for (const kind of kinds) {
              for (const accountReady of [true, false]) {
                const groups = buildCommandGroups(
                  { view, requestedMode, mode, status, kind, accountReady },
                  handlers(),
                );
                for (const group of groups) expect(group.items.length).toBeGreaterThan(0);
                const all = groups.flatMap((group) => group.items.map((item) => item.id));
                expect(new Set(all).size).toBe(all.length);
              }
            }
          }
        }
      }
    }
  });

  it('writes names, not sentences: no command carries a caption', () => {
    for (const view of views) {
      for (const group of groupsOf({ view, status: 'failed', kind: 'ad' })) {
        for (const item of group.items) {
          expect(item.description).toBeUndefined();
          expect(item.label.length).toBeLessThanOrEqual(24);
        }
      }
    }
  });
});

import { describe, expect, it, vi } from 'vitest';
import { CAMPAIGN_STATUSES, STATUS_LABELS } from './campaign';
import {
  buildCommandGroups,
  commandDefs,
  COMMAND_SECTIONS,
  COMMANDS,
  shortcutChips,
  type BroadcastsCommandContext,
  type BroadcastsCommandHandlers,
} from './commands';
import { BINDINGS } from './shortcuts';

const handlers = (): BroadcastsCommandHandlers => ({
  newCampaign: vi.fn(),
  refresh: vi.fn(),
  openShortcuts: vi.fn(),
  setView: vi.fn(),
  setStatus: vi.fn(),
  openManager: vi.fn(),
  checkTemplates: vi.fn(),
  openCampaign: vi.fn(),
});

const base: BroadcastsCommandContext = {
  view: 'campaigns',
  status: null,
  canEdit: true,
  whatsappConnected: true,
  campaigns: [
    { flowId: 'flow-a', name: 'Welcome back', status: 'draft' },
    { flowId: 'flow-b', name: 'Tuesday deal', status: 'scheduled' },
    { flowId: 'flow-c', name: 'Old news', status: 'sent' },
  ],
};

const ctx = (over: Partial<BroadcastsCommandContext> = {}): BroadcastsCommandContext => ({ ...base, ...over });

const ids = (over: Partial<BroadcastsCommandContext> = {}) => commandDefs(ctx(over)).map((def) => def.id);

const groupIds = (over: Partial<BroadcastsCommandContext> = {}) =>
  buildCommandGroups(ctx(over), handlers()).flatMap((group) => group.items.map((item) => `${group.id}/${item.id}`));

describe('the command table', () => {
  it('gives every command a section the palette knows and a label to print', () => {
    for (const def of [...COMMANDS, ...commandDefs(ctx())]) {
      expect(COMMAND_SECTIONS).toContain(def.section);
      expect(def.label.trim().length).toBeGreaterThan(0);
      expect(def.keywords.length).toBeGreaterThan(0);
    }
  });

  it('writes names, not sentences: no fixed command carries a caption or a long label', () => {
    for (const def of COMMANDS) expect(def.label.length).toBeLessThanOrEqual(28);
    for (const group of buildCommandGroups(ctx(), handlers())) {
      for (const item of group.items) expect(item.description).toBeUndefined();
    }
  });

  it('repeats no id in any state', () => {
    for (const view of ['campaigns', 'templates', 'compose'] as const) {
      for (const status of [null, ...CAMPAIGN_STATUSES]) {
        for (const canEdit of [true, false]) {
          for (const whatsappConnected of [true, false]) {
            const all = ids({ view, status, canEdit, whatsappConnected });
            expect(new Set(all).size).toBe(all.length);
          }
        }
      }
    }
  });
});

describe('what the role may do', () => {
  it('offers a new campaign only to a role with Flows: Edit', () => {
    expect(ids()).toContain('new');
    expect(ids({ canEdit: false })).not.toContain('new');
  });

  it('offers no new campaign inside the composer — it is already a draft', () => {
    expect(ids({ view: 'compose' })).not.toContain('new');
  });

  it('keeps refresh, the shortcuts sheet and the Meta check for every role and every view', () => {
    for (const view of ['campaigns', 'templates', 'compose'] as const) {
      for (const canEdit of [true, false]) {
        const all = ids({ view, canEdit });
        expect(all).toContain('refresh');
        expect(all).toContain('shortcuts');
        expect(all).toContain('checkTemplates');
      }
    }
  });

  it('never offers send, schedule or delete: those stay where the campaign is on screen', () => {
    /* The status filter's "Scheduled" is a filter, not an action; everything
       else in the table is an action or a destination and must name none. */
    const actions = ids({ status: 'draft' }).filter((id) => !id.startsWith('status.') && !id.startsWith('open.'));
    for (const word of ['send', 'schedule', 'delete', 'remove', 'duplicate', 'unschedule']) {
      expect(actions.some((id) => id.toLowerCase().includes(word))).toBe(false);
    }
  });
});

describe('the WhatsApp Manager door', () => {
  it('exists only while a number is connected', () => {
    expect(ids()).toContain('manager');
    expect(ids({ whatsappConnected: false })).not.toContain('manager');
  });
});

describe('going somewhere', () => {
  it('never offers the view you are on as a destination', () => {
    expect(ids({ view: 'campaigns' })).not.toContain('go.campaigns');
    expect(ids({ view: 'campaigns' })).toContain('go.templates');
    expect(ids({ view: 'templates' })).not.toContain('go.templates');
    expect(ids({ view: 'templates' })).toContain('go.campaigns');
    expect(ids({ view: 'compose' })).toContain('go.campaigns');
    expect(ids({ view: 'compose' })).toContain('go.templates');
  });
});

describe('the status filter', () => {
  it('follows the list, and only the list', () => {
    expect(ids({ view: 'campaigns' }).some((id) => id.startsWith('status.'))).toBe(true);
    expect(ids({ view: 'templates' }).some((id) => id.startsWith('status.'))).toBe(false);
    expect(ids({ view: 'compose' }).some((id) => id.startsWith('status.'))).toBe(false);
  });

  it('names every status the list can be filtered to, and the way back only once filtered', () => {
    const unfiltered = ids();
    for (const status of CAMPAIGN_STATUSES) expect(unfiltered).toContain(`status.${status}`);
    expect(unfiltered).not.toContain('status.all');
    const filtered = ids({ status: 'sent' });
    expect(filtered).toContain('status.all');
    expect(filtered).not.toContain('status.sent');
    expect(filtered).toContain('status.draft');
  });

  it('prints the same words the control on screen prints', () => {
    const labels = commandDefs(ctx()).map((def) => def.label);
    for (const status of CAMPAIGN_STATUSES) expect(labels).toContain(STATUS_LABELS[status]);
  });
});

describe('one row per campaign', () => {
  it('offers to open every campaign the list holds, by name', () => {
    const defs = commandDefs(ctx());
    for (const campaign of base.campaigns) {
      const row = defs.find((def) => def.id === `open.${campaign.flowId}`);
      expect(row).toBeDefined();
      expect(row!.label).toBe(`Open ${campaign.name}`);
      expect(row!.section).toBe('Campaigns');
    }
  });

  it('offers no campaign group when the list is empty', () => {
    const groups = buildCommandGroups(ctx({ campaigns: [] }), handlers());
    expect(groups.some((group) => group.id === 'Campaigns')).toBe(false);
  });

  it('makes the status a search term rather than a word on screen', () => {
    const row = commandDefs(ctx()).find((def) => def.id === 'open.flow-c')!;
    expect(row.keywords).toContain('sent');
    expect(row.label).not.toContain('sent');
  });

  it('opens the one that was picked', () => {
    const spies = handlers();
    buildCommandGroups(ctx(), spies)
      .flatMap((group) => group.items)
      .find((item) => item.id === 'open.flow-b')!
      .onSelect();
    expect(spies.openCampaign).toHaveBeenCalledWith('flow-b');
  });
});

describe('the groups the palette draws', () => {
  it('lead with actions, follow the section order, and leave no group empty', () => {
    const groups = buildCommandGroups(ctx(), handlers());
    expect(groups[0]!.id).toBe('Actions');
    const order = groups.map((group) => group.id);
    expect(order).toEqual(COMMAND_SECTIONS.filter((section) => order.includes(section)));
    for (const group of groups) expect(group.items.length).toBeGreaterThan(0);
  });

  it('hold every command the table offers for the state, and nothing else', () => {
    const fromGroups = groupIds({ status: 'draft' }).map((id) => id.split('/')[1]);
    expect(fromGroups.sort()).toEqual(ids({ status: 'draft' }).sort());
  });
});

describe('the keys beside a command', () => {
  const find = (id: string, over: Partial<BroadcastsCommandContext> = {}) =>
    buildCommandGroups(ctx(over), handlers())
      .flatMap((group) => group.items)
      .find((item) => item.id === id)!;

  it('are read from the bindings, never typed again', () => {
    expect(find('new').shortcut).toEqual(shortcutChips('newCampaign'));
    expect(find('refresh').shortcut).toEqual(shortcutChips('refresh'));
    expect(find('shortcuts').shortcut).toEqual(shortcutChips('help'));
    expect(find('go.templates').shortcut).toEqual(shortcutChips('goTemplates'));
    expect(find('go.campaigns', { view: 'templates' }).shortcut).toEqual(shortcutChips('goCampaigns'));
  });

  it('are absent where no key does the same thing', () => {
    expect(find('manager').shortcut).toBeUndefined();
    expect(find('checkTemplates').shortcut).toBeUndefined();
    expect(find('status.sent').shortcut).toBeUndefined();
    expect(find('open.flow-a').shortcut).toBeUndefined();
  });

  it('print one chip per key, for every binding there is', () => {
    for (const binding of BINDINGS) {
      const chips = shortcutChips(binding.id);
      expect(chips.length).toBeGreaterThan(0);
      for (const chip of chips) expect(chip).not.toMatch(/[+\s]/);
    }
    expect(shortcutChips('palette')).toEqual(['mod', 'k']);
    expect(shortcutChips('goCampaigns')).toEqual(['g', 'c']);
  });
});

describe('the wiring', () => {
  const run = (id: string, over: Partial<BroadcastsCommandContext> = {}) => {
    const spies = handlers();
    buildCommandGroups(ctx(over), spies)
      .flatMap((group) => group.items)
      .find((item) => item.id === id)!
      .onSelect();
    return spies;
  };

  it('sends every command at the handler it names', () => {
    expect(run('new').newCampaign).toHaveBeenCalled();
    expect(run('refresh').refresh).toHaveBeenCalled();
    expect(run('shortcuts').openShortcuts).toHaveBeenCalled();
    expect(run('go.templates').setView).toHaveBeenCalledWith('templates');
    expect(run('go.campaigns', { view: 'templates' }).setView).toHaveBeenCalledWith('campaigns');
    expect(run('status.scheduled').setStatus).toHaveBeenCalledWith('scheduled');
    expect(run('status.all', { status: 'draft' }).setStatus).toHaveBeenCalledWith(null);
    expect(run('manager').openManager).toHaveBeenCalled();
    expect(run('checkTemplates').checkTemplates).toHaveBeenCalled();
    expect(run('open.flow-a').openCampaign).toHaveBeenCalledWith('flow-a');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { filterItems } from '~ui';
import {
  TOOLS,
  TOOL_SHORTCUT,
  buildBlockSearchGroups,
  buildFlowCommandGroups,
  type FlowCommandContext,
  type FlowCommandHandlers,
} from './flowCommands';
import { HOTKEYS } from './flowShortcuts';

const handlers = (): FlowCommandHandlers => ({
  setTool: vi.fn(),
  addBlock: vi.fn(),
  fit: vi.fn(),
  fitSelection: vi.fn(),
  align: vi.fn(),
  deleteSelection: vi.fn(),
  clearSelection: vi.fn(),
  selectAll: vi.fn(),
  autoLayout: vi.fn(),
  refresh: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  openShortcuts: vi.fn(),
  goToBlock: vi.fn(),
  toggleTest: vi.fn(),
  restartTest: vi.fn(),
});

const blocks = [
  { id: 'b1', name: 'Welcome', typeLabel: 'WhatsApp text', errors: 0 },
  { id: 'b2', name: 'Qualify', typeLabel: 'Condition', errors: 2 },
  { id: 'b3', name: 'Send to CRM', typeLabel: 'Send JSON', errors: 0 },
];

const context = (over: Partial<FlowCommandContext> = {}): FlowCommandContext => ({
  tool: 'select',
  selectedCount: 0,
  blockCount: blocks.length,
  blocks,
  testOpen: true,
  testRunning: false,
  ...over,
});

const build = (over: Partial<FlowCommandContext> = {}, h = handlers()) => buildFlowCommandGroups(context(over), h);

const ids = (groups: ReturnType<typeof build>) => groups.flatMap((group) => group.items.map((item) => item.id));

const group = (groups: ReturnType<typeof build>, id: string) => groups.find((entry) => entry.id === id);

describe('actions', () => {
  it('always offers adding, fitting, undo, redo, refresh and the sheet', () => {
    const all = ids(build());
    for (const id of ['add', 'fit', 'undo', 'redo', 'refresh', 'shortcuts']) expect(all).toContain(id);
  });

  it('offers zoom-to-selection instead of fit-all while something is selected', () => {
    expect(ids(build())).toContain('fit');
    expect(ids(build())).not.toContain('fitSelection');
    expect(ids(build({ selectedCount: 1 }))).toContain('fitSelection');
    expect(ids(build({ selectedCount: 1 }))).not.toContain('fit');
  });

  it('offers delete and clear only over a selection, and says how many', () => {
    expect(ids(build())).not.toContain('delete');
    expect(ids(build())).not.toContain('clear');
    const one = group(build({ selectedCount: 1 }), 'actions')?.items.find((i) => i.id === 'delete');
    expect(one?.label).toBe('Delete the selected block');
    const three = group(build({ selectedCount: 3 }), 'actions')?.items.find((i) => i.id === 'delete');
    expect(three?.label).toBe('Delete 3 selected blocks');
    expect(ids(build({ selectedCount: 3 }))).toContain('clear');
  });

  it('offers align only when two or more are selected — one block has nothing to line up with', () => {
    expect(ids(build({ selectedCount: 1 }))).not.toContain('alignLeft');
    expect(ids(build({ selectedCount: 2 }))).toContain('alignLeft');
    expect(ids(build({ selectedCount: 2 }))).toContain('alignTop');
  });

  it('offers select-all only when there is something not yet selected', () => {
    expect(ids(build())).toContain('selectAll');
    expect(ids(build({ selectedCount: 3 }))).not.toContain('selectAll');
    expect(ids(build({ blockCount: 0, blocks: [] }))).not.toContain('selectAll');
  });

  it('offers auto-layout only with two or more blocks', () => {
    expect(ids(build({ blockCount: 1 }))).not.toContain('autoLayout');
    expect(ids(build({ blockCount: 2 }))).toContain('autoLayout');
  });

  it('routes each action to its handler', () => {
    const h = handlers();
    const groups = buildFlowCommandGroups(context({ selectedCount: 2 }), h);
    const run = (id: string) =>
      groups
        .flatMap((g) => g.items)
        .find((i) => i.id === id)
        ?.onSelect();
    run('add');
    run('fitSelection');
    run('alignLeft');
    run('alignTop');
    run('delete');
    run('clear');
    run('autoLayout');
    run('undo');
    run('redo');
    run('refresh');
    run('shortcuts');
    expect(h.addBlock).toHaveBeenCalledTimes(1);
    expect(h.fitSelection).toHaveBeenCalledTimes(1);
    expect(h.align).toHaveBeenNthCalledWith(1, 'left');
    expect(h.align).toHaveBeenNthCalledWith(2, 'top');
    expect(h.deleteSelection).toHaveBeenCalledTimes(1);
    expect(h.clearSelection).toHaveBeenCalledTimes(1);
    expect(h.autoLayout).toHaveBeenCalledTimes(1);
    expect(h.undo).toHaveBeenCalledTimes(1);
    expect(h.redo).toHaveBeenCalledTimes(1);
    expect(h.refresh).toHaveBeenCalledTimes(1);
    expect(h.openShortcuts).toHaveBeenCalledTimes(1);
  });
});

describe('tools', () => {
  it('never offers the tool you are already holding', () => {
    for (const tool of TOOLS) {
      const offered = group(build({ tool }), 'tools')?.items.map((i) => i.id);
      expect(offered).not.toContain(`tool.${tool}`);
      expect(offered).toHaveLength(TOOLS.length - 1);
    }
  });

  it('prints the same digit the strip and the bindings use', () => {
    for (const tool of TOOLS) {
      const bound = HOTKEYS.filter((b) => b.id === `tool${tool[0]!.toUpperCase()}${tool.slice(1)}`).map((b) => b.keys);
      expect(bound).toContain(TOOL_SHORTCUT[tool]);
    }
  });

  it('routes to setTool', () => {
    const h = handlers();
    const groups = buildFlowCommandGroups(context({ tool: 'select' }), h);
    group(groups, 'tools')
      ?.items.find((i) => i.id === 'tool.pan')
      ?.onSelect();
    expect(h.setTool).toHaveBeenCalledWith('pan');
  });
});

describe('blocks', () => {
  it('lists every block by name, with its type and error count as the description', () => {
    const items = group(build(), 'blocks')?.items ?? [];
    expect(items.map((i) => i.label)).toEqual(['Welcome', 'Qualify', 'Send to CRM']);
    expect(items[1]?.description).toBe('Condition · 2 errors');
    expect(items[0]?.description).toBe('WhatsApp text');
  });

  it('is findable by type as well as by name, through the palette matcher', () => {
    const items = group(build(), 'blocks')?.items ?? [];
    const texts = (item: (typeof items)[number]) => [item.label, item.description ?? '', ...(item.keywords ?? [])];
    expect(filterItems(items, 'cond', texts)[0]?.item.id).toBe('block.b2');
    expect(filterItems(items, 'crm', texts)[0]?.item.id).toBe('block.b3');
    expect(filterItems(items, 'error', texts).map((r) => r.item.id)).toEqual(['block.b2']);
  });

  it('routes a hit to goToBlock with the block id', () => {
    const h = handlers();
    const groups = buildFlowCommandGroups(context(), h);
    group(groups, 'blocks')?.items[2]?.onSelect();
    expect(h.goToBlock).toHaveBeenCalledWith('b3');
  });

  it('is omitted from ⌘K when the flow has no blocks', () => {
    expect(group(build({ blocks: [], blockCount: 0 }), 'blocks')).toBeUndefined();
  });

  it('is the whole of the / list, which carries no commands at all', () => {
    const groups = buildBlockSearchGroups(context(), handlers());
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((i) => i.id)).toEqual(['block.b1', 'block.b2', 'block.b3']);
  });
});

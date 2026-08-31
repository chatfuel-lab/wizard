/**
 * What the ⌘K palette offers on the canvas, as data — after the shape of
 * `deals/lib/commands.ts`, and for the same reason: which commands appear in
 * which state is a test here rather than a component to click through, and
 * icons come in as a map because a `.ts` cannot render one.
 *
 * Two lists come out of the one builder. `commands` is ⌘K: everything the
 * canvas can do from the keyboard, plus every block by name at the bottom.
 * `blocks` is `/`: the block list alone, for the person who pressed slash to
 * find something and does not want "Auto-layout" scored against "Ask about
 * layout". Both go through `Command`, which is the module's one matcher —
 * `~ui/lib/data/filter` — and this file writes no second one.
 *
 * Nothing here acts on a selection it cannot see. Delete, zoom-to-selection
 * and align are offered only while something IS selected, because a command
 * that says "Delete selection" over an empty selection is a dead affordance
 * and §3.6 forbids those.
 */
import type { CommandGroup, CommandItem } from '~ui';
import type { ReactNode } from 'react';

export type FlowTool = 'select' | 'pan' | 'connect' | 'add';

export type FlowCommandId =
  | 'add'
  | 'fit'
  | 'fitSelection'
  | 'alignLeft'
  | 'alignTop'
  | 'delete'
  | 'clear'
  | 'selectAll'
  | 'autoLayout'
  | 'refresh'
  | 'undo'
  | 'redo'
  | 'shortcuts'
  | 'testToggle'
  | 'testRestart'
  | 'tool'
  | 'block';

/** One block as the palette sees it — enough to find it and to say what it is. */
export interface FlowCommandBlock {
  id: string;
  name: string;
  /** "WhatsApp text", "Condition" — the card's own type label. */
  typeLabel: string;
  errors: number;
}

export interface FlowCommandContext {
  tool: FlowTool;
  selectedCount: number;
  blockCount: number;
  blocks: readonly FlowCommandBlock[];
  /** The test dock is expanded. Collapsed or drawered, it is not. */
  testOpen: boolean;
  /** A test conversation is live, so restarting it means something. */
  testRunning: boolean;
}

export interface FlowCommandHandlers {
  setTool: (tool: FlowTool) => void;
  addBlock: () => void;
  fit: () => void;
  fitSelection: () => void;
  align: (edge: 'left' | 'top') => void;
  deleteSelection: () => void;
  clearSelection: () => void;
  selectAll: () => void;
  autoLayout: () => void;
  refresh: () => void;
  undo: () => void;
  redo: () => void;
  openShortcuts: () => void;
  goToBlock: (id: string) => void;
  toggleTest: () => void;
  restartTest: () => void;
}

export type FlowCommandIcons = Partial<Record<FlowCommandId, ReactNode>>;

export const TOOL_LABELS: Record<FlowTool, string> = {
  select: 'Select',
  pan: 'Pan',
  connect: 'Connect',
  add: 'Add block',
};

const TOOL_KEYWORDS: Record<FlowTool, string[]> = {
  select: ['pointer', 'arrow', 'marquee', 'move'],
  pan: ['hand', 'drag', 'scroll', 'move around'],
  connect: ['link', 'wire', 'edge', 'arrow'],
  add: ['new', 'create', 'insert', 'palette', 'block'],
};

/** What the strip prints on the button — the digit, never the letter. */
export const TOOL_SHORTCUT: Record<FlowTool, string> = {
  select: '1',
  pan: '2',
  connect: '3',
  add: '4',
};

export const TOOLS: readonly FlowTool[] = ['select', 'pan', 'connect', 'add'];

function blockItems(
  context: FlowCommandContext,
  handlers: FlowCommandHandlers,
  icons: FlowCommandIcons,
): CommandItem[] {
  return context.blocks.map((block) => ({
    id: `block.${block.id}`,
    label: block.name,
    description:
      block.errors > 0 ? `${block.typeLabel} · ${block.errors} error${block.errors === 1 ? '' : 's'}` : block.typeLabel,
    /* The type label is searchable so "condition" finds every condition block
       whatever it was named — but it is a keyword, not part of the label, so
       the highlight never underlines a description. */
    keywords: [block.typeLabel, ...(block.errors > 0 ? ['error', 'broken', 'invalid'] : [])],
    icon: icons.block,
    onSelect: () => handlers.goToBlock(block.id),
  }));
}

/** The `/` list: blocks and nothing else. */
export function buildBlockSearchGroups(
  context: FlowCommandContext,
  handlers: FlowCommandHandlers,
  icons: FlowCommandIcons = {},
): CommandGroup[] {
  return [{ id: 'blocks', items: blockItems(context, handlers, icons) }];
}

/** The ⌘K list. */
export function buildFlowCommandGroups(
  context: FlowCommandContext,
  handlers: FlowCommandHandlers,
  icons: FlowCommandIcons = {},
): CommandGroup[] {
  const groups: CommandGroup[] = [];
  const hasSelection = context.selectedCount > 0;

  /* Actions first: the palette is opened to DO something far more often than
     to navigate, and an empty query shows this group at the top. */
  const actions: CommandItem[] = [];

  actions.push({
    id: 'testToggle',
    label: context.testOpen ? 'Collapse the test chat' : 'Test this flow',
    keywords: ['preview', 'try', 'run', 'chat', 'simulate'],
    shortcut: ['t'],
    icon: icons.testToggle,
    onSelect: handlers.toggleTest,
  });

  if (context.testRunning) {
    actions.push({
      id: 'testRestart',
      label: 'Restart the test',
      description: 'A fresh conversation',
      keywords: ['preview', 'reset', 'again'],
      icon: icons.testRestart,
      onSelect: handlers.restartTest,
    });
  }

  actions.push({
    id: 'add',
    label: 'Add a block',
    description: 'Opens the block palette',
    keywords: ['new', 'create', 'insert', 'palette'],
    shortcut: ['4'],
    icon: icons.add,
    onSelect: handlers.addBlock,
  });

  if (hasSelection) {
    actions.push({
      id: 'fitSelection',
      label: 'Zoom to selection',
      keywords: ['frame', 'focus', 'centre', 'center'],
      shortcut: ['f'],
      icon: icons.fitSelection,
      onSelect: handlers.fitSelection,
    });
  } else {
    actions.push({
      id: 'fit',
      label: 'Fit the flow on screen',
      keywords: ['zoom', 'frame', 'whole', 'everything', 'reset view'],
      shortcut: ['f'],
      icon: icons.fit,
      onSelect: handlers.fit,
    });
  }

  if (context.selectedCount >= 2) {
    actions.push(
      {
        id: 'alignLeft',
        label: 'Align selection left',
        description: 'To the leftmost block',
        keywords: ['line up', 'tidy', 'column'],
        icon: icons.alignLeft,
        onSelect: () => handlers.align('left'),
      },
      {
        id: 'alignTop',
        label: 'Align selection top',
        description: 'To the topmost block',
        keywords: ['line up', 'tidy', 'row'],
        icon: icons.alignTop,
        onSelect: () => handlers.align('top'),
      },
    );
  }

  if (hasSelection) {
    actions.push(
      {
        id: 'delete',
        label:
          context.selectedCount === 1 ? 'Delete the selected block' : `Delete ${context.selectedCount} selected blocks`,
        description: 'Asks first. This cannot be undone.',
        keywords: ['remove', 'trash'],
        shortcut: ['delete'],
        icon: icons.delete,
        onSelect: handlers.deleteSelection,
      },
      {
        id: 'clear',
        label: 'Clear the selection',
        keywords: ['deselect', 'none'],
        shortcut: ['esc'],
        icon: icons.clear,
        onSelect: handlers.clearSelection,
      },
    );
  }

  if (context.blockCount > 0 && context.selectedCount < context.blockCount) {
    actions.push({
      id: 'selectAll',
      label: 'Select every block',
      keywords: ['all'],
      shortcut: ['mod', 'a'],
      icon: icons.selectAll,
      onSelect: handlers.selectAll,
    });
  }

  /* Two blocks are the least a layout can arrange; one has nowhere to go. */
  if (context.blockCount >= 2) {
    actions.push({
      id: 'autoLayout',
      label: 'Auto-layout',
      description: 'Arranges the blocks left to right and fits them on screen',
      keywords: ['arrange', 'tidy', 'organise', 'organize', 'layout'],
      icon: icons.autoLayout,
      onSelect: handlers.autoLayout,
    });
  }

  actions.push(
    {
      id: 'undo',
      label: 'Undo',
      keywords: ['revert', 'back', 'mistake'],
      shortcut: ['mod', 'z'],
      icon: icons.undo,
      onSelect: handlers.undo,
    },
    {
      id: 'redo',
      label: 'Redo',
      keywords: ['again', 'forward'],
      shortcut: ['shift', 'mod', 'z'],
      icon: icons.redo,
      onSelect: handlers.redo,
    },
    {
      id: 'refresh',
      label: 'Refresh from the server',
      keywords: ['reload', 'refetch', 'sync'],
      icon: icons.refresh,
      onSelect: handlers.refresh,
    },
    {
      id: 'shortcuts',
      label: 'Keyboard shortcuts',
      keywords: ['keys', 'help', 'cheat sheet'],
      shortcut: ['?'],
      icon: icons.shortcuts,
      onSelect: handlers.openShortcuts,
    },
  );

  groups.push({ id: 'actions', label: 'Actions', items: actions });

  /* The tool you are already holding is not a destination. */
  const elsewhere = TOOLS.filter((tool) => tool !== context.tool);
  groups.push({
    id: 'tools',
    label: 'Tools',
    items: elsewhere.map((tool) => ({
      id: `tool.${tool}`,
      label: `${TOOL_LABELS[tool]} tool`,
      keywords: TOOL_KEYWORDS[tool],
      shortcut: [TOOL_SHORTCUT[tool]],
      icon: icons.tool,
      onSelect: () => handlers.setTool(tool),
    })),
  });

  if (context.blocks.length > 0) {
    groups.push({ id: 'blocks', label: 'Go to block', items: blockItems(context, handlers, icons) });
  }

  return groups;
}

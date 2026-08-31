import { useMemo } from 'react';
import type { CanvasSelection } from '~ui';
import type { AlignEdge } from '../lib/alignBlocks';
import { blockErrorCount, blockTypeLabel } from '../lib/elementSummary';
import type { FlowCommandContext, FlowCommandHandlers, FlowTool } from '../lib/flowCommands';
import type { GraphNode } from '../lib/graph';
import type { FlowT } from '../types';

/** The slice of the Test dock the ⌘K commands read and drive. */
interface CommandTestDock {
  state: 'none' | 'pill' | 'open';
  running: boolean;
  toggle: () => void;
  restart: () => void;
}

export interface UseCanvasCommandsOptions {
  tool: FlowTool;
  flow: FlowT;
  nodes: readonly GraphNode[];
  selection: CanvasSelection;
  testDock: CommandTestDock | undefined;
  chooseTool: (tool: FlowTool) => void;
  fit: () => void;
  align: (edge: AlignEdge) => void;
  deleteSelected: () => void;
  clearAll: () => void;
  autoLayout: () => void;
  refetch: () => Promise<void>;
  onUndo: () => void;
  onRedo: () => void;
  setShortcutsOpen: (open: boolean) => void;
  goToBlock: (blockId: string) => void;
}

/**
 * ⌘K's two halves: what the palette can see (`FlowCommandContext`) and what it
 * can do (`FlowCommandHandlers`). Pure fan-out over the callbacks passed in —
 * the command definitions themselves live in `lib/flowCommands`, where a test
 * can reach them.
 */
export function useCanvasCommands({
  tool,
  flow,
  nodes,
  selection,
  testDock,
  chooseTool,
  fit,
  align,
  deleteSelected,
  clearAll,
  autoLayout,
  refetch,
  onUndo,
  onRedo,
  setShortcutsOpen,
  goToBlock,
}: UseCanvasCommandsOptions): { commandContext: FlowCommandContext; commandHandlers: FlowCommandHandlers } {
  const commandContext = useMemo<FlowCommandContext>(
    () => ({
      tool,
      selectedCount: selection.selected.size,
      blockCount: flow.blocks.length,
      blocks: flow.blocks.map((block) => ({
        id: block.id,
        name: block.name,
        typeLabel: blockTypeLabel(block.__typename),
        errors: blockErrorCount(block),
      })),
      testOpen: testDock?.state === 'open',
      testRunning: testDock?.running ?? false,
    }),
    [flow.blocks, selection.selected.size, testDock?.running, testDock?.state, tool],
  );

  const commandHandlers = useMemo<FlowCommandHandlers>(
    () => ({
      setTool: chooseTool,
      addBlock: () => chooseTool('add'),
      fit,
      fitSelection: fit,
      align,
      deleteSelection: deleteSelected,
      clearSelection: clearAll,
      selectAll: () => selection.replace(nodes.map((node) => node.id)),
      autoLayout,
      refresh: () => void refetch(),
      undo: onUndo,
      redo: onRedo,
      openShortcuts: () => setShortcutsOpen(true),
      goToBlock,
      toggleTest: () => testDock?.toggle(),
      restartTest: () => testDock?.restart(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setShortcutsOpen is a useState setter handed down; stable by construction
    [
      align,
      autoLayout,
      chooseTool,
      clearAll,
      deleteSelected,
      fit,
      goToBlock,
      nodes,
      onRedo,
      onUndo,
      refetch,
      selection,
      testDock,
    ],
  );

  return { commandContext, commandHandlers };
}

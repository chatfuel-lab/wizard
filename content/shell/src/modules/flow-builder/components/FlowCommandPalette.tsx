import { useMemo } from 'react';
import {
  Command,
  IconChecks,
  IconClose,
  IconFlow,
  IconHand,
  IconKanban,
  IconLayoutList,
  IconMaximize,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconUndo,
  Kbd,
} from '~ui';
import {
  buildBlockSearchGroups,
  buildFlowCommandGroups,
  type FlowCommandContext,
  type FlowCommandHandlers,
  type FlowCommandIcons,
} from '../lib/flowCommands';

export interface FlowCommandPaletteProps {
  /** `commands` is ⌘K; `blocks` is `/` — the block list alone. Null is closed. */
  mode: 'commands' | 'blocks' | null;
  onClose: () => void;
  context: FlowCommandContext;
  handlers: FlowCommandHandlers;
}

/**
 * ⌘K and `/` over the `Command` primitive.
 *
 * All the judgement — which commands exist in which state, what a block row
 * says — is in `lib/flowCommands.ts` and has tests. This file is the JSX the
 * pure module cannot hold: a `.ts` cannot render an icon, and turning the rules
 * into a `.tsx` to carry a dozen of them would take them out of the test suite.
 */
const ICONS: FlowCommandIcons = {
  add: <IconPlus size={14} />,
  fit: <IconMaximize size={14} />,
  fitSelection: <IconMaximize size={14} />,
  alignLeft: <IconLayoutList size={14} />,
  alignTop: <IconKanban size={14} />,
  delete: <IconTrash size={14} />,
  clear: <IconClose size={14} />,
  selectAll: <IconChecks size={14} />,
  autoLayout: <IconKanban size={14} />,
  refresh: <IconRefresh size={14} />,
  undo: <IconUndo size={14} />,
  redo: <IconUndo size={14} className="-scale-x-100" />,
  tool: <IconHand size={14} />,
  block: <IconFlow size={14} />,
};

export function FlowCommandPalette({ mode, onClose, context, handlers }: FlowCommandPaletteProps) {
  const groups = useMemo(
    () =>
      mode === 'blocks'
        ? buildBlockSearchGroups(context, handlers, ICONS)
        : buildFlowCommandGroups(context, handlers, ICONS),
    [mode, context, handlers],
  );

  return (
    <Command
      open={mode !== null}
      onClose={onClose}
      groups={groups}
      placeholder={mode === 'blocks' ? 'Find a block by name…' : 'Search commands and blocks…'}
      empty={mode === 'blocks' ? 'No block by that name' : 'No matching command'}
      /* The command footer is the primitive's default; only the block list
         reads differently — Enter goes to the block, it does not run it. */
      footer={
        mode === 'blocks' ? (
          <>
            <span className="flex items-center gap-1">
              <Kbd keys={['up']} />
              <Kbd keys={['down']} /> navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd keys={['enter']} /> go
            </span>
            <span className="flex items-center gap-1">
              <Kbd keys={['esc']} /> close
            </span>
          </>
        ) : undefined
      }
    />
  );
}

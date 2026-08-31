import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  IconLink,
  IconPlay,
  IconPointer,
  IconTrash,
  type CanvasSelection,
  type ContextMenuPoint,
  type MenuItem,
} from '~ui';
import type { FlowTool } from '../lib/flowCommands';
import type { BlockT } from '../types';

export interface CanvasMenuState {
  menu: { point: ContextMenuPoint; blockId: string } | null;
  setMenu: Dispatch<SetStateAction<{ point: ContextMenuPoint; blockId: string } | null>>;
  menuBlock: BlockT | undefined;
  menuItems: MenuItem[];
}

/**
 * The block context menu's state and items.
 *
 * Two roads to one menu: the mouse's right button through `onContextMenu`,
 * a held finger through `onLongPress`. The hold is the primitive's now —
 * `CanvasNode` times it, drops it if the finger moves, and swallows the click
 * that follows a hold that fired — so all the canvas does is say where, through
 * `setMenu`; the `<ContextMenu>` element itself stays in the canvas JSX.
 */
export function useCanvasMenu(
  blocks: readonly BlockT[],
  goToBlock: (blockId: string) => void,
  onSetStartingPoint: (blockId: string) => void,
  onRequestDeleteBlocks: (blockIds: string[]) => void,
  selection: CanvasSelection,
  setTool: Dispatch<SetStateAction<FlowTool>>,
  setConnectFrom: Dispatch<SetStateAction<string | null>>,
): CanvasMenuState {
  const [menu, setMenu] = useState<{ point: ContextMenuPoint; blockId: string } | null>(null);

  const menuBlock = menu ? blocks.find((block) => block.id === menu.blockId) : undefined;
  const menuItems = useMemo<MenuItem[]>(() => {
    if (!menu || !menuBlock) return [];
    const id = menu.blockId;
    const isStart = 'isStartingPoint' in menuBlock && menuBlock.isStartingPoint;
    return [
      {
        id: 'edit',
        label: 'Edit',
        icon: <IconPointer size={14} />,
        onSelect: () => goToBlock(id),
      },
      {
        id: 'connect',
        label: 'Connect from here',
        icon: <IconLink size={14} />,
        onSelect: () => {
          setTool('connect');
          setConnectFrom(id);
          selection.replace([id]);
        },
      },
      {
        id: 'start',
        label: isStart ? 'Starting point' : 'Make this the starting point',
        icon: <IconPlay size={14} />,
        checked: Boolean(isStart),
        disabled: Boolean(isStart),
        onSelect: () => onSetStartingPoint(id),
      },
      { kind: 'separator', id: 'sep' },
      {
        id: 'delete',
        label: 'Delete',
        icon: <IconTrash size={14} />,
        tone: 'danger',
        shortcut: ['delete'],
        onSelect: () => onRequestDeleteBlocks([id]),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setTool and setConnectFrom are useState setters handed down; stable by construction
  }, [goToBlock, menu, menuBlock, onRequestDeleteBlocks, onSetStartingPoint, selection]);

  return { menu, setMenu, menuBlock, menuItems };
}

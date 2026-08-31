import { useCallback, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { FlowTool } from '../lib/flowCommands';
import type { PlaceBlockApi } from './usePlaceBlock';

export interface PalettePlacement {
  /** The palette family the next canvas click puts down. */
  armed: string | null;
  setArmed: Dispatch<SetStateAction<string | null>>;
  /** The compact band's bottom-sheet palette, when it is up. */
  sheetOpen: boolean;
  setSheetOpen: Dispatch<SetStateAction<boolean>>;
  paletteRef: RefObject<HTMLDivElement | null>;
  focusPaletteSearch: () => void;
  /** One place a block lands, whichever gesture brought it. */
  placeAt: (world: { x: number; y: number }, pluginKey?: string | null) => void;
}

/**
 * The palette's arming state and the one landing spot every gesture ends in:
 * a drop, an armed click on the background, and Enter at the viewport centre
 * all come through `placeAt`, which forgets the armed family and hands the Add
 * tool back to Select once the block is down.
 */
export function usePalettePlacement(
  placement: PlaceBlockApi,
  setTool: Dispatch<SetStateAction<FlowTool>>,
): PalettePlacement {
  const [armed, setArmed] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement | null>(null);

  const focusPaletteSearch = useCallback(() => {
    paletteRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, []);

  const placeAt = useCallback(
    (world: { x: number; y: number }, pluginKey = armed) => {
      if (!pluginKey) return;
      void placement.place(pluginKey, world);
      setArmed(null);
      /* Placing was what the Add tool was for; the next click should select. */
      setTool((current) => (current === 'add' ? 'select' : current));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setTool is a useState setter handed down; stable by construction
    [armed, placement],
  );

  return { armed, setArmed, sheetOpen, setSheetOpen, paletteRef, focusPaletteSearch, placeAt };
}

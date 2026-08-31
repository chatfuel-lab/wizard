import { useCallback, useMemo, useState, type RefObject } from 'react';
import { useHotkeys } from '~ui';
import { useAdsUndo } from '../AdsUndoContext';
import { useEventSets } from '../AdsStoreContext';
import type { CommandHandlers, CommandInput } from '../lib/commands';
import type { TriggerId } from '../lib/eventKinds';
import { MAX_EVENTS } from '../lib/eventRules';
import { BINDINGS, type WorkspaceShortcutId } from '../lib/shortcuts';
import type { ConversionEvent, EventSetView } from '../types';

export interface AdsCommandsArgs {
  rootRef: RefObject<HTMLElement | null>;
  sets: readonly EventSetView[];
  active: EventSetView | null;
  events: readonly ConversionEvent[];
  canCreateSet: boolean;
  selectSet: (setId: string) => void;
  addEvent: (trigger?: TriggerId) => void;
  step: (delta: number) => void;
  /** Opens the new-set dialog. */
  newSet: () => void;
}

export interface AdsCommandsApi {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  commandContext: CommandInput;
  commandHandlers: CommandHandlers;
}

/**
 * The keyboard and the palette: what the commands can see, what they can do,
 * and the workspace shortcuts that reach the same handlers. Binds `useHotkeys`
 * itself, so mounting this hook IS enabling the module's keyboard.
 */
export function useAdsCommands({
  rootRef,
  sets,
  active,
  events,
  canCreateSet,
  selectSet,
  addEvent,
  step,
  newSet,
}: AdsCommandsArgs): AdsCommandsApi {
  const store = useEventSets();
  const undo = useAdsUndo();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const onShortcut = useCallback(
    (id: WorkspaceShortcutId) => {
      switch (id) {
        case 'palette':
          return setPaletteOpen(true);
        case 'help':
          return setHelpOpen(true);
        case 'undo':
          return undo.run();
        case 'refresh':
          return store.reload();
        case 'newSet':
          if (canCreateSet) newSet();
          return;
        case 'newEvent':
          return addEvent();
        case 'prevSet':
          return step(-1);
        case 'nextSet':
          return step(1);
      }
    },
    [undo, store, canCreateSet, newSet, addEvent, step],
  );

  useHotkeys<WorkspaceShortcutId>(BINDINGS, onShortcut, { rootRef });

  const commandContext = useMemo<CommandInput>(
    () => ({
      sets,
      activeSetId: active?.id ?? null,
      canAddEvent: Boolean(active) && events.length < MAX_EVENTS,
      canCreateSet,
    }),
    [sets, active, events.length, canCreateSet],
  );

  const commandHandlers = useMemo<CommandHandlers>(
    () => ({
      openSet: selectSet,
      newSet,
      newEvent: (trigger) => addEvent(trigger as TriggerId | undefined),
      reload: store.reload,
      help: () => setHelpOpen(true),
    }),
    [selectSet, newSet, addEvent, store.reload],
  );

  return { paletteOpen, setPaletteOpen, helpOpen, setHelpOpen, commandContext, commandHandlers };
}

import { useMemo } from 'react';
import { Command, IconGlobe, IconPlus, IconRefresh, IconTarget, Kbd } from '~ui';
import { TRIGGERS } from '../lib/eventKinds';
import { buildCommands, type CommandHandlers, type CommandIcons, type CommandInput } from '../lib/commands';
import { TriggerIcon } from './TriggerIcon';

export interface AdsCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  context: CommandInput;
  handlers: CommandHandlers;
}

const ICONS: CommandIcons = {
  baseSet: <IconGlobe size={14} />,
  customSet: <IconTarget size={14} />,
  trigger: Object.fromEntries(
    TRIGGERS.map((trigger) => [trigger.id, <TriggerIcon key={trigger.id} trigger={trigger.id} size={14} />]),
  ),
  newSet: <IconPlus size={14} />,
  reload: <IconRefresh size={14} />,
  help: <Kbd keys={['?']} />,
};

/** The ⌘K palette. Everything it offers is decided in `lib/commands.ts`. */
export function AdsCommandPalette({ open, onClose, context, handlers }: AdsCommandPaletteProps) {
  const groups = useMemo(() => buildCommands(context, handlers, ICONS), [context, handlers]);

  return (
    <Command
      open={open}
      onClose={onClose}
      groups={groups}
      placeholder="Go to a set, or add an event"
      empty="No matching command"
    />
  );
}

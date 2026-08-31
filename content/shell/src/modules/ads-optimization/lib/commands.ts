import type { ReactNode } from 'react';
import type { CommandGroup } from '~ui';
import { TRIGGERS, type TriggerId } from './eventKinds';
import { setName } from './summary';
import type { EventSetView } from '../types';

export interface CommandHandlers {
  openSet: (setId: string) => void;
  newSet: () => void;
  newEvent: (trigger?: string) => void;
  reload: () => void;
  help: () => void;
}

/**
 * The glyphs, handed in from the component.
 *
 * A `.ts` file cannot render JSX, and turning this one into `.tsx` to hold nine
 * icons would take the rules below out of the test suite. Every field is
 * optional, so a row without a glyph is a row, not a crash.
 */
export interface CommandIcons {
  baseSet?: ReactNode;
  customSet?: ReactNode;
  trigger?: Partial<Record<TriggerId, ReactNode>>;
  newSet?: ReactNode;
  reload?: ReactNode;
  help?: ReactNode;
}

export interface CommandInput {
  sets: readonly EventSetView[];
  activeSetId: string | null;
  /** False when the active set is at the event ceiling, or there is no set. */
  canAddEvent: boolean;
  canCreateSet: boolean;
}

/**
 * What the palette offers, as data.
 *
 * The trigger rows are the reason the palette exists here: "add a keywords
 * event" is two clicks and a dialog otherwise, and somebody adding the seventh
 * event of a set knows exactly which one they want before they open anything.
 */
export function buildCommands(
  input: CommandInput,
  handlers: CommandHandlers,
  icons: CommandIcons = {},
): CommandGroup[] {
  const groups: CommandGroup[] = [];

  if (input.sets.length > 0) {
    groups.push({
      id: 'sets',
      label: 'Event sets',
      items: input.sets.map((set) => ({
        id: `set:${set.id}`,
        label: setName(set),
        keywords: set.isBase ? ['default', 'base'] : [],
        icon: set.isBase ? icons.baseSet : icons.customSet,
        disabled: set.id === input.activeSetId,
        onSelect: () => handlers.openSet(set.id),
      })),
    });
  }

  groups.push({
    id: 'add',
    label: 'Add an event',
    items: TRIGGERS.map((trigger) => ({
      id: `trigger:${trigger.id}`,
      label: trigger.label,
      description: trigger.fires,
      icon: icons.trigger?.[trigger.id],
      disabled: !input.canAddEvent,
      onSelect: () => handlers.newEvent(trigger.id),
    })),
  });

  groups.push({
    id: 'actions',
    label: 'Actions',
    items: [
      {
        id: 'new-set',
        label: 'New event set',
        shortcut: ['n'],
        icon: icons.newSet,
        disabled: !input.canCreateSet,
        onSelect: handlers.newSet,
      },
      { id: 'reload', label: 'Reload the sets', shortcut: ['r'], icon: icons.reload, onSelect: handlers.reload },
      {
        id: 'help',
        label: 'Keyboard shortcuts',
        keywords: ['keys', 'help', 'cheat sheet'],
        shortcut: ['?'],
        icon: icons.help,
        onSelect: handlers.help,
      },
    ],
  });

  return groups;
}
